// 日志缓冲纯函数：前台实例保留 1000 条，后台实例降容到 300 条（D5）。
// 全部为纯函数：不修改入参，且仅在真正发生变化时返回新引用，避免无关面板重渲染。

export const LOG_CAP_ACTIVE = 1000
export const LOG_CAP_BG = 300

// 向 logs[instanceId] 追加一条日志，超出 cap 时丢弃最旧的条目
export function appendLog(logs, instanceId, entry, cap = LOG_CAP_ACTIVE) {
  if (!instanceId) return logs

  const prev = logs[instanceId] || []
  const next = prev.length >= cap
    ? [...prev.slice(prev.length - cap + 1), entry]
    : [...prev, entry]

  return { ...logs, [instanceId]: next }
}

// 把非激活实例的日志降容到 cap；无任何改动时返回原引用
export function trimBackground(logs, activeId, cap = LOG_CAP_BG) {
  let changed = false
  const next = {}

  for (const id of Object.keys(logs)) {
    const list = logs[id]
    if (id === activeId || !Array.isArray(list) || list.length <= cap) {
      next[id] = list
      continue
    }
    next[id] = list.slice(-cap)
    changed = true
  }

  return changed ? next : logs
}

// 清空单个实例的日志；本来就是空数组时返回原引用
export function clearLogs(logs, instanceId) {
  if (!instanceId || (logs[instanceId] || []).length === 0) return logs
  return { ...logs, [instanceId]: [] }
}

export default { appendLog, trimBackground, clearLogs, LOG_CAP_ACTIVE, LOG_CAP_BG }
