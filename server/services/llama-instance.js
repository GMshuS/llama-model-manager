// 单台 llama-server 实例的态模型：状态 + 指标 + 健康检查 + 快照。
// 约定：定时器绝不挂在本对象上（规避 Bug A —— 实例 A 退出会清掉 B 的健康检查），
// 健康检查由 ProcessManager 的全局唯一 tick 遍历驱动，本对象只提供 tickHealth 行为。

const DEFAULT_PORT = 8880
const HEALTH_TIMEOUT_ATTEMPTS = 60
// 单次 /health 请求的超时：避免「TCP 已连上但永不响应」把串行遍历的全局 tick 永久挂住
const HEALTH_TIMEOUT_MS = 2000

export class LlamaInstance {
  constructor({ id, modelPath, modelName, params = {}, commandLine = '' }) {
    this.id = id
    this.modelPath = modelPath
    this.modelName = modelName
    this.params = params
    this.commandLine = commandLine
    this.startedAt = Date.now()
    this.state = 'starting' // starting | running | error | stopped
    this.process = null // terminal 态置 null
    this.metrics = { tokensPerSecond: 0, memoryMB: 0, pid: null }
    this.stopRequested = false // true = 用户主动停止，exit 后立即移除
    this.healthAttempts = 0
    this.error = null
    this.exitCode = null
  }

  get port() {
    return Number(this.params?.port) || DEFAULT_PORT
  }

  get isAlive() {
    return this.state === 'running' || this.state === 'starting'
  }

  // 从 stdout / stderr 文本中抽取 tokens/s（自 ProcessManager 下移，行为保持一致）
  parseMetrics(text) {
    const patterns = [
      /(\d+\.?\d*)\s*tokens?\s*\/?\s*s(?:ec)?/i,
      /(\d+\.?\d*)\s*t\/s/i,
      /tokens?\s*per\s*second:\s*(\d+\.?\d*)/i,
    ]
    for (const pat of patterns) {
      const m = text.match(pat)
      if (m) {
        this.metrics.tokensPerSecond = parseFloat(m[1])
        break
      }
    }
  }

  // 由全局 tick 调用；broadcast(event, data) 由 manager 注入（负责补 instanceId）
  async tickHealth(broadcast) {
    if (this.state !== 'starting') return

    this.healthAttempts += 1
    try {
      // Bug B 修复：127.0.1 是非法回环地址，必须写 127.0.0.1
      // 与 port-scanner 一致：必须带超时，否则半开连接会让本实例永久卡在 starting
      const res = await fetch(`http://127.0.0.1:${this.port}/health`, {
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      })
      if (!res.ok) return

      this.state = 'running'
      this.healthAttempts = 0
      broadcast('status', this.snapshot())
      broadcast('log', { stream: 'stdout', text: `Server ready on port ${this.port}\n` })
    } catch {
      if (this.healthAttempts >= HEALTH_TIMEOUT_ATTEMPTS) {
        this.state = 'error'
        this.error = '启动超时'
        broadcast('status', this.snapshot())
        broadcast('log', { stream: 'stderr', text: 'Error: 启动超时 (60s)\n' })
      }
    }
  }

  // 广播 / REST 统一的对外形状
  snapshot() {
    return {
      id: this.id,
      modelName: this.modelName,
      state: this.state,
      params: this.params,
      commandLine: this.commandLine,
      metrics: { ...this.metrics },
      startedAt: this.startedAt,
      port: this.port,
      error: this.error,
      exitCode: this.exitCode,
    }
  }
}

export default LlamaInstance
