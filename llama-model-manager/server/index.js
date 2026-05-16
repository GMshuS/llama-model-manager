import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'

import modelsRouter from './routes/models.js'
import serverRouter from './routes/server.js'
import presetsRouter from './routes/presets.js'
import { getPresets, getModelConfig, getConfig, saveConfig } from './store/store.js'
import { processManager } from './services/process-manager.js'
import { scanPorts } from './services/port-scanner.js'
import { parseTokensPerSecond, parseMemoryMB } from './services/metrics-parser.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/models', modelsRouter)
app.use('/api/server', serverRouter)
app.use('/api/presets', presetsRouter)

app.get('/api/config', (req, res) => {
  res.json(getConfig())
})

app.put('/api/config', (req, res) => {
  saveConfig(req.body)
  res.json(getConfig())
})

app.post('/api/chat', async (req, res) => {
  const status = processManager.getStatus()
  if (status.state !== 'running') {
    return res.status(400).json({ error: '服务未运行' })
  }
  const { prompt } = req.body
  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' })
  }
  try {
    const port = status.params?.port || 8880
    const llmRes = await fetch(`http://127.0.0.1:${port}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, n_predict: 512, stream: false }),
    })
    const data = await llmRes.json()
    res.json({ content: data.content })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

app.use(express.static(path.join(__dirname, '..', 'dist')))

app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) return next()
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

export default function startExpress(port) {
  const server = http.createServer(app)

  const wss = new WebSocketServer({ server, path: '/ws' })
  const wsClients = new Set()

  wss.on('connection', (ws) => {
    wsClients.add(ws)
    ws.send(JSON.stringify({
      event: 'status',
      data: processManager.getStatus(),
    }))

    ws.on('close', () => {
      wsClients.delete(ws)
    })
  })

  processManager.setWsClients(wsClients)

  const PORT = port || process.env.PORT || 3001
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    scanPorts().then(found => {
      for (const p of found) {
        console.log(`Detected external llama-server on port ${p.port}, PID: ${p.pid}`)
      }
    })
  })

  return server
}

if (process.argv[1] && (process.argv[1].endsWith('server/index.js') || process.argv[1].endsWith('server\\index.js'))) {
  const portArgIndex = process.argv.indexOf('--port')
  const port = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : undefined
  startExpress(port)
}
