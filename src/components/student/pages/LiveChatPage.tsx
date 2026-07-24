'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Loader2, Users, Wifi, WifiOff, Dot } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSSE } from '@/hooks/useSSE'

interface LiveMessage {
  id: string; roomId: string; userId: string; userName: string
  userRole: 'student' | 'admin'; content: string; timestamp: number
  type: 'message' | 'system' | 'admin-reply'
}

interface OnlineUser {
  id: string; name: string; role: 'student' | 'admin'
}

const LIVE_ROOM_ID = 'mission-cs-public'

function LiveMessageBubble({ msg, currentUserId }: { msg: LiveMessage; currentUserId: string }) {
  const isSystem = msg.type === 'system'
  const isSelf = msg.userId === currentUserId
  const isAdmin = msg.userRole === 'admin'
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (isSystem) return (
    <div className="flex justify-center py-1.5">
      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-4 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60">{msg.content}</span>
    </div>
  )

  return (
    <div className={`flex gap-2 px-1 ${isSelf ? 'justify-end' : 'justify-start'} slide-up`} style={{ animationDuration: '0.15s' }}>
      {!isSelf && (
        <div className="flex-shrink-0 self-end pb-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className={`text-xs font-semibold ${isAdmin ? 'bg-rose-500 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
              {(msg.userName || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      <div className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
        {!isSelf && (
          <div className="flex items-center gap-1.5 ml-1 mb-0.5">
            <span className={`text-[11px] font-medium ${isAdmin ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{msg.userName}</span>
            {isAdmin && <Badge variant="secondary" className="text-[9px] py-0 h-3.5 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-0">Admin</Badge>}
          </div>
        )}
        <div className={`relative px-3.5 py-2 text-sm leading-relaxed break-words shadow-sm ${
          isSelf
            ? 'bg-[#d9fdd3] dark:bg-emerald-700/70 text-slate-800 dark:text-white rounded-[18px] rounded-br-[4px]'
            : `bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-[18px] rounded-bl-[4px] border border-slate-200/50 dark:border-slate-700/50`
        }`}>
          {msg.content}
          <span className="text-[10px] leading-none ml-2 select-none text-slate-400 dark:text-slate-500">{time}</span>
        </div>
      </div>
    </div>
  )
}

export function LiveChatPage() {
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([])
  const [liveInput, setLiveInput] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student')

  const { isConnected } = useSSE({
    channel: `room:${LIVE_ROOM_ID}`,
    enabled: true,
    onEvent: useCallback((event: string, data: any) => {
      if (event === 'room-history') {
        setLiveMessages(data.messages || [])
      } else if (event === 'new-message') {
        setLiveMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
      }
    }, []),
  })

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserName(payload.fullName || payload.email?.split('@')[0] || 'Student')
        setUserId(payload.id || 'anon')
        setUserRole(payload.role || 'student')
      }
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [liveMessages])

  const sendLiveMessage = async () => {
    if (!liveInput.trim()) return
    const content = liveInput.trim()
    const optId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const optimisticMsg: LiveMessage = {
      id: optId, roomId: LIVE_ROOM_ID, userId, userName, userRole,
      content, timestamp: Date.now(), type: 'message',
    }
    setLiveMessages(prev => [...prev, optimisticMsg])
    setLiveInput('')
    try {
      await api.realtimePublish({ action: 'room-message', roomId: LIVE_ROOM_ID, content })
    } catch (err) { console.error('Send error:', err) }
  }

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm h-[calc(100dvh-12rem)] md:h-[calc(100dvh-14rem)]">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-cyan-500 to-sky-500 dark:from-cyan-600 dark:to-sky-700 text-white px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">Live Chat Room</h2>
          <p className="text-[10px] text-white/70 flex items-center gap-0.5">
            <span>{onlineUsers.length > 0 ? `${onlineUsers.length} online` : 'Public room'}</span>
            <Dot className="w-3 h-3" />
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-300' : 'bg-amber-300'}`} />
            <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onlineUsers.slice(0, 4).map(u => (
            <div key={u.id} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white/30" title={u.name}>
              {(u.name || 'U').charAt(0).toUpperCase()}
            </div>
          ))}
          {onlineUsers.length > 4 && (
            <span className="text-[10px] text-white/70 ml-0.5">+{onlineUsers.length - 4}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 bg-[#e5ddd5] dark:bg-[#0b141a]">
        <ScrollArea className="h-full">
          <div className="px-3 py-3">
            {liveMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-white/30 dark:bg-white/10 flex items-center justify-center mb-3">
                  <MessageCircle className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">No messages yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Start the conversation with your peers!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {liveMessages.map(msg => <LiveMessageBubble key={msg.id} msg={msg} currentUserId={userId} />)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-[#f0f2f5] dark:bg-slate-800 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 rounded-full px-4 py-1.5 shadow-sm border border-slate-200/60 dark:border-slate-600/60">
            <input
              placeholder="Type a message"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLiveMessage() } }}
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 py-1"
            />
          </div>
          <button
            onClick={sendLiveMessage}
            disabled={!liveInput.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              liveInput.trim()
                ? 'bg-cyan-600 dark:bg-sky-600 text-white shadow-sm hover:bg-cyan-700 dark:hover:bg-sky-700'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
            }`}>
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>
        {!isConnected && (
          <p className="text-[10px] text-amber-500 text-center mt-1.5">Reconnecting...</p>
        )}
      </div>
    </div>
  )
}
