'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface SSEOptions {
  channel: string
  onEvent?: (event: string, data: any) => void
  enabled?: boolean
}

export function useSSE({ channel, onEvent, enabled = true }: SSEOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelayRef = useRef(1000)

  const connect = useCallback(() => {
    if (!enabled) return

    const token = localStorage.getItem('token')
    const url = `/api/realtime/subscribe?channel=${encodeURIComponent(channel)}${token ? `&token=${encodeURIComponent(token)}` : ''}`

    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setIsConnected(true)
      retryDelayRef.current = 1000
    }

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onEvent?.('message', data)
      } catch { /* ignore non-JSON */ }
    }

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent?.('message', data)
      } catch { /* ignore */ }
    })

    const customHandler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        onEvent?.(e.type, data)
      } catch { /* ignore */ }
    }

    const eventTypes = ['room-history', 'new-message', 'user-joined', 'user-left', 'room-users',
      'group-history', 'group-chat-message', 'group-members', 'group-user-joined', 'group-user-left',
      'group-member-timer', 'group-comparison-requested', 'group-comparison-accepted', 'group-comparison-declined',
      'admin-notification', 'timer-state',
      'droom-state', 'vroom-state', 'signal', 'refresh', 'user-removed', 'vroom-removed']
    for (const et of eventTypes) {
      es.addEventListener(et, customHandler)
    }

    es.onerror = () => {
      setIsConnected(false)
      es.close()
      esRef.current = null
      const delay = Math.min(retryDelayRef.current, 30000)
      retryDelayRef.current = delay * 2
      reconnectTimerRef.current = setTimeout(connect, delay)
    }
  }, [channel, onEvent, enabled])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      setIsConnected(false)
    }
  }, [connect])

  return { isConnected }
}
