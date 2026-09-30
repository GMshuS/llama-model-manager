// 通用二次确认弹框：Tab 的 ✕ 关闭与 ServerControl 的停止/终止链路共用，避免两套样式。
// props: title / message / confirmText / cancelText / danger / onConfirm / onCancel

export default function ConfirmDialog({
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = true,
  onConfirm,
  onCancel,
}) {
  const confirmClass = danger
    ? 'px-4 py-2 bg-red-600 rounded-lg text-sm text-white hover:bg-red-500 transition-colors'
    : 'px-4 py-2 bg-cyan-600 rounded-lg text-sm text-white hover:bg-cyan-500 transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>}
        <div className="mb-4 text-sm text-gray-300">{message}</div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
