'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users, MessageCircle, LogOut, Send, Clock, UserPlus, Crown, Circle, Loader2,
  BarChart3, Check, X, ArrowRight,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSSE } from '@/hooks/useSSE'
import { StudyGroup, GroupMemberInfo, TimerState, GroupMessage, ComparisonMember } from '../types'
import { formatTimer, CircularProgressRing } from '../utils'

const BLOCKED_TERMS = ['instagram', 'telegram', 'whatsapp', 'facebook', 'twitter', 'tiktok', 'snapchat', 'discord', 'youtube']

function filterContent(text: string): string {
  let filtered = text
  BLOCKED_TERMS.forEach(term => {
    filtered = filtered.replace(new RegExp(term, 'gi'), '***')
  })
  return filtered
}

function MiniTimerRing({ timerState }: { timerState: TimerState }) {
  const size = 28
  const strokeWidth = 3
  const progress = timerState.total > 0 ? (timerState.remaining / timerState.total) * 100 : 0
  const color = timerState.running ? '#10b981' : timerState.paused ? '#f59e0b' : '#94a474'

  return (
    <CircularProgressRing size={size} strokeWidth={strokeWidth} progress={progress} color={color} trackColor="rgba(100,116,139,0.15)">
      <Clock className="w-2.5 h-2.5 text-emerald-600" />
    </CircularProgressRing>
  )
}

function MemberItem({ member, currentUserId }: { member: { userId: string; name: string; timerState?: TimerState | null }; currentUserId: string }) {
  const isSelf = member.userId === currentUserId
  const isStudying = member.timerState?.running === true
  const isPaused = member.timerState?.paused === true && member.timerState?.running === false

  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
      isSelf ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`}>
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className={`text-xs font-semibold ${
            isSelf
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
          }`}>
            {(member.name || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
          isStudying ? 'bg-emerald-500' : isPaused ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
          {member.name} {isSelf && <span className="text-emerald-600 dark:text-emerald-400">(You)</span>}
        </p>
        <p className={`text-[10px] ${isStudying ? 'text-emerald-600 dark:text-emerald-400 font-medium' : isPaused ? 'text-amber-500' : 'text-slate-400'}`}>
          {isStudying
            ? `Studying · ${formatTimer(member.timerState!.remaining)}`
            : isPaused
            ? `Paused · ${formatTimer(member.timerState!.remaining)}`
            : 'Idle'}
        </p>
      </div>
      {member.timerState && member.timerState.running && (
        <MiniTimerRing timerState={member.timerState} />
      )}
    </div>
  )
}

function ChatMessageBubble({ msg, currentUserId }: { msg: { id: string; userId: string; userName: string; content: string; type: string; timestamp: number | string }; currentUserId: string }) {
  const isSystem = msg.type === 'system'
  const isSelf = msg.userId === currentUserId

  if (isSystem) {
    const isComparisonReq = msg.content === '__comparison_request__'
    const isComparisonAccepted = msg.content === '__comparison_accepted__'
    const isComparisonDeclined = msg.content === '__comparison_declined__'
    if (isComparisonReq || isComparisonAccepted || isComparisonDeclined) return null
    return (
      <div className="flex justify-center py-1">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50">
          {msg.content}
        </span>
      </div>
    )
  }

  const time = typeof msg.timestamp === 'number'
    ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : ''} slide-up`}>
      <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
        <AvatarFallback className={`text-[10px] font-semibold ${
          isSelf
            ? 'bg-emerald-500 text-white'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
        }`}>
          {(msg.userName || 'U').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] ${isSelf ? 'text-right' : ''}`}>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          {isSelf ? (
            <>
              <span className="text-[10px] text-slate-400">{time}</span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">You</span>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{msg.userName}</span>
              <span className="text-[10px] text-slate-400">{time}</span>
            </>
          )}
        </div>
        <div className={`inline-block px-3 py-1.5 rounded-2xl text-sm break-words ${
          isSelf
            ? 'bg-emerald-500 text-white rounded-br-md'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md'
        }`}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}

export function GroupStudyPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [currentGroup, setCurrentGroup] = useState<StudyGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [inRoom, setInRoom] = useState(false)

  // Room state
  const [members, setMembers] = useState<{ userId: string; name: string; timerState?: TimerState | null }[]>([])
  const [messages, setMessages] = useState<{ id: string; userId: string; userName: string; content: string; type: string; timestamp: number | string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [leavingGroup, setLeavingGroup] = useState(false)
  const [showMobileMembers, setShowMobileMembers] = useState(false)

  // Comparison state
  const [comparisonRequesters, setComparisonRequesters] = useState<{ userId: string; userName: string }[]>([])
  const [acceptedForCompare, setAcceptedForCompare] = useState<{ userId: string; userName: string }[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonMember[] | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonSent, setComparisonSent] = useState(false)

  // User info
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerSyncRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // SSE connection
  const channel = inRoom && currentGroup ? `group:${currentGroup.id}` : ''
  const { isConnected } = useSSE({
    channel,
    enabled: inRoom && !!currentGroup,
    onEvent: useCallback((event: string, data: any) => {
      if (event === 'group-history') {
        setMessages(data.messages || [])
      } else if (event === 'group-chat-message') {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev
          return [...prev, data]
        })
      } else if (event === 'group-members') {
        setMembers(data.members || [])
      }
    }, []),
  })

  // Parse system messages for comparison requests
  useEffect(() => {
    if (!messages.length || !currentGroup) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.type !== 'system') return

    if (lastMsg.content === '__comparison_request__' && lastMsg.userId !== userId) {
      const requesterName = lastMsg.userName
      setComparisonRequesters(prev => {
        if (prev.some(r => r.userId === lastMsg.userId)) return prev
        return [...prev, { userId: lastMsg.userId, userName: requesterName }]
      })
    } else if (lastMsg.content === '__comparison_accepted__') {
      setAcceptedForCompare(prev => {
        if (prev.some(a => a.userId === lastMsg.userId)) return prev
        return [...prev, { userId: lastMsg.userId, userName: lastMsg.userName }]
      })
    } else if (lastMsg.content === '__comparison_declined__') {
      setComparisonRequesters(prev => prev.filter(r => r.userId !== lastMsg.userId))
    }
  }, [messages, currentGroup, userId])

  // Get user info
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserId(payload.id || '')
        setUserName(payload.email?.split('@')[0] || payload.fullName || 'Student')
      }
    } catch (e) { /* ignore */ }
  }, [])

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentGroups()
      setGroups(data.groups || [])
      setCurrentGroup(data.currentGroup || null)
    } catch (err) {
      console.error('Groups fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const [joinError, setJoinError] = useState<string | null>(null)

  const handleJoinGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (group && group.memberCount >= group.maxCapacity) {
      setJoinError('This group is full. Please try another group.')
      return
    }
    setJoinLoading(groupId)
    setJoinError(null)
    try {
      await api.studentJoinGroup(groupId)
      await fetchGroups()
    } catch (err: any) {
      console.error('Join group error:', err)
      const msg = err?.message || err?.error || 'Failed to join group'
      setJoinError(typeof msg === 'string' ? msg : 'Failed to join group')
    } finally {
      setJoinLoading(null)
    }
  }

  const handleLeaveGroup = async () => {
    if (!currentGroup) return
    setLeavingGroup(true)
    try {
      await api.studentLeaveGroup(currentGroup.id)
      setCurrentGroup(null)
      setInRoom(false)
      setMessages([])
      setMembers([])
      await fetchGroups()
    } catch (err) {
      console.error('Leave group error:', err)
    } finally {
      setLeavingGroup(false)
    }
  }

  // Enter room
  const enterRoom = useCallback((group: StudyGroup) => {
    setInRoom(true)
    setMessages([])
    setMembers([])
  }, [])

  // Auto-enter room if currentGroup exists
  useEffect(() => {
    if (currentGroup && !inRoom && userId) {
      enterRoom(currentGroup)
    }
  }, [currentGroup, inRoom, userId, enterRoom])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Timer sync
  useEffect(() => {
    if (!currentGroup || !inRoom) return

    const syncTimer = () => {
      try {
        const timerData = localStorage.getItem('pomodoro-timer')
        if (timerData) {
          const parsed = JSON.parse(timerData)
          const timerState: TimerState = {
            running: parsed.running || false,
            paused: parsed.paused || false,
            remaining: parsed.remaining || 0,
            total: parsed.total || 0,
            chapterName: parsed.chapterName || null,
          }
          api.realtimePublish({ action: 'group-timer', groupId: currentGroup.id, timerState }).catch(() => {})
          setMembers(prev => prev.map(m =>
            m.userId === userId ? { ...m, timerState } : m
          ))
        }
      } catch (e) { /* ignore */ }
    }

    syncTimer()
    timerSyncRef.current = setInterval(syncTimer, 5000)

    return () => {
      if (timerSyncRef.current) clearInterval(timerSyncRef.current)
    }
  }, [currentGroup, inRoom, userId])

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentGroup) return

    const filtered = filterContent(chatInput.trim())
    const msgId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const optimisticMsg = {
      id: msgId,
      userId,
      userName,
      content: filtered,
      type: 'text',
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    setChatInput('')

    try {
      await api.realtimePublish({ action: 'group-message', groupId: currentGroup.id, content: filtered })
    } catch (err) {
      console.error('Send message error:', err)
    }

    api.studentSendGroupMessage(currentGroup.id, filtered, 'text').catch(err =>
      console.error('Send message API error:', err)
    )
  }

  const handleRequestComparison = () => {
    if (!currentGroup) return
    setComparisonSent(true)
    setAcceptedForCompare([{ userId, userName }])
    setComparisonData(null)
    api.realtimePublish({ action: 'group-comparison-request', groupId: currentGroup.id }).catch(() => {})
  }

  const handleAcceptComparison = (requesterId: string) => {
    if (!currentGroup) return
    setComparisonRequesters(prev => prev.filter(r => r.userId !== requesterId))
    api.realtimePublish({ action: 'group-comparison-response', groupId: currentGroup.id, accepted: true }).catch(() => {})
    setAcceptedForCompare(prev => {
      if (prev.some(a => a.userId === userId)) return prev
      return [...prev, { userId, userName }]
    })
  }

  const handleDeclineComparison = (requesterId: string) => {
    if (!currentGroup) return
    setComparisonRequesters(prev => prev.filter(r => r.userId !== requesterId))
    api.realtimePublish({ action: 'group-comparison-response', groupId: currentGroup.id, accepted: false }).catch(() => {})
  }

  const handleViewComparison = async () => {
    if (!currentGroup) return
    const acceptedIds = acceptedForCompare.map(a => a.userId)
    if (acceptedIds.length < 2) return
    setComparisonLoading(true)
    try {
      const data = await api.studentGroupCompare(currentGroup.id, acceptedIds)
      setComparisonData(data.members || [])
      setShowComparison(true)
    } catch (err) {
      console.error('Comparison fetch error:', err)
    } finally {
      setComparisonLoading(false)
    }
  }

  const handleCloseComparison = () => {
    setShowComparison(false)
    setComparisonData(null)
    setComparisonSent(false)
    setAcceptedForCompare([])
  }

  const formatMsgTime = (ts: number | string) => {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (!inRoom || !currentGroup) {
    return (
      <div className="space-y-6 page-transition">
        {joinError && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">{joinError}</p>
            <button onClick={() => setJoinError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 ml-3 text-lg font-bold">&times;</button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Group Study</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Study together with peers in real-time</p>
          </div>
        </div>
        {currentGroup && !inRoom && (
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-400" />
            <CardContent className="py-3 sm:py-4 px-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm shrink-0">
                  <Crown className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                    You&apos;re in <span className="font-bold">{currentGroup.name}</span>
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <span>{currentGroup.memberCount}/{currentGroup.maxCapacity} members</span>
                    <span className="text-emerald-300 dark:text-emerald-700">·</span>
                    <span className="flex items-center gap-1">
                      <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                      {isConnected ? 'Connected' : 'Tap to join'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => enterRoom(currentGroup)}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-sm h-9 text-xs sm:text-sm"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" /> Enter Room
              </Button>
            </CardContent>
          </Card>
        )}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-1.5 w-full rounded-none" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-end">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="border-dashed border-slate-200 dark:border-slate-700 col-span-full">
            <CardContent className="py-12 sm:py-16 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 dark:text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1.5">No Study Groups Yet</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
                Study groups will appear here once created by admin. Check back soon to join your peers!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group, idx) => {
              const isFull = group.memberCount >= group.maxCapacity
              const isCurrentGroup = currentGroup?.id === group.id
              return (
                <Card key={group.id} className={`group overflow-hidden border transition-all duration-200 slide-up hover:shadow-md ${
                  isCurrentGroup ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm'
                }`} style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className={`h-1.5 ${isCurrentGroup ? 'bg-gradient-to-r from-emerald-400 to-green-400' : 'bg-gradient-to-r from-emerald-200 to-green-200 dark:from-emerald-800 dark:to-green-800'}`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                          {isCurrentGroup && <Crown className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                          {group.name}
                        </h3>
                        {group.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{group.description}</p>}
                      </div>
                      {isFull && !isCurrentGroup ? (
                        <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 flex-shrink-0">Full</Badge>
                      ) : group.memberCount >= group.maxCapacity * 0.8 && !isCurrentGroup ? (
                        <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex-shrink-0">Almost Full</Badge>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className={`text-[11px] font-medium ${isFull ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {group.memberCount}/{group.maxCapacity} joined
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-slate-300 dark:bg-slate-600' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                          style={{ width: `${Math.min((group.memberCount / group.maxCapacity) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      {isCurrentGroup ? (
                        <Button size="sm" onClick={() => enterRoom(group)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                          <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Go to Room
                        </Button>
                      ) : isFull ? (
                        <Button size="sm" variant="outline" disabled className="h-8 text-xs opacity-50">
                          <Users className="w-3.5 h-3.5 mr-1.5" /> Group Full
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleJoinGroup(group.id)} disabled={joinLoading === group.id} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                          {joinLoading === group.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />} Join
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const studyingMembers = members.filter(m => m.timerState?.running).length

  return (
    <div className="page-transition h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] flex flex-col rounded-xl overflow-hidden border border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-900 shadow-sm relative">
      {/* Room Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-b border-emerald-200 dark:border-emerald-800 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm shrink-0">
              <Users className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">
                  {currentGroup.name}
                </h2>
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                  <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" /> {members.length}/{currentGroup.maxCapacity}
                </Badge>
                {studyingMembers > 0 && (
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                    <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" /> {studyingMembers} studying
                  </Badge>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <Circle className={`w-1.5 h-1.5 ${isConnected ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-400 text-slate-400'}`} />
                {isConnected ? 'Connected' : 'Reconnecting...'}
                {currentGroup.subject && <><span className="hidden sm:inline">·</span><span className="hidden sm:inline">{currentGroup.subject.name}</span></>}
              </p>
            </div>
          </div>
          {members.length > 1 && (
            <Button variant="outline" size="sm" onClick={comparisonSent && acceptedForCompare.length > 1 ? handleViewComparison : handleRequestComparison}
              disabled={comparisonLoading} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3 shrink-0">
              {comparisonLoading ? <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 animate-spin" /> : <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />}
              <span className="hidden sm:inline">{comparisonSent ? 'View Compare' : 'Compare'}</span><span className="sm:hidden">{comparisonSent ? 'View' : 'Cmp'}</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLeaveGroup} disabled={leavingGroup}
            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30 h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3 shrink-0">
            {leavingGroup ? <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 animate-spin" /> : <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />}
            <span className="hidden sm:inline">Leave</span><span className="sm:hidden">Exit</span>
          </Button>
        </div>
      </div>

      {/* Comparison request notifications */}
      {comparisonRequesters.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800 space-y-1.5">
          {comparisonRequesters.map(r => (
            <div key={r.userId} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-indigo-700 dark:text-indigo-300">
                <BarChart3 className="w-3 h-3 inline mr-1" />
                <strong>{r.userName}</strong> wants to compare progress
              </span>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => handleAcceptComparison(r.userId)} className="w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => handleDeclineComparison(r.userId)} className="w-6 h-6 rounded-full bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-white flex items-center justify-center transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison sent status bar */}
      {comparisonSent && acceptedForCompare.length > 0 && !showComparison && (
        <div className="flex-shrink-0 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
              <BarChart3 className="w-3 h-3 inline mr-1" />
              {acceptedForCompare.length}/{members.length} accepted comparison
              {acceptedForCompare.length > 1 && (
                <button onClick={handleViewComparison} className="ml-2 underline font-medium">View now</button>
              )}
            </span>
            <button onClick={() => { setComparisonSent(false); setAcceptedForCompare([]) }} className="text-emerald-400 hover:text-emerald-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/10 order-2 md:order-1">
          <div className="md:hidden">
            <button onClick={() => setShowMobileMembers(prev => !prev)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
              </div>
              <svg className={`w-3.5 h-3.5 text-emerald-500 transition-transform ${showMobileMembers ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMobileMembers && (
              <div className="border-t border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-900">
                <ScrollArea className="max-h-48">
                  <div className="p-2 space-y-0.5">
                    {members.map(m => (<MemberItem key={m.userId} member={m} currentUserId={userId} />))}
                    {members.length === 0 && (
                      <div className="py-4 text-center">
                        <Users className="w-5 h-5 mx-auto text-emerald-300 dark:text-emerald-700 mb-1" />
                        <p className="text-[10px] text-slate-400">No members yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          <div className="hidden md:block h-full">
            <div className="px-3 py-2 border-b border-emerald-100 dark:border-emerald-900/50">
              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Members ({members.length})</p>
            </div>
            <ScrollArea className="h-[calc(100%-36px)]">
              <div className="p-2 space-y-0.5">
                {members.map(m => (<MemberItem key={m.userId} member={m} currentUserId={userId} />))}
                {members.length === 0 && (
                  <div className="py-6 text-center">
                    <Users className="w-6 h-6 mx-auto text-emerald-300 dark:text-emerald-700 mb-1" />
                    <p className="text-[10px] text-slate-400">No members yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0 order-1 md:order-2">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-emerald-400 dark:text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Start the conversation!</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Say hi to your study group members</p>
                </div>
              ) : (
                messages.map(msg => (<ChatMessageBubble key={msg.id} msg={msg} currentUserId={userId} />))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 p-3 border-t border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-900">
            <div className="flex gap-2">
              <Input placeholder={isConnected ? 'Type a message...' : 'Send a message...'} value={chatInput}
                onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                className="flex-1 h-9 text-sm border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500" />
              <Button onClick={sendMessage} disabled={!chatInput.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {!isConnected && <p className="text-[9px] text-amber-500 mt-1">Reconnecting... messages will be sent when online</p>}
            {isConnected && <p className="text-[9px] text-slate-400 mt-1">Press Enter to send · Social media links are filtered</p>}
          </div>
        </div>
      </div>

      {/* Comparison Dashboard Overlay */}
      {showComparison && comparisonData && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Group Progress Comparison</h3>
            </div>
            <button onClick={handleCloseComparison} className="w-7 h-7 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Study Hours', key: 'totalStudyHours' as const, suffix: 'h', color: 'text-emerald-600' },
                  { label: 'Score', key: 'score' as const, suffix: '', color: 'text-amber-600', format: (v: number) => v.toLocaleString() },
                  { label: 'Streak', key: 'currentStreak' as const, suffix: 'd', color: 'text-orange-600' },
                  { label: 'Quiz Accuracy', key: 'quizAccuracy' as const, suffix: '%', color: 'text-blue-600' },
                  { label: 'Sessions (30d)', key: 'sessionsLast30' as const, suffix: '', color: 'text-purple-600' },
                ].map(metric => {
                  const values = comparisonData.map(m => ({
                    id: m.userId, val: typeof m[metric.key] === 'number' ? (m[metric.key] as number) : 0, isRequester: m.isRequester,
                  }))
                  return (
                    <div key={metric.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-2">{metric.label}</p>
                      {values.map(v => (
                        <div key={v.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className={`truncate max-w-[60%] ${v.isRequester ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>{v.isRequester ? 'You' : 'Peer'}</span>
                          <span className={`font-bold ${metric.color}`}>{metric.format ? metric.format(v.val) : v.val}{metric.suffix}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Daily Minutes Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Daily Study (Last 7 Days)</h4>
                {comparisonData[0]?.dailyMinutes.map((day, di) => (
                  <div key={day.date} className="mb-2">
                    <p className="text-[10px] text-slate-400 mb-1">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    {comparisonData.map(m => {
                      const memberDay = m.dailyMinutes.find(d => d.date === day.date)
                      const minutes = memberDay?.minutes || 0
                      const maxMin = Math.max(...comparisonData.map(mm => Math.max(...mm.dailyMinutes.map(d => d.minutes), 1)))
                      const width = Math.max((minutes / maxMin) * 100, 2)
                      return (
                        <div key={m.userId} className="flex items-center gap-2 text-[10px] mb-0.5">
                          <span className={`w-8 text-right ${m.isRequester ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{m.isRequester ? 'You' : 'Peer'}</span>
                          <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${m.isRequester ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-purple-500'}`} style={{ width: `${width}%` }} />
                          </div>
                          <span className="w-10 text-right text-slate-600 dark:text-slate-300">{minutes}m</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Subject Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {comparisonData.map(m => (
                  <div key={m.userId} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className={`text-xs font-semibold mb-3 ${m.isRequester ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}`}>{m.isRequester ? 'Your Subjects' : 'Peer Subjects'}</h4>
                    {m.subjectDistribution.length === 0 ? <p className="text-[10px] text-slate-400">No study data yet</p> : m.subjectDistribution.map(s => {
                      const totalMin = m.subjectDistribution.reduce((sum, ss) => sum + ss.minutes, 0)
                      const pct = totalMin > 0 ? Math.round((s.minutes / totalMin) * 100) : 0
                      return (
                        <div key={s.name} className="flex items-center gap-2 mb-1.5 text-[10px]">
                          <span className="w-20 truncate text-slate-600 dark:text-slate-400">{s.name}</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${m.isRequester ? 'bg-emerald-400' : 'bg-indigo-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-12 text-right text-slate-500">{s.minutes}m</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Achievement & Quiz Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Achievements</h4>
                  {comparisonData.map(m => (
                    <div key={m.userId} className="flex items-center justify-between text-xs py-1">
                      <span className={m.isRequester ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>{m.isRequester ? 'You' : 'Peer'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{m.achievementsUnlocked} / {m.totalAchievements}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Quizzes</h4>
                  {comparisonData.map(m => (
                    <div key={m.userId} className="flex items-center justify-between text-xs py-1">
                      <span className={m.isRequester ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>{m.isRequester ? 'You' : 'Peer'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{m.totalQuizzes} attempts · {m.quizAccuracy}% accuracy</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

function BookOpen2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}
