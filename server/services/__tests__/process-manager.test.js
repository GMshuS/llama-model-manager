import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'

const { spawnMock, execSyncMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  execSyncMock: vi.fn(),
}))

vi.mock('child_process', () => ({
  spawn: (...args) => spawnMock(...args),
  execSync: (...args) => execSyncMock(...args),
}))

vi.mock('../../store/store.js', () => ({
  getConfig: () => ({ llamaServerExe: 'llama-server.exe' }),
}))

import { ProcessManager } from '../process-manager.js'

const STARTUP_WINDOW_MS = 2000
const HEALTH_TICK_MS = 1000
const HEALTH_TIMEOUT_ATTEMPTS = 60
let pidSeq = 1000

function makeChild(pid) {
  const child = new EventEmitter()
  child.pid = pid
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = vi.fn()
  return child
}

function makeManager() {
  const manager = new ProcessManager()
  const sent = []
  const clients = new Set([{ readyState: 1, send: (msg) => sent.push(JSON.parse(msg)) }])
  manager.setWsClients(clients)
  manager.sent = sent
  return manager
}

async function startModel(manager, modelName, params) {
  const pending = manager.start({
    modelPath: `C:\\models\\${modelName}`,
    modelName,
    params,
  })
  await vi.advanceTimersByTimeAsync(STARTUP_WINDOW_MS)
  return pending
}

// start() 开头有一段 await（端口守卫），需要先把微任务队列排空再取 spawn 结果
async function flushMicrotasks(times = 20) {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
  pidSeq = 1000
  spawnMock.mockReset()
  execSyncMock.mockReset()
  spawnMock.mockImplementation(() => makeChild(pidSeq++))
  execSyncMock.mockImplementation(() => '')
  // 健康检查在单测里不发真实请求：统一拒绝，等价于进程尚未监听
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('ECONNREFUSED')
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('ProcessManager 注册表', () => {
  it('test_start_two_models_returns_two_ids', async () => {
    const manager = makeManager()

    const idA = await startModel(manager, 'a.gguf', { port: 8881 })
    const idB = await startModel(manager, 'b.gguf', { port: 8882 })

    expect(idA).toBeTruthy()
    expect(idB).toBeTruthy()
    expect(idA).not.toBe(idB)

    const instances = manager.getInstances()
    expect(instances).toHaveLength(2)
    expect(instances.map((item) => item.modelName)).toEqual(['a.gguf', 'b.gguf'])
    expect(instances.map((item) => item.port)).toEqual([8881, 8882])
    expect(instances.every((item) => item.state === 'starting')).toBe(true)

    // D6：spawn 必须隐藏控制台窗口
    expect(spawnMock).toHaveBeenCalledTimes(2)
    expect(spawnMock.mock.calls[0][2]).toEqual({ windowsHide: true })

    // 广播信封携带 instanceId
    const added = manager.sent.filter((msg) => msg.event === 'instance-added')
    expect(added.map((msg) => msg.instanceId)).toEqual([idA, idB])
    expect(added[0].data.id).toBe(idA)
  })

  it('test_stop_instance_only_removes_target', async () => {
    const manager = makeManager()

    const idA = await startModel(manager, 'a.gguf', { port: 8881 })
    const idB = await startModel(manager, 'b.gguf', { port: 8882 })

    await manager.stop(idA)

    const instances = manager.getInstances()
    expect(instances).toHaveLength(1)
    expect(instances[0].id).toBe(idB)
    expect(instances[0].modelName).toBe('b.gguf')

    // 只杀目标实例对应的 pid
    expect(execSyncMock).toHaveBeenCalledTimes(1)
    expect(execSyncMock.mock.calls[0][0]).toContain('/PID 1000')

    const removed = manager.sent.filter((msg) => msg.event === 'instance-removed')
    expect(removed).toHaveLength(1)
    expect(removed[0].instanceId).toBe(idA)
  })

  it('test_stop_all_removes_every_instance_and_stops_timers', async () => {
    const manager = makeManager()

    await startModel(manager, 'a.gguf', { port: 8881 })
    await startModel(manager, 'b.gguf', { port: 8882 })
    expect(manager.tickTimer).not.toBeNull()

    await manager.stopAll()

    expect(manager.getInstances()).toEqual([])
    // 注册表空了才停表（Bug A 防线）
    expect(manager.tickTimer).toBeNull()
    expect(manager.metricsTimer).toBeNull()
    expect(execSyncMock).toHaveBeenCalledTimes(2)
  })

  it('test_find_by_port_returns_owner_instance', async () => {
    const manager = makeManager()

    await startModel(manager, 'a.gguf', { port: 8881 })
    await startModel(manager, 'b.gguf', { port: 8882 })

    expect(manager.findByPort(8882)?.modelName).toBe('b.gguf')
    expect(manager.findByPort(9999)).toBeNull()

    // terminal / 已移除实例不再占用端口
    const target = manager.findByPort(8882)
    await manager.stop(target.id)
    expect(manager.findByPort(8882)).toBeNull()
  })

  it('test_log_pump_broadcasts_with_instance_id', async () => {
    const manager = makeManager()
    const id = await startModel(manager, 'a.gguf', { port: 8881 })

    const child = spawnMock.mock.results[0].value
    child.stdout.emit('data', 'main: server is listening\n')
    child.stderr.emit('data', '12.5 tokens/s\n')

    const logs = manager.sent.filter((msg) => msg.event === 'log')
    expect(logs).toHaveLength(2)
    expect(logs[0]).toMatchObject({ event: 'log', instanceId: id })
    expect(logs[0].data).toEqual({ stream: 'stdout', text: 'main: server is listening\n' })
    expect(logs[1].data.stream).toBe('stderr')

    // 指标解析下移到实例上
    expect(manager.getInstances()[0].metrics.tokensPerSecond).toBeCloseTo(12.5)
  })

  it('test_exit_without_stop_request_keeps_terminal_instance', async () => {
    const manager = makeManager()
    const id = await startModel(manager, 'a.gguf', { port: 8881 })

    const child = spawnMock.mock.results[0].value
    child.emit('exit', 1)

    // D2：非用户主动停止 → 保留 stopped 态等用户关闭，不自动移除
    expect(manager.getInstances()).toHaveLength(1)
    expect(manager.getInstances()[0].state).toBe('stopped')
    expect(manager.getInstances()[0].exitCode).toBe(1)

    // 用户关闭（stop）后才移除
    await manager.stop(id)
    expect(manager.getInstances()).toEqual([])
  })

  // Bug A 回归：定时器必须全局唯一且只在注册表空了才停，实例 A 退出不得连坐 B
  it('test_exit_of_instance_a_does_not_stop_health_check_of_b', async () => {
    const manager = makeManager()

    const idA = await startModel(manager, 'a.gguf', { port: 8881 })
    const idB = await startModel(manager, 'b.gguf', { port: 8882 })

    const urls = []
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      urls.push(String(url))
      return { ok: true }
    }))

    const childA = spawnMock.mock.results[0].value
    childA.emit('exit', 1)

    await vi.advanceTimersByTimeAsync(HEALTH_TICK_MS)

    // A 退出后全局 tick 仍在跑，B 的健康检查照常发出
    expect(manager.tickTimer).not.toBeNull()
    expect(manager.metricsTimer).not.toBeNull()
    expect(urls.some((url) => url.includes(':8882/health'))).toBe(true)

    const byId = new Map(manager.getInstances().map((item) => [item.id, item]))
    expect(byId.get(idA).state).toBe('stopped')
    expect(byId.get(idB).state).toBe('running')
  })

  // D2：崩溃 / 启动超时的实例保留在注册表里，等用户主动关闭才移除
  it('test_crashed_instance_kept_until_user_close', async () => {
    const manager = makeManager()

    const id = await startModel(manager, 'a.gguf', { port: 8881 })
    await vi.advanceTimersByTimeAsync(HEALTH_TICK_MS * HEALTH_TIMEOUT_ATTEMPTS)

    const crashed = manager.getInstances()[0]
    expect(crashed.id).toBe(id)
    expect(crashed.state).toBe('error')
    expect(crashed.error).toBe('启动超时')
    // 进程句柄已释放，但 Tab 仍在（用户可读错误原因后自行关闭）
    expect(crashed.metrics.pid).toBeNull()
    expect(manager.tickTimer).not.toBeNull()

    const errorLogs = manager.sent.filter((msg) => msg.event === 'log' && msg.data.stream === 'stderr')
    expect(errorLogs.some((msg) => msg.data.text.includes('启动超时'))).toBe(true)

    await manager.stop(id)
    expect(manager.getInstances()).toEqual([])
  })

  it('test_start_rejects_and_keeps_error_instance_when_spawn_fails', async () => {
    const manager = makeManager()

    const pending = manager.start({
      modelPath: 'C:\\models\\a.gguf',
      modelName: 'a.gguf',
      params: { port: 8881 },
    })
    await flushMicrotasks()
    const child = spawnMock.mock.results[0].value
    child.emit('error', new Error('spawn ENOENT'))

    await expect(pending).rejects.toThrow('spawn ENOENT')
    expect(manager.getInstances()[0].state).toBe('error')
  })

  // F-1 端口守卫：我方存活实例已占用的端口必须被拒绝，且不得留下孤儿实例
  it('test_start_rejects_when_port_owned_by_instance', async () => {
    const manager = makeManager()

    const idA = await startModel(manager, 'a.gguf', { port: 8881 })

    await expect(manager.start({
      modelPath: 'C:\\models\\b.gguf',
      modelName: 'b.gguf',
      params: { port: 8881 },
    })).rejects.toMatchObject({ code: 'PORT_IN_USE', port: 8881, owner: 'instance' })

    // 守卫在注册 / spawn 之前：既不新增实例，也不重复 spawn
    expect(manager.getInstances()).toHaveLength(1)
    expect(manager.getInstances()[0].id).toBe(idA)
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })

  // F-1 端口守卫：外部进程（非本应用启动）占用同端口同样拒绝
  it('test_start_rejects_when_port_owned_by_external_process', async () => {
    const manager = makeManager()

    // 端口扫描命中的判定依据是 /health 返回 200
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))

    await expect(manager.start({
      modelPath: 'C:\\models\\a.gguf',
      modelName: 'a.gguf',
      params: { port: 8883 },
    })).rejects.toMatchObject({ code: 'PORT_IN_USE', port: 8883, owner: 'external' })

    expect(spawnMock).not.toHaveBeenCalled()
    expect(manager.getInstances()).toEqual([])
  })

  // F-1 负面用例：端口未被占用时守卫放行（不得误杀正常启动）
  it('test_start_passes_when_port_free', async () => {
    const manager = makeManager()

    const id = await startModel(manager, 'a.gguf', { port: 8881 })

    expect(id).toBeTruthy()
    expect(manager.getInstances()).toHaveLength(1)
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })
})
