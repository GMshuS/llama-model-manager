export default function PerformanceMetrics({ metrics, state }) {
  if (state !== 'running') {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-center text-gray-600 text-sm">
        服务未运行
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">性能指标</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Tokens/s</span>
            <span className="text-cyan-400 font-mono">{metrics?.tokensPerSecond?.toFixed(1) || '-'}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((metrics?.tokensPerSecond || 0) / 100 * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">PID</span>
          <span className="font-mono">{metrics?.pid || '-'}</span>
        </div>
      </div>
    </div>
  )
}
