import { Router } from 'express'
import { readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
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

export default router
