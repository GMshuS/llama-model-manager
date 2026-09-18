import { useDashboard } from '../../store/dashboard'

export default function ChatTest({ status }) {
  const { chatState, setChatState } = useDashboard()
  const { prompt, response, sending } = chatState

  const setPrompt = (v) => setChatState(prev => ({ ...prev, prompt: v }))
  const setSending = (v) => setChatState(prev => ({ ...prev, sending: v }))
  const setResponse = (v) => setChatState(prev => ({ ...prev, response: v }))

  const handleSend = async () => {
    if (!prompt.trim() || sending) return

    setSending(true)
    setResponse('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const data = await res.json()
      if (data.content) setResponse(data.content)
      else setResponse(`Error: ${data.error}`)
    } catch (err) {
      setResponse(`Error: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isRunning = status.state === 'running'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
      <h3 className="text-sm font-medium text-gray-400 mb-3">对话测试</h3>

      <div className="flex-1 min-h-[160px] max-h-[200px] overflow-auto bg-black/50 rounded-lg p-3 mb-3 text-sm whitespace-pre-wrap">
        {!isRunning ? (
          <p className="text-gray-600">请先启动模型服务</p>
        ) : response ? (
          <div>
            <div className="text-cyan-400 mb-1">User: {prompt}</div>
            <div className="text-gray-300">{response}</div>
          </div>
        ) : (
          <p className="text-gray-600">输入消息开始测试</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isRunning || sending}
          placeholder={isRunning ? '输入消息 (Enter 发送)' : '请先启动模型'}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!isRunning || sending}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm transition-colors"
        >
          {sending ? '...' : '发送'}
        </button>
      </div>
    </div>
  )
}
