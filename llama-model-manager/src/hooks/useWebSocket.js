import { useEffect, useRef, useCallback } from 'react'

export default function useWebSocket(onMessage) {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const port = window.electronAPI?.serverPort || 3001
    const host = window.location.hostname || 'localhost'
    const url = `ws://${host}:${port}/ws`

    const ws = new WebSocket(url)
    wsRef.current = ws
    let closed = false

    ws.onopen = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onMessage(msg)
      } catch { }
    }

    ws.onclose = () => {
      if (closed) return
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.close = (() => {
      const orig = ws.close.bind(ws)
      return (...args) => {
        closed = true
        orig(...args)
      }
    })()
  }, [onMessage])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])
}
