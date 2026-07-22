'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Plus, Send, Loader2, Users, Wifi, WifiOff, Circle, Reply } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import { api } from '@/lib/api-client'
import { Discussion } from '../types'

interface LiveMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  userRole: 'student' | 'admin'
  content: string
  timestamp: number
  type: 'message' | 'system' | 'admin-reply'
}

interface OnlineUser {
  id: string
  name: string
  role: 'student' | 'admin'
}

const LIVE_ROOM_ID = 'mission-cs-public'

export function DiscussionPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

  // Live chat state
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([])
  const [liveInput, setLiveInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUsers, setTypingUsers] = useState<OnlineUser[]>([])
  const [showLiveChat, setShowLiveChat] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<any>(null)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student')

  // Extract user info from token
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserName(payload.email?.split('@')[0] || 'Student')
        setUserId(payload.id || 'anon')
        setUserRole(payload.role || 'student')
      }
    } catch (e) { /* ignore */ }
  }, [])

  const fetchDiscussions = useCallback(async () => {
    setLoading(true)
    try { const data = await api.studentDiscussions(); setDiscussions(data.discussions || []) }
    catch (err) { console.error('Discussions fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDiscussions() }, [fetchDiscussions])

  // Connect to WebSocket when live chat is opened
  useEffect(() => {
    if (!showLiveChat) return

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const socket = io(`${origin}/?XTransformPort=3003`, {
      path: '/',
      transports: ['polling', 'websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 15000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setTimeout(() => socket.emit('auth', { userId, name: userName, role: userRole }), 100)
    })

    socket.on('disconnect', (reason) => {
      setIsConnected(false)
      if (reason === 'io server disconnect') socket.connect()
    })
    socket.on('connect_error', () => setIsConnected(false))

    socket.on('auth-ok', () => {
      socket.emit('join-room', { roomId: LIVE_ROOM_ID })
    })

    socket.on('room-history', (data: { messages: LiveMessage[] }) => {
      setLiveMessages(data.messages || [])
    })

    socket.on('new-message', (msg: LiveMessage) => {
      setLiveMessages(prev => [...prev, msg])
    })

    socket.on('user-joined', (data: { user: OnlineUser; message: LiveMessage }) => {
      setLiveMessages(prev => [...prev, data.message])
    })

    socket.on('user-left', (data: { user: OnlineUser; message: LiveMessage }) => {
      setLiveMessages(prev => [...prev, data.message])
    })

    socket.on('room-users', (data: { users: OnlineUser[] }) => {
      setOnlineUsers(data.users || [])
    })

    socket.on('user-typing', (data: { user: OnlineUser; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.id !== data.user.id)
        return data.isTyping ? [...filtered, data.user] : filtered
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [showLiveChat, userId, userName, userRole])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveMessages])

  const handleReply = async (discussionId: string) => {
    if (!replyText.trim()) return
    setReplyLoading(true)
    try {
      await api.studentCreateDiscussion({ title: '', content: replyText, parentReplyId: discussionId })
      setReplyText(''); setReplyId(null); fetchDiscussions()
    } catch (err) { console.error('Reply error:', err) }
    finally { setReplyLoading(false) }
  }

  const handleSubmit = async () => {
    if (!title || !content) return
    setFormLoading(true)
    try {
      await api.studentCreateDiscussion({ title, content })
      setTitle(''); setContent(''); setShowForm(false); fetchDiscussions()
    } catch (err) { console.error('Discussion create error:', err) }
    finally { setFormLoading(false) }
  }

  const sendLiveMessage = () => {
    if (!liveInput.trim()) return

    const content = liveInput.trim()
    const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // Optimistically add message
    const optimisticMsg: LiveMessage = {
      id: optimisticId,
      roomId: LIVE_ROOM_ID,
      userId,
      userName,
      userRole,
      content,
      timestamp: Date.now(),
      type: 'message',
    }
    setLiveMessages(prev => [...prev, optimisticMsg])
    setLiveInput('')

    if (socketRef.current && isConnected) {
      socketRef.current.emit('send-message', { roomId: LIVE_ROOM_ID, content })
      socketRef.current.emit('typing', { roomId: LIVE_ROOM_ID, isTyping: false })
    }
  }

  const handleLiveInputChange = (value: string) => {
    setLiveInput(value)
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing', { roomId: LIVE_ROOM_ID, isTyping: value.length > 0 })
    }

    // Clear typing after 2s of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (socketRef.current && isConnected) {
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', { roomId: LIVE_ROOM_ID, isTyping: false })
      }, 2000)
    }
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHrs / 24)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center shadow-sm">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Discussion</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ask doubts & chat with peers</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowLiveChat(!showLiveChat)} className="min-h-[44px]">
            <Users className="w-4 h-4 mr-2" /> {showLiveChat ? 'Hide Live Chat' : 'Live Chat'}
            {onlineUsers.length > 0 && showLiveChat && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{onlineUsers.length} online</Badge>
            )}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 min-h-[44px]">
            <Plus className="w-4 h-4 mr-2" /> Ask a Doubt
          </Button>
        </div>
      </div>

      {/* Live Chat Panel */}
      {showLiveChat && (
        <Card className="grow-in overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-500" />
                  Live Chat Room
                </CardTitle>
                <Badge variant={isConnected ? 'default' : 'secondary'} className={`text-[10px] ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                  {isConnected ? <><Wifi className="w-2.5 h-2.5 mr-1" /> Connected</> : <><WifiOff className="w-2.5 h-2.5 mr-1" /> Disconnected</>}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {onlineUsers.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400" title={u.name}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${u.role === 'admin' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <span className="text-[10px] text-slate-500">+{onlineUsers.length - 5}</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
              {liveMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                liveMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.type === 'system' ? 'justify-center' : ''}`}>
                    {msg.type === 'system' ? (
                      <span className="text-[10px] text-slate-400 italic px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        {msg.content}
                      </span>
                    ) : (
                      <>
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          msg.userRole === 'admin' ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}>
                          {(msg.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-xs font-medium ${msg.userRole === 'admin' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {msg.userName}
                            </span>
                            {msg.userRole === 'admin' && (
                              <Badge variant="secondary" className="text-[9px] py-0 h-3.5 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Admin</Badge>
                            )}
                            <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{msg.content}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex gap-2 items-center text-xs text-slate-500 italic">
                  <Circle className="w-2 h-2 fill-slate-400 text-slate-400 animate-pulse" />
                  {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* Input */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={liveInput}
                  onChange={(e) => handleLiveInputChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLiveMessage() } }}
                  className="flex-1"
                />
                <Button
                  onClick={sendLiveMessage}
                  disabled={!liveInput.trim()}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {!isConnected && (
                <p className="text-[10px] text-amber-500 mt-1.5">Reconnecting... messages will be sent when online</p>
              )}
              {isConnected && (
                <p className="text-[10px] text-slate-400 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <div className="grow-in">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input placeholder="What's your doubt about?" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Details</Label>
                <Textarea placeholder="Describe your doubt in detail..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={!title || !content || formLoading}
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900">
                  {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Post Doubt
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : discussions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No doubts posted yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Click &quot;Ask a Doubt&quot; to get help</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {discussions.map(d => (
            <Card key={d.id} className="card-hover overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{d.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-[8px] font-bold text-white">
                        {(d.student?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{d.student?.name || 'Unknown'}</span>
                      <span className="text-xs text-slate-400">{timeAgo(d.createdAt)}</span>
                    </div>
                  </div>
                  {d.replies && d.replies.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400">
                      <MessageCircle className="w-2.5 h-2.5 mr-1" /> {d.replies.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-slate-700 dark:text-slate-300">{d.content}</p>
                {/* Replies */}
                <div className="mt-4 space-y-3">
                  {d.replies && d.replies.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Replies ({d.replies.length})
                      </p>
                      {d.replies.map(r => (
                        <div key={r.id} className="ml-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-l-4 border-l-slate-300 dark:border-l-slate-700">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-slate-500">
                              {(r.student?.name || 'R').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {r.student?.name || 'Student'}
                            </span>
                            <span className="text-[10px] text-slate-400">{timeAgo(r.createdAt)}</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{r.content}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                {/* Reply Input */}
                <div className="mt-4">
                  {replyId === d.id ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(d.id) } }}
                        className="flex-1 text-sm"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleReply(d.id)} disabled={!replyText.trim() || replyLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {replyLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReplyId(null); setReplyText('') }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setReplyId(d.id)}
                      className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-xs">
                      <Reply className="size-3.5 mr-1.5" /> Reply
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
