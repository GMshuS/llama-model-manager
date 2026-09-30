// WS 事件 → 多实例状态的纯函数 reducer（不依赖 React、不做 I/O，便于单测直接覆盖）。
// 事件归组完全依赖信封里的 instanceId，日志按实例分桶写入。
// dashboard.jsx 只做 wiring：把 WS 消息喂给 applyEvent 即可。

import { appendLog } from './log-buffer.js'

export const initialState = Object.freeze({
  instances: [],
  logs: {},
  activeId: null,
})

// D4：存活判定 = running / starting（terminal 态关闭 Tab 无需二次确认）
export function isAlive(instance) {
  return !!instance && (instance.state === 'running' || instance.state === 'starting')
}

function sortByStartedAt(list) {
  return [...list].sort((a, b) => (a?.startedAt || 0) - (b?.startedAt || 0))
}

// activeId 失效（指向的实例被移除 / 从未设置）时回退到最后一项，避免渲染空引用
function resolveActiveId(instances, activeId) {
  if (activeId && instances.some((item) => item.id === activeId)) return activeId

  const alive = instances.filter(isAlive)
  if (alive.length > 0) return alive[alive.length - 1].id

  return instances.length > 0 ? instances[instances.length - 1].id : null
}

// 实例消失后其日志桶一并丢弃；无丢弃时返回原引用
function pruneLogs(logs, instances) {
  const known = new Set(instances.map((item) => item.id))
  const stale = Object.keys(logs).filter((id) => !known.has(id))
  if (stale.length === 0) return logs

  const next = { ...logs }
  for (const id of stale) delete next[id]
  return next
}

function upsertInstance(instances, instance) {
  if (!instance || !instance.id) return instances

  const index = instances.findIndex((item) => item.id === instance.id)
  if (index === -1) return [...instances, instance]

  const next = [...instances]
  next[index] = { ...instances[index], ...instance }
  return next
}

function withInstances(state, instances) {
  const sorted = sortByStartedAt(instances)
  return {
    instances: sorted,
    logs: pruneLogs(state.logs, sorted),
    activeId: resolveActiveId(sorted, state.activeId),
  }
}

export function applyEvent(state, msg) {
  if (!state || !msg || !msg.event) return state

  const data = msg.data || {}
  const instanceId = msg.instanceId || data.id || null

  switch (msg.event) {
    // 握手首包：服务端全量实例数组
    case 'instances': {
      const list = Array.isArray(data.instances)
        ? data.instances
        : (Array.isArray(data) ? data : [])
      return withInstances(state, list)
    }

    case 'instance-added':
      return withInstances(state, upsertInstance(state.instances, { ...data, id: instanceId || data.id }))

    case 'status':
      return withInstances(state, upsertInstance(state.instances, { ...data, id: instanceId || data.id }))

    case 'instance-removed': {
      const id = instanceId || data.id
      if (!id) return state
      return withInstances(state, state.instances.filter((item) => item.id !== id))
    }

    case 'metrics': {
      if (!instanceId) return state
      const index = state.instances.findIndex((item) => item.id === instanceId)
      if (index === -1) return state

      const instances = [...state.instances]
      instances[index] = { ...instances[index], metrics: data }
      return { ...state, instances }
    }

    case 'log': {
      if (!instanceId) return state
      const entry = { ...data, ts: Date.now() }
      return { ...state, logs: appendLog(state.logs, instanceId, entry) }
    }

    default:
      return state
  }
}

export default { applyEvent, isAlive, initialState }
