import { useState } from 'react'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'

const STATE_MAP = {
  stopped: { label: '已停止', color: 'bg-gray-600', dot: 'bg-gray-400' },
  starting: { label: '启动中...', color: 'bg-yellow-600', dot: 'bg-yellow-400 animate-pulse' },
  running: { label: '运行中', color: 'bg-green-600', dot: 'bg-green-400' },
  error: { label: '错误', color: 'bg-red-600', dot: 'bg-red-400' },
}

const DEFAULT_PORT = 8880

export default function ServerControl({ instanceId, status, onStop, externalProcesses }) {
  // 两条确认链路必须保持独立：① 外部进程终止（原行为）② 停止本实例（本轮新增）
  const [confirmKill, setConfirmKill] = useState(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const s = STATE_MAP[status.state] || STATE_MAP.stopped
  const modelName = status.modelName || status.model || ''
  const port = status.port || status.params?.port || DEFAULT_PORT

  const handleStopClick = () => {
    if (externalProcesses && externalProcesses.length > 0) {
      setConfirmKill(externalProcesses)
      return
    }
    setConfirmStop(true)
  }

  const handleConfirmStop = async () => {
    setConfirmStop(false)
    await onStop(instanceId)
  }

  const handleConfirmKill = async () => {
    await onStop(instanceId)
    setConfirmKill(null)
  }

  const handleTest = () => {
    window.open(`http://localhost:${port}/`, '_blank')
  }

  const handleCopyModelName = () => {
    if (modelName) {
      navigator.clipboard.writeText(modelName).then(() => {
        alert('模型名称已复制到剪贴板')
      }).catch(err => {
        console.error('复制失败:', err)
      })
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`inline-block w-3 h-3 rounded-full ${s.dot}`} />
          <span className={`px-2 py-0.5 text-xs rounded ${s.color}`}>{s.label}</span>
          {modelName && (
            <>
              <span className="text-sm text-gray-300">{modelName}</span>
              {status.state === 'running' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleTest}
                    className="px-2 py-0.5 text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-800/50 rounded hover:bg-cyan-600/30 transition-colors"
                  >
                    测试
                  </button>
                  <button
                    onClick={handleCopyModelName}
                    className="px-2 py-0.5 text-xs bg-gray-600/20 text-gray-400 border border-gray-800/50 rounded hover:bg-gray-600/30 transition-colors"
                  >
                    复制模型名称
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {status.state === 'running' && (
          <button
            onClick={handleStopClick}
            className="px-4 py-1.5 bg-red-600/20 text-red-400 border border-red-800/50 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
          >
            停止
          </button>
        )}
      </div>

      {status.state === 'running' && status.commandLine && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
            <span>Port: {port}</span>
            <span>PID: {status.metrics?.pid || '-'}</span>
          </div>
          <div className="text-xs text-gray-400 mb-1">完整启动命令</div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="font-mono text-xs text-gray-300 break-all">
              {status.commandLine}
            </div>
          </div>
        </div>
      )}

      {confirmStop && (
        <ConfirmDialog
          title="停止模型"
          message={modelName ? `确定停止模型 ${modelName} 吗？` : '确定停止该模型吗？'}
          confirmText="确认停止"
          onConfirm={handleConfirmStop}
          onCancel={() => setConfirmStop(false)}
        />
      )}

      {confirmKill && (
        <ConfirmDialog
          title="终止外部进程"
          message="检测到外部启动的进程，确认终止？"
          confirmText="确认终止"
          onConfirm={handleConfirmKill}
          onCancel={() => setConfirmKill(null)}
        />
      )}
    </div>
  )
}
