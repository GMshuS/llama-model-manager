import { describe, expect, it } from 'vitest'
import { LOG_CAP_ACTIVE, LOG_CAP_BG, appendLog, clearLogs, trimBackground } from '../log-buffer.js'

function makeEntry(index, stream = 'stdout') {
  return { stream, text: `line ${index}\n`, ts: index }
}

function fill(logs, id, count, cap = LOG_CAP_ACTIVE) {
  let next = logs
  for (let i = 0; i < count; i++) {
    next = appendLog(next, id, makeEntry(i), cap)
  }
  return next
}

describe('log-buffer', () => {
  it('test_append_caps_at_active_limit', () => {
    const logs = fill({}, 'a', LOG_CAP_ACTIVE + 250)

    expect(logs.a).toHaveLength(LOG_CAP_ACTIVE)
    // 保留最新的条目，最旧的被丢弃
    expect(logs.a[logs.a.length - 1]).toEqual(makeEntry(LOG_CAP_ACTIVE + 249))
    expect(logs.a[0]).toEqual(makeEntry(250))

    // 不同实例互不干扰
    const mixed = appendLog(logs, 'b', makeEntry(1))
    expect(mixed.a).toBe(logs.a)
    expect(mixed.b).toEqual([makeEntry(1)])
  })

  it('test_trim_background_returns_same_ref_when_unchanged', () => {
    const logs = { a: [makeEntry(1)], b: [makeEntry(2)] }

    // 无任何实例超出后台容量 → 原引用返回
    expect(trimBackground(logs, 'a')).toBe(logs)

    // 激活实例本身超出容量也不做降容 → 原引用返回
    const activeOverflow = fill({}, 'a', LOG_CAP_BG + 10)
    expect(trimBackground(activeOverflow, 'a')).toBe(activeOverflow)
  })

  it('test_trim_background_trims_only_non_active_instances', () => {
    const logs = fill({}, 'a', LOG_CAP_BG + 50)
    const trimmed = trimBackground(logs, 'a')

    // 没有后台实例时保持原引用
    expect(trimmed).toBe(logs)

    const both = fill(logs, 'b', LOG_CAP_BG + 50)
    const trimmed2 = trimBackground(both, 'a')

    expect(trimmed2.a).toBe(both.a)
    expect(trimmed2.b).toHaveLength(LOG_CAP_BG)
    expect(trimmed2.b[trimmed2.b.length - 1]).toEqual(makeEntry(LOG_CAP_BG + 49))
  })

  it('test_clear_logs_keeps_ref_when_already_empty', () => {
    const logs = { a: [makeEntry(1)] }
    expect(clearLogs(logs, 'missing')).toBe(logs)

    const cleared = clearLogs(logs, 'a')
    expect(cleared.a).toEqual([])
    expect(logs.a).toEqual([makeEntry(1)])
  })
})