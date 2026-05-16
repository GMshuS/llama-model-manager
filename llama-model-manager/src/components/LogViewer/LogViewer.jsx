import { useEffect, useRef } from 'react'

export default function LogViewer({ logs }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">实时日志</h3>
      <div className="h-64 overflow-auto bg-black/50 rounded-lg p-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-gray-600">等待日志输出...</p>
        ) : (
          logs.map((log, i) => {
            const time = new Date(log.ts).toLocaleTimeString()
            const color = log.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'
            return (
              <div key={i} className={color}>
                <span className="text-gray-600">[{time}] </span>
                {log.text}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
