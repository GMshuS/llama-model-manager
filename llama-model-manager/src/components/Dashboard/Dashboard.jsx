import { useState } from 'react'
import { useDashboard } from '../../store/dashboard'
import ServerControl from '../ServerControl/ServerControl'
import PerformanceMetrics from '../PerformanceMetrics/PerformanceMetrics'
import LogViewer from '../LogViewer/LogViewer'
import ChatTest from '../ChatTest/ChatTest'

export default function Dashboard() {
  const { status, logs } = useDashboard()
  const [externalProcesses, setExternalProcesses] = useState([])

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
