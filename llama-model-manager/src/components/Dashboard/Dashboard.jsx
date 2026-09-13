import { useState } from 'react'
import { useDashboard } from '../../store/dashboard'
import ServerControl from '../ServerControl/ServerControl'
import LogViewer from '../LogViewer/LogViewer'

export default function Dashboard() {
  const { status, logs, clearLogs } = useDashboard()
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

      <div className="mb-6">
        <ServerControl status={status} onStop={handleStop} onScan={handleScan} externalProcesses={externalProcesses} />
      </div>

      <div className="mb-6">
        <LogViewer logs={logs} onClear={clearLogs} />
      </div>
    </div>
  )
}
