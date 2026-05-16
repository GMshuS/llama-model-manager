import { spawn, execSync } from 'child_process'
import path from 'path'
import { existsSync } from 'fs'
import { getConfig } from '../store/store.js'

class ProcessManager {
  constructor() {
    this.process = null
    this.state = 'stopped'
    this.currentModel = null
    this.currentParams = null
    this.metricsInterval = null
    this.healthInterval = null
    this.wsClients = null
    this.metrics = { tokensPerSecond: 0, memoryMB: 0, pid: null }
  }

  setWsClients(clients) {
    this.wsClients = clients
  }

  broadcast(event, data) {
    if (!this.wsClients) return
    const msg = JSON.stringify({ event, data })
    for (const ws of this.wsClients) {
      if (ws.readyState === 1) ws.send(msg)
    }
  }

  buildArgs(modelPath, params) {
    const args = ['-m', path.resolve(modelPath)]
    const map = {
      ngl: '-ngl', ctx: '-c', t: '-t', port: '--port', host: '--host',
      timeout: '--timeout', parallel: '--parallel',
      batchSize: '--batch-size', ubatchSize: '--ubatch-size',
    }
    for (const [key, flag] of Object.entries(map)) {
      if (params[key] !== undefined && params[key] !== null) {
        args.push(flag, String(params[key]))
      }
    }
    if (params.contBatching) args.push('--cont-batching')
    if (params.jinja) args.push('--jinja')
    return args
  }

  async start(modelPath, modelName, params) {
    if (this.state === 'running') {
      await this.stop()
    }

    this.state = 'starting'
    this.currentModel = modelName
    this.currentParams = params
    this.broadcast('status', { state: 'starting', model: modelName })

    const args = this.buildArgs(modelPath, params)

    const exePath = getConfig().llamaServerExe || 'llama-server.exe'
    this.process = spawn(exePath, args, {
      windowsHide: false,
    })

    this.metrics.pid = this.process.pid

    this.process.stdout.on('data', (data) => {
      const text = data.toString()
      this.broadcast('log', { stream: 'stdout', text })
      this.parseMetrics(text)
    })

    this.process.stderr.on('data', (data) => {
      const text = data.toString()
      this.broadcast('log', { stream: 'stderr', text })
      this.parseMetrics(text)
    })

    this.process.on('exit', (code) => {
      this.state = 'stopped'
      this.currentModel = null
      this.currentParams = null
      this.metrics.pid = null
      this.clearIntervals()
      this.broadcast('status', { state: 'stopped', exitCode: code })
      this.broadcast('log', { stream: 'stdout', text: `Process exited with code ${code}\n` })
    })

    this.process.on('error', (err) => {
      this.state = 'error'
      this.currentModel = null
      this.currentParams = null
      this.metrics.pid = null
      this.clearIntervals()
      this.broadcast('status', { state: 'error', error: err.message })
      this.broadcast('log', { stream: 'stderr', text: `Error: ${err.message}\n` })
    })

    this.startHealthCheck()
    this.startMetricsPush()

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 2000)
      this.process.on('error', function startupError(err) {
        clearTimeout(timeout)
        this.process.removeListener('error', startupError)
        reject(err)
      }.bind(this))
    })
  }

  parseMetrics(text) {
    const patterns = [
      /(\d+\.?\d*)\s*tokens?\s*\/?\s*s(?:ec)?/i,
      /(\d+\.?\d*)\s*t\/s/i,
      /tokens?\s*per\s*second:\s*(\d+\.?\d*)/i,
    ]
    for (const pat of patterns) {
      const m = text.match(pat)
      if (m) { this.metrics.tokensPerSecond = parseFloat(m[1]); break }
    }
  }

  startHealthCheck() {
    let attempts = 0
    this.healthInterval = setInterval(async () => {
      attempts++
      try {
        const port = this.currentParams?.port || 8880
        const res = await fetch(`http://127.0.0.1:${port}/health`)
        if (res.ok && this.state === 'starting') {
          this.state = 'running'
          this.broadcast('status', { state: 'running', model: this.currentModel })
          this.broadcast('log', { stream: 'stdout', text: `Server ready on port ${port}\n` })
          clearInterval(this.healthInterval)
          this.healthInterval = null
        }
      } catch {
        if (attempts > 60 && this.state === 'starting') {
          this.state = 'error'
          this.currentModel = null
          this.currentParams = null
          this.broadcast('status', { state: 'error', error: '启动超时' })
          this.broadcast('log', { stream: 'stderr', text: 'Error: 启动超时 (60s)\n' })
          this.stop()
        }
      }
    }, 1000)
  }

  startMetricsPush() {
    this.metricsInterval = setInterval(() => {
      if (this.state === 'running' || this.state === 'starting') {
        this.broadcast('metrics', { ...this.metrics })
      }
    }, 2000)
  }

  clearIntervals() {
    if (this.healthInterval) { clearInterval(this.healthInterval); this.healthInterval = null }
    if (this.metricsInterval) { clearInterval(this.metricsInterval); this.metricsInterval = null }
  }

  async stop() {
    if (!this.process) return

    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /PID ${this.process.pid} /T /F`, { stdio: 'ignore' })
      } catch {}
    } else {
      this.process.kill('SIGTERM')
    }

    this.clearIntervals()
    this.state = 'stopped'
    this.currentModel = null
    this.currentParams = null
    this.metrics.pid = null
    this.broadcast('status', { state: 'stopped' })
    this.broadcast('log', { stream: 'stdout', text: 'Server stopped\n' })
    this.process = null
  }

  getStatus() {
    return {
      state: this.state,
      model: this.currentModel,
      params: this.currentParams,
      metrics: this.metrics,
    }
  }
}

export const processManager = new ProcessManager()
