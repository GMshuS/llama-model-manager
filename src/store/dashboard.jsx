// 多实例前端状态中心：instances[] + logs{instanceId} + activeId。
// 状态迁移与日志降容全部下抽到纯函数模块（instances-reducer / log-buffer），本文件只做 wiring。
//
// 关键陷阱（需求 §5.3）：onMessage 的 useCallback 依赖数组必须保持 []。
// useWebSocket 的 connect 依赖 onMessage，一旦把 activeId 写进依赖，每次切 Tab 都会让
// connect 引用变化 → 触发 WS close/重连，断连窗口期内的日志会丢失。
// 因此当前前台 id 一律通过 activeIdRef 穿透读取。

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import useWebSocket from '../hooks/useWebSocket'
import { applyEvent, initialState, isAlive } from './instances-reducer.js'
import { clearLogs as clearLogsBucket, trimBackground } from './log-buffer.js'

const DashboardContext = createContext(null)

const EMPTY_LOGS = Object.freeze([])
const STOPPED_STATUS = Object.freeze({
  state: 'stopped',
  model: null,
  modelName: null,
  params: null,
  commandLine: null,
  port: null,
  exitCode: null,
  metrics: Object.freeze({ tokensPerSecond: 0, memoryMB: 0, pid: null }),
})

// 过渡期兼容形状：单实例面板（ServerControl）仍按 status.* 取值
function toStatus(instance) {
  if (!instance) return STOPPED_STATUS
  return {
    state: instance.state,
    model: instance.modelName,
    modelName: instance.modelName,
    params: instance.params || null,
    commandLine: instance.commandLine || null,
    port: instance.port ?? null,
    exitCode: instance.exitCode ?? null,
    error: instance.error ?? null,
    metrics: instance.metrics || STOPPED_STATUS.metrics,
  }
}

export function DashboardProvider({ children }) {
  const [state, setState] = useState(initialState)
  const activeIdRef = useRef(null)

  useEffect(() => {
    activeIdRef.current = state.activeId
  }, [state.activeId])

  // WS 握手包到达前的兜底：先用 REST 拉一次全量实例
  useEffect(() => {
    fetch('/api/server/status')
      .then((res) => res.json())
      .then((data) => {
        const instances = Array.isArray(data?.instances) ? data.instances : []
        setState((prev) => applyEvent(prev, { event: 'instances', data: { instances } }))
      })
      .catch(() => {})
  }, [])

  // 依赖数组必须保持 []：见文件头说明
  const onMessage = useCallback((msg) => {
    const activeId = activeIdRef.current
    setState((prev) => {
      const next = applyEvent(prev, msg)
      if (next === prev) return prev

      // 每次状态变化都对后台实例做一次确定性降容（D5）
      const logs = trimBackground(next.logs, next.activeId || activeId)
      return logs === next.logs ? next : { ...next, logs }
    })
  }, [])

  useWebSocket(onMessage)

  // 启动成功后由 ModelBrowser 调用：跳转「正在运行」时直接停在新实例的 Tab 上
  const setActiveInstance = useCallback((instanceId) => {
    activeIdRef.current = instanceId
    setState((prev) => {
      if (prev.activeId === instanceId) return prev
      const logs = trimBackground(prev.logs, instanceId)
      return { ...prev, activeId: instanceId, logs }
    })
  }, [])

  // 清日志：带 id 清指定实例，省略 id 时清当前前台实例
  const clearLogs = useCallback((instanceId) => {
    const target = instanceId || activeIdRef.current
    setState((prev) => {
      const logs = clearLogsBucket(prev.logs, target)
      return logs === prev.logs ? prev : { ...prev, logs }
    })
  }, [])

  const { instances, logs, activeId } = state
  const activeInstance = activeId
    ? instances.find((item) => item.id === activeId) || null
    : null
  const activeLogs = (activeId && logs[activeId]) || EMPTY_LOGS

  const value = {
    instances,
    logs,
    activeId,
    activeInstance,
    activeLogs,
    status: toStatus(activeInstance),
    setActiveInstance,
    clearLogs,
    isAlive,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
