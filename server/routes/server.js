import { Router } from 'express'
import { processManager } from '../services/process-manager.js'
import { scanPorts } from '../services/port-scanner.js'
import { getModelConfig } from '../store/store.js'

const router = Router()

router.post('/start', async (req, res) => {
  const { modelPath, modelName, params } = req.body
  if (!modelPath || !modelName) {
    return res.status(400).json({ error: 'modelPath and modelName required' })
  }
  try {
    await processManager.start(modelPath, modelName, params)
    res.json({ ok: true, status: processManager.getStatus() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/stop', (req, res) => {
  processManager.stop()
  res.json({ ok: true })
})

router.get('/status', (req, res) => {
  res.json(processManager.getStatus())
})

router.get('/scan', async (req, res) => {
  const found = await scanPorts()
  res.json(found)
})

export default router
