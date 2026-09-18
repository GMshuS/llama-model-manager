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

// GGUF 量化类型（general.file_type）数字到名称的映射
// 对应 GGUF 官方 LlamaFileType 枚举，展示名省略冗余的 MOSTLY_ 前缀
const GGUF_FILE_TYPE_MAP = {
  0: 'F32',
  1: 'F16',
  2: 'Q4_0',
  3: 'Q4_1',
  7: 'Q8_0',
  8: 'Q5_0',
  9: 'Q5_1',
  10: 'Q2_K',
  11: 'Q3_K_S',
  12: 'Q3_K_M',
  13: 'Q3_K_L',
  14: 'Q4_K_S',
  15: 'Q4_K_M',
  16: 'Q5_K_S',
  17: 'Q5_K_M',
  18: 'Q6_K',
  19: 'IQ2_XXS',
  20: 'IQ2_XS',
  21: 'Q2_K_S',
  22: 'IQ3_XS',
  23: 'IQ3_XXS',
  24: 'IQ1_S',
  25: 'IQ4_NL',
  26: 'IQ3_S',
  27: 'IQ3_M',
  28: 'IQ2_S',
  29: 'IQ2_M',
  30: 'IQ4_XS',
  31: 'IQ1_M',
  32: 'BF16',
  33: 'Q4_0_4_4',
  34: 'Q4_0_4_8',
  35: 'Q4_0_8_8',
  36: 'TQ1_0',
  37: 'TQ2_0',
  38: 'MXFP4_MOE'
}

// 将 general.file_type 数字转换为量化类型名称，未命中映射时回退显示原始数字
function formatFileType(fileType) {
  const name = GGUF_FILE_TYPE_MAP[Number(fileType)]
  return name !== undefined ? name : String(fileType)
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
    
    // 调用gguf-dump获取模型信息，使用markdown格式输出
    // --no-tensors：跳过张量列表，加快执行并减少非必要输出
    const dumpOutput = execSync(`gguf-dump "${filePath}" --no-tensors --markdown`, { 
      encoding: 'utf-8', 
      timeout: 30000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    })
    
    // 调试：输出原始dump内容到控制台
    // console.log('=== GGUF-DUMP OUTPUT ===')
    // console.log(dumpOutput)
    // console.log('=== END OUTPUT ===')
    
    // 解析markdown输出
    const details = parseGgufDump(dumpOutput)
    
    // 将完整的原始输出追加到解析结果之后，方便查看
    details.raw_output = dumpOutput
    
    res.json(details)
  } catch (err) {
    console.error('获取模型详情失败:', err)
    res.status(500).json({ error: `获取模型详情失败: ${err.message}` })
  }
})

// 解析 gguf-dump --markdown 输出，提取关键元数据
function parseGgufDump(dumpOutput) {
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
  
  // markdown表格输出解析为 key -> value 映射
  const metadata = parseMarkdownMetadata(dumpOutput)
  const pick = (key) => (metadata[key] !== undefined && metadata[key] !== '' ? metadata[key] : null)
  
  // 文件基础信息
  if (pick('GGUF.version') !== null) details.version = String(pick('GGUF.version'))
  if (pick('general.architecture') !== null) {
    details.architecture = String(pick('general.architecture'))
  }
  if (pick('general.size_label') !== null) details.size_label = String(pick('general.size_label'))
  if (pick('general.file_type') !== null) details.file_type = formatFileType(pick('general.file_type'))
  if (pick('general.quantized_by') !== null) details.quantized_by = String(pick('general.quantized_by'))
  
  // 模型网络超参（超参键前缀跟随架构）
  const arch = metadata['general.architecture'] || ''
  if (pick(`${arch}.context_length`) !== null) details.context_length = String(pick(`${arch}.context_length`))
  if (pick(`${arch}.block_count`) !== null) details.block_count = String(pick(`${arch}.block_count`))
  if (pick(`${arch}.embedding_length`) !== null) details.embedding_length = String(pick(`${arch}.embedding_length`))
  if (pick(`${arch}.feed_forward_length`) !== null) details.feed_forward_length = String(pick(`${arch}.feed_forward_length`))
  // MoE 专家数：键名前缀随架构变化（如 llama. / gpt-oss. / qwen2moe.），按后缀匹配
  const expertCount = pickBySuffix(metadata, 'expert_count')
  if (expertCount !== null) details.expert_count = String(expertCount)
  const expertUsedCount = pickBySuffix(metadata, 'expert_used_count')
  if (expertUsedCount !== null) details.expert_used_count = String(expertUsedCount)
  
  // 内置推测加速头
  if (pick('qwen.mtp.num_pred_heads') !== null) details.num_pred_heads = String(pick('qwen.mtp.num_pred_heads'))
  if (pick('deepseek.spec.num_draft_layers') !== null) details.num_draft_layers = String(pick('deepseek.spec.num_draft_layers'))
  
  // 分词器元数据
  if (pick('tokenizer.ggml.model') !== null) details.tokenizer_model = String(pick('tokenizer.ggml.model'))
  if (pick('tokenizer.chat_template') !== null) details.chat_template = String(pick('tokenizer.chat_template'))
  
  return details
}

// 解析 gguf-dump --markdown 输出中的元数据表格，返回 key -> value 映射
// 兼容值跨多行（如 tokenizer.chat_template）的情况
function parseMarkdownMetadata(output) {
  const metadata = {}
  if (!output) return metadata
  
  const lines = String(output).split(/\r?\n/)
  const rowStartPattern = /^\|\s*\d+\s*\|/
  const rows = []
  let currentRow = null
  
  for (const line of lines) {
    if (rowStartPattern.test(line)) {
      // 新的一行数据行
      if (currentRow !== null) rows.push(currentRow)
      currentRow = line
    } else if (currentRow !== null) {
      // 上一行值的续行（多行值），拼接后统一解析
      currentRow += '\n' + line
    }
  }
  if (currentRow !== null) rows.push(currentRow)
  
  for (const row of rows) {
    // 去掉首尾的表格分隔符，得到各列
    const cells = row.split('|').slice(1, -1)
    if (cells.length < 5) continue
    
    const key = cells[3].trim()
    if (!key) continue
    
    // 值中可能包含“|”，从第5列起全部作为值
    metadata[key] = cleanMarkdownValue(cells.slice(4).join('|'))
  }
  
  return metadata
}

// 去除 markdown 表格值两端的反引号包裹
function cleanMarkdownValue(rawValue) {
  const value = String(rawValue).trim()
  const wrapped = value.match(/^`([\s\S]*)`$/)
  if (wrapped && !wrapped[1].includes('`')) {
    return wrapped[1].trim()
  }
  return value
}

// 按键名后缀在元数据中查找（MoE 专家数键的前缀随架构变化，如 llama. / gpt-oss.）
// 命中条件：键名等于 suffix，或以 ".suffix" 结尾
function pickBySuffix(metadata, suffix) {
  for (const key of Object.keys(metadata)) {
    if (key === suffix || key.endsWith(`.${suffix}`)) {
      const value = metadata[key]
      if (value !== undefined && value !== '') return value
    }
  }
  return null
}

export default router
