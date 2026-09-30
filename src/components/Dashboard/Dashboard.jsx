// 「正在运行」多实例面板：Tab 列表完全由服务端实例列表推导（D1），关闭 Tab ≡ 停止实例。
// 只挂载激活 Tab 的面板（D5 配套建议）：天然规避 LogViewer 的 scrollIntoView 作用在隐藏元素上，
// 也避免多个日志面板同时重渲染。
// 关闭 ✕ 的二次确认按 D4 判定：只有存活实例（running / starting）才弹框，
// terminal 态（stopped / error）进程已不存在，直接停止不再打断用户。

import { useState } from 'react'
import { useDashboard } from '../../store/dashboard'
import ServerControl from '../ServerControl/ServerControl'
import LogViewer from '../LogViewer/LogViewer'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'

// 状态点配色与 ServerControl 的状态徽章保持一致
const DOT_CLASS = {
  starting: 'bg-yellow-400 animate-pulse',
  running: 'bg-green-400',
  error: 'bg-red-400',
  stopped: 'bg-gray-400',
}

export default function Dashboard() {
  const {
    instances,
    activeId,
    activeInstance,
    status,
    activeLogs,
    setActiveInstance,
    clearLogs,
    isAlive,
  } = useDashboard()
  const [pendingClose, setPendingClose] = useState(null)

  // 停止请求必须处理 Promise 拒绝：服务端不可达时用户不应面对「点了没反应」
  const handleStop = async (instanceId) => {
    try {
      const res = await fetch('/api/server/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: instanceId || activeId }),
      })
      if (!res.ok) console.error('[dashboard] 停止实例失败:', res.status)
    } catch (err) {
      console.error('[dashboard] 停止实例请求异常:', err?.message)
    }
  }

  // D4：存活实例才二次确认；terminal 态直接停止
  const handleTabClose = (instance) => {
    if (isAlive(instance)) {
      setPendingClose(instance)
      return
    }
    handleStop(instance.id)
  }

  const handleConfirmClose = async () => {
    const target = pendingClose
    setPendingClose(null)
    if (target) await handleStop(target.id)
  }

  // D2：空状态判定是「instances 中无任何条目」，未关闭的 terminal 态也算非空
  if (instances.length === 0 || !activeInstance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center border-2 border-dashed border-gray-800 rounded-xl px-8 py-16">
          <p className="text-gray-400">
            当前无任何模型正在运行，如需运行模型请切换到
            <span className="text-cyan-400">`模型管理`</span>
            菜单进行启动
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">正在运行</h2>

      {/* TabBar：D3 用「模型名 + :端口」区分同名模型的多个实例 */}
      <div className="flex items-end gap-1 border-b border-gray-800 overflow-x-auto">
        {instances.map((instance) => {
          const isActive = instance.id === activeId
          return (
            <div
              key={instance.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-gray-800 border-gray-700 text-cyan-300'
                  : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800/60'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveInstance(instance.id)}
                className="flex items-center gap-2"
                title={instance.modelName}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${DOT_CLASS[instance.state] || DOT_CLASS.stopped}`} />
                <span className="max-w-[160px] truncate">{instance.modelName}</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400">:{instance.port}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabClose(instance)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                title="关闭选项卡（停止该模型）"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {/* 只挂载激活 Tab 的面板 */}
      <div className="mt-4 space-y-4">
        <ServerControl
          instanceId={activeId}
          status={status}
          onStop={handleStop}
        />
        <LogViewer logs={activeLogs} onClear={() => clearLogs(activeId)} />
      </div>

      {pendingClose && (
        <ConfirmDialog
          title="关闭选项卡"
          message={`关闭选项卡将停止模型 ${pendingClose.modelName || '该模型'}，确定吗？`}
          confirmText="确认关闭"
          onConfirm={handleConfirmClose}
          onCancel={() => setPendingClose(null)}
        />
      )}
    </div>
  )
}
