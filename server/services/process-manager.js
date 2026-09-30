// llama-server 实例注册表：以 Map<instanceId, LlamaInstance> 管理多实例并行运行。
// 关键约束（根治 Bug A）：健康检查与指标推送只使用「全局唯一」的两个定时器遍历全部实例，
// 定时器句柄绝不挂到实例上，否则实例 A 退出会清掉 B 的健康检查导致连坐。
// 单实例态与指标解析下移到 LlamaInstance（./llama-instance.js）。

import { spawn, execSync } from 'child_process'
import path from 'path'
import { randomUUID } from 'crypto'
import { getConfig } from '../store/store.js'
import { LlamaInstance } from './llama-instance.js'
import { scanPorts } from './port-scanner.js'

const HEALTH_TICK_MS = 1000
const METRICS_TICK_MS = 2000
const STARTUP_ERROR_WINDOW_MS = 2000

// 端口占用错误：路由据此转 409，前端据此就地提示（D3 允许同名重复启动 → 端口守卫为必需）
export class PortInUse extends Error {
  constructor(port, owner) {
    super(`端口 ${port} 已被${owner === 'instance' ? '运行中的实例' : '外部进程'}占用`)
    this.name = 'PortInUse'
    this.code = 'PORT_IN_USE'
    this.port = port
    this.owner = owner // 'instance' | 'external'
  }
}

class ProcessManager {
  constructor() {
    this.instances = new Map() // instanceId -> LlamaInstance
    this.wsClients = null
    this.tickTimer = null // 全局唯一健康检查 tick
    this.metricsTimer = null // 全局唯一指标推送 tick
  }

  setWsClients(clients) {
    this.wsClients = clients
  }

  // 广播信封统一携带 instanceId，前端据此归组（不再靠单对象覆盖）
  broadcast(event, instanceId = null, data = null) {
    if (!this.wsClients) return
    const msg = JSON.stringify({ event, instanceId, data })
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
      device: '--device', apiKey: '--api-key',
      temp: '--temp', flashAttn: '--flash-attn',
      cacheTypeK: '-ctk', cacheTypeV: '-ctv',
    }
    for (const [key, flag] of Object.entries(map)) {
      const value = params[key]
      if (value !== undefined && value !== null && value !== '') {
        args.push(flag, String(value))
      }
    }
    // 解析并追加自定义参数
    if (params.customArgs && params.customArgs.trim()) {
      const custom = params.customArgs.trim()
      // 简单解析：按空格分割，但保留引号内的内容
      const regex = /([^\s"']+|"[^"]*"|'[^']*')+/g
      const matches = custom.match(regex)
      if (matches) {
        for (const match of matches) {
          // 去除外层引号
          const arg = match.replace(/^["']|["']$/g, '')
          args.push(arg)
        }
      }
    }
    return args
  }

  buildCommandLine(exePath, modelPath, params) {
    const args = this.buildArgs(modelPath, params)
    // 构建完整的命令行字符串
    const parts = [exePath]
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg.startsWith('-')) {
        // 对于标志参数，直接添加
        parts.push(arg)
      } else {
        // 对于值参数，检查是否需要引号
        if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
          // 如果包含空格或引号，用双引号包裹
          parts.push(`"${arg.replace(/"/g, '\\"')}"`)
        } else {
          parts.push(arg)
        }
      }
    }
    return parts.join(' ')
  }

  // 端口守卫：我方实例占用 → owner='instance'；外部进程占用 → owner='external'。
  // 必须在注册 / spawn 之前跑完，避免失败时留下占用端口的孤儿实例。
  // 注：只做占用判断，不预留端口，TOCTOU 竞态仅被缩短而不消除。
  async assertPortFree(port) {
    const target = Number(port)
    if (!Number.isInteger(target) || target < 1 || target > 65535) return

    if (this.findByPort(target)) throw new PortInUse(target, 'instance')

    const external = await scanPorts(target, target)
    if (Array.isArray(external) && external.length > 0) throw new PortInUse(target, 'external')
  }

  // 启动一个实例；返回 instanceId（不再返回状态对象）
  async start({ modelPath, modelName, params = {} }) {
    const exePath = getConfig().llamaServerExe || 'llama-server.exe'
    const id = randomUUID()
    const commandLine = this.buildCommandLine(exePath, modelPath, params)
    const instance = new LlamaInstance({ id, modelPath, modelName, params, commandLine })

    await this.assertPortFree(instance.port)

    this.instances.set(id, instance)
    this.broadcast('instance-added', id, instance.snapshot())

    const args = this.buildArgs(modelPath, params)
    // D6：隐藏控制台窗口；stdout/stderr 仍走管道推送（stderr 是唯一错误诊断来源）
    const child = spawn(exePath, args, { windowsHide: true })
    instance.process = child
    instance.metrics.pid = child.pid

    const pump = (stream) => (data) => {
      // 实例已移除（用户停止 / 崩溃清理）后不再转发，避免前端留下无主日志桶
      if (!this.instances.has(id)) return
      const text = data.toString()
      this.broadcast('log', id, { stream, text })
      instance.parseMetrics(text)
    }
    if (child.stdout) child.stdout.on('data', pump('stdout'))
    if (child.stderr) child.stderr.on('data', pump('stderr'))

    child.on('exit', (code) => this.handleExit(instance, code))
    child.on('error', (err) => this.handleError(instance, err))

    this.ensureTimers()

    // 与旧行为一致：给 spawn 失败（可执行文件缺失等）留一个短窗口，命中则让 /start 失败
    await this.waitForStartupError(child)

    return id
  }

  waitForStartupError(child) {
    return new Promise((resolve, reject) => {
      const onError = (err) => {
        clearTimeout(timer)
        reject(err)
      }
      const timer = setTimeout(() => {
        child.removeListener('error', onError)
        resolve()
      }, STARTUP_ERROR_WINDOW_MS)
      child.once('error', onError)
    })
  }

  handleExit(instance, code) {
    // 用户主动停止后异步到达的 exit：实例已移除，不再广播，避免前端留下无主日志桶
    if (!this.instances.has(instance.id)) {
      this.maybeStopTimers()
      return
    }

    instance.exitCode = code
    instance.process = null
    instance.metrics.pid = null
    // 已判 error 的实例不被 exit 覆写为 stopped，保留错误原因供用户查看（D2）
    if (instance.state !== 'error') instance.state = 'stopped'

    this.broadcast('log', instance.id, {
      stream: 'stdout',
      text: `Process exited with code ${code}\n`,
    })

    // D2：用户主动停止 → 立即移除；崩溃 / 自行退出 → 保留 terminal 态等用户关闭
    if (instance.stopRequested) {
      this.remove(instance.id)
      return
    }

    this.broadcast('status', instance.id, instance.snapshot())
    this.maybeStopTimers()
  }

  handleError(instance, err) {
    if (!this.instances.has(instance.id)) {
      this.maybeStopTimers()
      return
    }

    instance.state = 'error'
    instance.error = err?.message || String(err)
    instance.process = null
    instance.metrics.pid = null

    this.broadcast('status', instance.id, instance.snapshot())
    this.broadcast('log', instance.id, { stream: 'stderr', text: `Error: ${instance.error}\n` })
    this.maybeStopTimers()
  }

  async stop(instanceId = null) {
    const targets = instanceId
      ? [this.instances.get(instanceId)].filter(Boolean)
      : [...this.instances.values()]

    for (const instance of targets) {
      await this.stopInstance(instance)
    }
  }

  // electron before-quit 使用：退出前全停
  async stopAll() {
    await this.stop()
  }

  async stopInstance(instance) {
    instance.stopRequested = true
    this.killProcess(instance)
    instance.process = null
    instance.metrics.pid = null
    if (instance.state !== 'error') instance.state = 'stopped'

    this.broadcast('log', instance.id, { stream: 'stdout', text: 'Server stopped\n' })
    this.remove(instance.id)
  }

  // 只杀进程、不改状态、不移除实例（供启动超时等场景复用）
  killProcess(instance) {
    const child = instance.process
    if (!child || !child.pid) return

    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' })
      } else {
        child.kill('SIGTERM')
      }
    } catch {
      // 进程可能已退出，忽略
    }
  }

  remove(instanceId) {
    if (!this.instances.has(instanceId)) return false
    this.instances.delete(instanceId)
    this.broadcast('instance-removed', instanceId, { id: instanceId })
    this.maybeStopTimers()
    return true
  }

  // 按 startedAt 升序返回全量快照（广播首包 / REST /api/server/status 共用）
  getInstances() {
    return [...this.instances.values()]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((instance) => instance.snapshot())
  }

  getInstance(instanceId) {
    return this.instances.get(instanceId) || null
  }

  // 端口守卫用：只认存活实例（terminal 态已释放端口）
  findByPort(port) {
    const target = Number(port)
    for (const instance of this.instances.values()) {
      if (instance.isAlive && instance.port === target) return instance
    }
    return null
  }

  ensureTimers() {
    if (!this.tickTimer) {
      this.tickTimer = setInterval(() => {
        this.tick().catch((err) => {
          console.error('[process-manager] health tick failed:', err?.message)
        })
      }, HEALTH_TICK_MS)
    }
    if (!this.metricsTimer) {
      this.metricsTimer = setInterval(() => this.pushMetrics(), METRICS_TICK_MS)
    }
  }

  // 只有在注册表彻底空了才停表：任一实例存活都不能停（Bug A 的直接防线）
  maybeStopTimers() {
    if (this.instances.size > 0) return
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = null
    }
  }

  async tick() {
    for (const instance of [...this.instances.values()]) {
      if (!this.instances.has(instance.id)) continue

      const wasStarting = instance.state === 'starting'
      try {
        await instance.tickHealth((event, data) => this.broadcast(event, instance.id, data))
      } catch (err) {
        console.error('[process-manager] tickHealth failed:', err?.message)
        continue
      }

      // 启动超时已判 error 但进程仍在跑：杀掉进程，保留 error 态等用户关闭（D2）
      if (wasStarting && instance.state === 'error' && instance.process) {
        this.killProcess(instance)
        // 与 stopInstance 一致：杀掉后立即释放句柄，
        // 否则快照 / UI / findByPort 会继续暴露已死进程的 pid，直到异步 exit 到达
        instance.process = null
        instance.metrics.pid = null
      }
    }
  }

  pushMetrics() {
    for (const instance of [...this.instances.values()]) {
      if (!instance.isAlive) continue
      this.broadcast('metrics', instance.id, { ...instance.metrics })
    }
  }

}

// PortInUse 已在上方以 `export class` 声明，此处不得重复导出
export { ProcessManager }
export const processManager = new ProcessManager()
