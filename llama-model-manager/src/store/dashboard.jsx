import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import useWebSocket from '../hooks/useWebSocket'

const DashboardContext = createContext(null)

export function DashboardProvider({ children }) {
  const [status, setStatus] = useState({ state: 'stopped', model: null, params: null, metrics: { tokensPerSecond: 0, pid: null } })
  const [logs, setLogs] = useState([])
  const [chatState, setChatState] = useState({ prompt: '', response: '', sending: false })

  useEffect(() => {
    fetch('/api/server/status').then(r => r.json()).then(data => {
      setStatus(prev => ({ ...prev, ...data, metrics: data.metrics || prev.metrics }))
    })
  }, [])

  const onMessage = useCallback((msg) => {
    switch (msg.event) {
      case 'status':
        setStatus(prev => ({ ...prev, ...msg.data }))
        break
      case 'log':
        setLogs(prev => {
          const next = [...prev, { ...msg.data, ts: Date.now() }]
          return next.length > 1000 ? next.slice(-1000) : next
        })
        break
      case 'metrics':
        setStatus(prev => ({ ...prev, metrics: msg.data }))
        break
    }
  }, [])

  useWebSocket(onMessage)

  return (
    <DashboardContext.Provider value={{ status, logs, chatState, setChatState }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
