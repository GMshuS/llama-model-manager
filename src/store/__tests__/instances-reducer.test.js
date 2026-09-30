import { describe, expect, it } from 'vitest'
import { applyEvent, initialState, isAlive } from '../instances-reducer.js'

function snapshot(id, overrides = {}) {
  return {
    id,
    modelName: `${id}.gguf`,
    state: 'starting',
    params: { port: 8880 },
    commandLine: `llama-server.exe -m ${id}.gguf`,
    metrics: { tokensPerSecond: 0, memoryMB: 0, pid: null },
    startedAt: 1,
    port: 8880,
    error: null,
    exitCode: null,
    ...overrides,
  }
}

function withTwoInstances(activeId = 'a') {
  let state = applyEvent(initialState, { event: 'instance-added', instanceId: 'a', data: snapshot('a', { startedAt: 1 }) })
  state = applyEvent(state, { event: 'instance-added', instanceId: 'b', data: snapshot('b', { startedAt: 2 }) })
  return { ...state, activeId }
}

describe('instances-reducer', () => {
  it('test_instance_added_appends_tab', () => {
    const first = applyEvent(initialState, { event: 'instance-added', instanceId: 'a', data: snapshot('a', { startedAt: 1 }) })
    expect(first.instances).toHaveLength(1)
    expect(first.instances[0].modelName).toBe('a.gguf')
    // 首个 Tab 自动成为前台
    expect(first.activeId).toBe('a')

    // startedAt 乱序到达时仍按启动时间升序排列
    const second = applyEvent(first, { event: 'instance-added', instanceId: 'b', data: snapshot('b', { startedAt: 0 }) })
    expect(second.instances.map((item) => item.id)).toEqual(['b', 'a'])
    expect(second.logs).toBe(first.logs)
  })

  it('test_active_id_falls_back_when_removed', () => {
    const state = withTwoInstances('a')

    const removed = applyEvent(state, { event: 'instance-removed', instanceId: 'a', data: { id: 'a' } })
    expect(removed.instances.map((item) => item.id)).toEqual(['b'])
    // activeId 指向的实例消失 → 回退到最后一项
    expect(removed.activeId).toBe('b')

    const empty = applyEvent(removed, { event: 'instance-removed', instanceId: 'b', data: { id: 'b' } })
    expect(empty.instances).toEqual([])
    expect(empty.activeId).toBeNull()
  })

  it('test_is_alive_matches_running_and_starting', () => {
    expect(isAlive(snapshot('a', { state: 'running' }))).toBe(true)
    expect(isAlive(snapshot('a', { state: 'starting' }))).toBe(true)

    expect(isAlive(snapshot('a', { state: 'stopped' }))).toBe(false)
    expect(isAlive(snapshot('a', { state: 'error' }))).toBe(false)
    expect(isAlive(null)).toBe(false)
    expect(isAlive(undefined)).toBe(false)
  })

  it('test_status_updates_existing_instance_without_adding_tab', () => {
    const state = withTwoInstances('a')

    const updated = applyEvent(state, {
      event: 'status',
      instanceId: 'a',
      data: snapshot('a', { startedAt: 1, state: 'running' }),
    })

    expect(updated.instances).toHaveLength(2)
    expect(updated.instances.find((item) => item.id === 'a').state).toBe('running')
    expect(updated.activeId).toBe('a')
  })

  it('test_log_events_grouped_by_instance', () => {
    const state = withTwoInstances('a')

    const afterA = applyEvent(state, { event: 'log', instanceId: 'a', data: { stream: 'stdout', text: 'a1\n' } })
    const afterB = applyEvent(afterA, { event: 'log', instanceId: 'b', data: { stream: 'stderr', text: 'b1\n' } })

    expect(afterB.logs.a).toHaveLength(1)
    expect(afterB.logs.b).toHaveLength(1)
    expect(afterB.logs.a[0]).toMatchObject({ stream: 'stdout', text: 'a1\n' })
    expect(typeof afterB.logs.a[0].ts).toBe('number')

    // 已有实例的日志不串台
    const more = applyEvent(afterB, { event: 'log', instanceId: 'a', data: { stream: 'stdout', text: 'a2\n' } })
    expect(more.logs.a).toHaveLength(2)
    expect(more.logs.b).toBe(afterB.logs.b)
  })

  it('test_handshake_replaces_instances_and_prunes_logs', () => {
    const state = withTwoInstances('a')
    const withLogs = applyEvent(state, { event: 'log', instanceId: 'a', data: { stream: 'stdout', text: 'a1\n' } })
    expect(Object.keys(withLogs.logs)).toEqual(['a'])

    const handshaked = applyEvent(withLogs, {
      event: 'instances',
      data: { instances: [snapshot('c', { startedAt: 5 })] },
    })

    expect(handshaked.instances.map((item) => item.id)).toEqual(['c'])
    // 握手后旧实例消失 → 其日志桶一并丢弃（日志不持久化，刷新后为空属预期）
    expect(handshaked.logs).toEqual({})
    expect(handshaked.activeId).toBe('c')
  })

  it('test_metrics_merge_and_unknown_event_keep_state', () => {
    const state = withTwoInstances('a')

    const withMetrics = applyEvent(state, {
      event: 'metrics',
      instanceId: 'b',
      data: { tokensPerSecond: 42.5, memoryMB: 0, pid: 1234 },
    })
    expect(withMetrics.instances.find((item) => item.id === 'b').metrics).toEqual({
      tokensPerSecond: 42.5,
      memoryMB: 0,
      pid: 1234,
    })
    expect(withMetrics.instances.find((item) => item.id === 'a').metrics.tokensPerSecond).toBe(0)

    // 未知事件 / 缺 instanceId 的消息不产生任何新引用
    expect(applyEvent(state, { event: 'unknown', instanceId: 'a' })).toBe(state)
    expect(applyEvent(state, { event: 'log', data: { text: 'orphan\n' } })).toBe(state)
    expect(applyEvent(state, null)).toBe(state)
  })
})
