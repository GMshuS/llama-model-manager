import { Router } from 'express'
import { readdirSync, statSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import { getModelConfig, saveModelConfig, getConfig, saveConfig } from '../store/store.js'
import { processManager } from '../services/process-manager.js'

const router = Router()
let modelsDir = resolve(getConfig().modelsDir || 'models')

export function setModelsDir(dir) {
  modelsDir = resolve(dir)
  saveConfig({ modelsDir: dir })
}

export function getModelsDir() {
  return modelsDir
}

function parseQuantization(filename) {
  const match = filename.match(/Q\d_[KMLS]|IQ\d_\w+|FP\d+|Q\d+/)
  return match ? match[0] : 'unknown'
}

function formatSize(bytes) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`
  return `${(bytes / 1024).toFixed(2)} KB`
}

router.get('/', (req, res) => {
  try {
    const files = readdirSync(modelsDir)
      .filter(f => f.endsWith('.gguf'))
      .map(filename => {
        const filePath = join(modelsDir, filename)
        const stats = statSync(filePath)
        const config = getModelConfig(filename)
        return {
          name: filename,
          path: filePath,
          size: stats.size,
          sizeFormatted: formatSize(stats.size),
          quantization: parseQuantization(filename),
          running: processManager.currentModel === filename,
          presetId: config?.presetId || null,
          overrides: config?.overrides || {},
        }
      })
    res.json(files)
  } catch (err) {
    if (err.code === 'ENOENT') return res.json([])
    res.status(500).json({ error: err.message })
  }
})

router.get('/config/:name', (req, res) => {
  const config = getModelConfig(req.params.name)
  res.json(config || { presetId: null, overrides: {} })
})

router.put('/config/:name', (req, res) => {
  saveModelConfig(req.params.name, req.body)
  res.json({ ok: true })
})

router.put('/dir', (req, res) => {
  const { dir } = req.body
  if (dir) setModelsDir(dir)
  res.json({ dir: getModelsDir() })
})

router.get('/dir', (req, res) => {
  res.json({ dir: getModelsDir() })
})

router.get('/detail/:name', (req, res) => {
  try {
    const filename = req.params.name
    const filePath = join(modelsDir, filename)
    
    // 检查文件是否存在
    if (!statSync(filePath)) {
      return res.status(404).json({ error: '模型文件不存在' })
    }
    
    // 调用gguf-dump获取模型信息，使用JSON格式输出
    const dumpOutput = execSync(`gguf-dump "${filePath}" --json`, { 
      encoding: 'utf-8', 
      timeout: 30000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    
    // 调试：输出原始dump内容到控制台
    console.log('=== GGUF-DUMP OUTPUT ===')
    console.log(dumpOutput)
    console.log('=== END OUTPUT ===')
    
    // 解析JSON输出
    const dumpData = JSON.parse(dumpOutput)
    
    // 解析dump输出
    const details = parseGgufDump(dumpData)
    
    // 调试：输出解析结果
    console.log('=== PARSED DETAILS ===')
    console.log(details)
    console.log('=== END DETAILS ===')
    
    res.json(details)
  } catch (err) {
    console.error('获取模型详情失败:', err)
    res.status(500).json({ error: `获取模型详情失败: ${err.message}` })
  }
})

function parseGgufDump(dumpData) {
  const details = {
    // 文件基础信息
    version: 'unknown',
    architecture: 'unknown',
    size_label: 'unknown',
    file_type: 'unknown',
    quantized_by: 'unknown',
    
    // 模型网络超参
    context_length: 'unknown',
    block_count: 'unknown',
    embedding_length: 'unknown',
    feed_forward_length: 'unknown',
    expert_count: null,
    expert_used_count: null,
    
    // 内置推测加速头
    num_pred_heads: null,
    num_draft_layers: null,
    
    // 分词器元数据
    tokenizer_model: 'unknown',
    chat_template: null
  }
  
  let currentArchPrefix = ''
  
  // JSON格式的输出包含metadata字段
  if (dumpData && dumpData.metadata && typeof dumpData.metadata === 'object') {
    for (const [key, item] of Object.entries(dumpData.metadata)) {
      // 提取实际值，item是一个对象，包含value字段
      const value = item && item.value !== undefined ? item.value : item
      
      // 文件基础信息
      if (key === 'GGUF.version') {
        details.version = String(value)
      } else if (key === 'general.architecture') {
        details.architecture = String(value)
        currentArchPrefix = String(value)
      } else if (key === 'general.size_label') {
        details.size_label = String(value)
      } else if (key === 'general.file_type') {
        details.file_type = String(value)
      } else if (key === 'general.quantized_by') {
        details.quantized_by = String(value)
      }
      
      // 模型网络超参（前缀随架构变化）
      else if (key === `${currentArchPrefix}.context_length`) {
        details.context_length = String(value)
      } else if (key === `${currentArchPrefix}.block_count`) {
        details.block_count = String(value)
      } else if (key === `${currentArchPrefix}.embedding_length`) {
        details.embedding_length = String(value)
      } else if (key === `${currentArchPrefix}.feed_forward_length`) {
        details.feed_forward_length = String(value)
      } else if (key === 'llama.expert_count') {
        details.expert_count = String(value)
      } else if (key === 'llama.expert_used_count') {
        details.expert_used_count = String(value)
      }
      
      // 内置推测加速头
      else if (key === 'qwen.mtp.num_pred_heads') {
        details.num_pred_heads = String(value)
      } else if (key === 'deepseek.spec.num_draft_layers') {
        details.num_draft_layers = String(value)
      }
      
      // 分词器元数据
      else if (key === 'tokenizer.ggml.model') {
        details.tokenizer_model = String(value)
      } else if (key === 'tokenizer.chat_template') {
        // chat_template可能包含多行，需要特殊处理
        if (value && value !== 'unknown') {
          details.chat_template = String(value)
        }
      }
    }
  }
  
  return details
}

export default router
