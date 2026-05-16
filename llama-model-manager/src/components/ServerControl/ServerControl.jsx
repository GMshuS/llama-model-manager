import { useState } from 'react'

const STATE_MAP = {
  stopped: { label: '已停止', color: 'bg-gray-600', dot: 'bg-gray-400' },
  starting: { label: '启动中...', color: 'bg-yellow-600', dot: 'bg-yellow-400 animate-pulse' },
  running: { label: '运行中', color: 'bg-green-600', dot: 'bg-green-400' },
  error: { label: '错误', color: 'bg-red-600', dot: 'bg-red-400' },
}

export default function ServerControl({ status, onStop, onScan, externalProcesses }) {
  const [confirmKill, setConfirmKill] = useState(null)
  const s = STATE_MAP[status.state] || STATE_MAP.stopped

  const handleStop = () => {
    if (externalProcesses && externalProcesses.length > 0) {
      setConfirmKill(externalProcesses)
    } else {
      onStop()
    }
  }

  const handleConfirmKill = async () => {
    await onStop()
    setConfirmKill(null)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`inline-block w-3 h-3 rounded-full ${s.dot}`} />
          <span className={`px-2 py-0.5 text-xs rounded ${s.color}`}>{s.label}</span>
          {status.model && (
            <span className="text-sm text-gray-300">{status.model}</span>
          )}
        </div>
        {status.state === 'running' && (
          <button
            onClick={handleStop}
            className="px-4 py-1.5 bg-red-600/20 text-red-400 border border-red-800/50 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
          >
            停止
          </button>
        )}
      </div>

      {status.state === 'running' && status.params && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Port: {status.params.port || 8880}</span>
          <span>PID: {status.metrics?.pid || '-'}</span>
        </div>
      )}

      {confirmKill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-sm">
            <p className="mb-4">检测到外部启动的进程，确认终止？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmKill(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
              <button onClick={handleConfirmKill} className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-500">确认终止</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
