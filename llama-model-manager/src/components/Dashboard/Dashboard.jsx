import { useState, useEffect, useCallback } from 'react'
import useWebSocket from '../../hooks/useWebSocket'
import ServerControl from '../ServerControl/ServerControl'
import PerformanceMetrics from '../PerformanceMetrics/PerformanceMetrics'
import LogViewer from '../LogViewer/LogViewer'
import ChatTest from '../ChatTest/ChatTest'

export default function Dashboard() {
  const [status, setStatus] = useState({ state: 'stopped', model: null, params: null, metrics: { tokensPerSecond: 0, pid: null } })
  const [logs, setLogs] = useState([])
  const [externalProcesses, setExternalProcesses] = useState([])

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

  const handleStop = async () => {
    await fetch('/api/server/stop', { method: 'POST' })
  }

  const handleScan = async () => {
    const res = await fetch('/api/server/scan')
    setExternalProcesses(await res.json())
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">仪表盘</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <ServerControl status={status} onStop={handleStop} onScan={handleScan} externalProcesses={externalProcesses} />
        </div>
        <PerformanceMetrics metrics={status.metrics} state={status.state} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <LogViewer logs={logs} />
        <ChatTest status={status} />
      </div>
    </div>
  )
}
