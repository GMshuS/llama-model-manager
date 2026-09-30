import { afterEach, describe, expect, it, vi } from 'vitest'
import { LlamaInstance } from '../llama-instance.js'

function makeInstance(overrides = {}) {
  return new LlamaInstance({
    id: 'id-1',
    modelPath: 'C:\\models\\demo.gguf',
    modelName: 'demo.gguf',
    params: { port: 8881 },
    commandLine: 'llama-server.exe -m demo.gguf --port 8881',
    ...overrides,
  })
}

function makeBroadcast() {
  const events = []
  const fn = (event, data) => {
    events.push({ event, data })
  }
  fn.events = events
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LlamaInstance', () => {
  it('test_snapshot_contains_required_fields', () => {
    const inst = makeInstance()
    const snap = inst.snapshot()

    expect(snap).toMatchObject({
      id: 'id-1',
      modelName: 'demo.gguf',
      state: 'starting',
      commandLine: 'llama-server.exe -m demo.gguf --port 8881',
      port: 8881,
    })
    expect(snap.params).toEqual({ port: 8881 })
    expect(snap.metrics).toEqual({ tokensPerSecond: 0, memoryMB: 0, pid: null })
    expect(typeof snap.startedAt).toBe('number')
    expect(snap.error).toBeNull()
    expect(snap.exitCode).toBeNull()
  })

  it('test_parse_metrics_updates_tokens_per_second', () => {
    const inst = makeInstance()

    inst.parseMetrics('prompt eval time =   12.34 tokens/s')
    expect(inst.metrics.tokensPerSecond).toBeCloseTo(12.34)

    inst.parseMetrics('eval time = 8.5 t/s')
    expect(inst.metrics.tokensPerSecond).toBeCloseTo(8.5)

    // 无指标文本不应污染上一次的解析结果
    inst.parseMetrics('main: server is listening on http://127.0.0.1:8881')
    expect(inst.metrics.tokensPerSecond).toBeCloseTo(8.5)
  })

  it('test_tick_health_switches_starting_to_running', async () => {
    const inst = makeInstance()
    const broadcast = makeBroadcast()
    const fetchSpy = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', fetchSpy)

    await inst.tickHealth(broadcast)

    expect(inst.state).toBe('running')
    // Bug B 回归：健康检查必须打到 127.0.0.1
    expect(fetchSpy.mock.calls[0][0]).toBe('http://127.0.0.1:8881/health')
    expect(broadcast.events.map((e) => e.event)).toEqual(['status', 'log'])
    expect(broadcast.events[0].data.state).toBe('running')
  })

  it('test_tick_health_ignores_non_starting_instance', async () => {
    const inst = makeInstance()
    const broadcast = makeBroadcast()
    const fetchSpy = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', fetchSpy)

    inst.state = 'stopped'
    await inst.tickHealth(broadcast)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(broadcast.events).toHaveLength(0)
  })

  it('test_tick_health_times_out_to_error_after_60_attempts', async () => {
    const inst = makeInstance()
    const broadcast = makeBroadcast()
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }))

    inst.healthAttempts = 59
    await inst.tickHealth(broadcast)

    expect(inst.state).toBe('error')
    expect(inst.error).toBe('启动超时')
    expect(broadcast.events.map((e) => e.event)).toEqual(['status', 'log'])
    expect(broadcast.events[0].data.state).toBe('error')
  })
})