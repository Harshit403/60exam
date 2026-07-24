'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users, MessageCircle, LogOut, Send, Clock, UserPlus, Crown, Circle, Loader2,
  BarChart3, Check, X, ArrowLeft, MoreVertical, ChevronDown, User, Dot,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSSE } from '@/hooks/useSSE'
import { StudyGroup, TimerState, ComparisonMember } from '../types'
import { formatTimer, CircularProgressRing } from '../utils'

const BLOCKED_TERMS = ['instagram', 'telegram', 'whatsapp', 'facebook', 'twitter', 'tiktok', 'snapchat', 'discord', 'youtube']

function filterContent(text: string): string {
  let filtered = text
  BLOCKED_TERMS.forEach(term => { filtered = filtered.replace(new RegExp(term, 'gi'), '***') })
  return filtered
}

function MiniTimerRing({ timerState }: { timerState: TimerState }) {
  const size = 28
  const progress = timerState.total > 0 ? (timerState.remaining / timerState.total) * 100 : 0
  const color = timerState.running ? '#10b981' : timerState.paused ? '#f59e0b' : '#94a474'
  return (
    <CircularProgressRing size={size} strokeWidth={3} progress={progress} color={color} trackColor="rgba(100,116,139,0.15)">
      <Clock className="w-2.5 h-2.5 text-indigo-600" />
    </CircularProgressRing>
  )
}

function MemberItem({ member, currentUserId }: { member: { userId: string; name: string; timerState?: TimerState | null }; currentUserId: string }) {
  const isSelf = member.userId === currentUserId
  const isStudying = member.timerState?.running === true
  const isPaused = member.timerState?.paused === true && member.timerState?.running === false

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
      isSelf ? 'bg-indigo-50/80 dark:bg-indigo-900/20' : 'hover:bg-white/60 dark:hover:bg-slate-800/40'
    }`}>
      <div className="relative flex-shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className={`text-xs font-semibold ${
            isSelf ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
          }`}>
            {(member.name || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-[2.5px] ring-white dark:ring-slate-900 ${
          isStudying ? 'bg-indigo-500' : isPaused ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {member.name} {isSelf && <span className="text-indigo-600 dark:text-indigo-400 text-xs">(You)</span>}
        </p>
        <p className={`text-xs ${isStudying ? 'text-indigo-600 dark:text-indigo-400 font-medium' : isPaused ? 'text-amber-500' : 'text-slate-400'}`}>
          {isStudying ? `Studying · ${formatTimer(member.timerState!.remaining)}` : isPaused ? `Paused · ${formatTimer(member.timerState!.remaining)}` : 'Idle'}
        </p>
      </div>
      {member.timerState?.running && <MiniTimerRing timerState={member.timerState} />}
    </div>
  )
}

function ChatMessageBubble({ msg, currentUserId, showAvatar, showName }: {
  msg: { id: string; userId: string; userName: string; content: string; type: string; timestamp: number | string }
  currentUserId: string
  showAvatar: boolean
  showName: boolean
}) {
  const isSystem = msg.type === 'system'
  const isSelf = msg.userId === currentUserId
  const isHidden = ['__comparison_request__', '__comparison_accepted__', '__comparison_declined__'].includes(msg.content)

  if (isSystem && isHidden) return null
  if (isSystem) return (
    <div className="flex justify-center py-2">
      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 shadow-sm">{msg.content}</span>
    </div>
  )

  const time = new Date(typeof msg.timestamp === 'number' ? msg.timestamp : msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex gap-1.5 px-1 ${isSelf ? 'justify-end' : 'justify-start'} slide-up`}
      style={{ animationDuration: '0.15s' }}>
      {!isSelf && (
        <div className="flex-shrink-0 self-end pb-1">
          {showAvatar ? (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                {(msg.userName || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}
      <div className={`max-w-[80%] sm:max-w-[70%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isSelf && showName && (
          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 ml-1 mb-0.5">{msg.userName}</span>
        )}
        <div className={`relative px-3.5 py-2 text-sm leading-relaxed break-words ${
          isSelf
            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-slate-800 dark:text-slate-200 rounded-xl rounded-tr-sm border border-indigo-100 dark:border-indigo-800/50'
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl rounded-tl-sm border border-slate-200/60 dark:border-slate-700/60'
        }`}>
          {msg.content}
          <span className={`text-[10px] leading-none ml-2 select-none ${
            isSelf ? 'text-slate-500 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {time}
          </span>
        </div>
      </div>
    </div>
  )
}

function DateDivider({ date }: { date: string }) {
  const today = new Date()
  const msgDate = new Date(date)
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24))
  let label: string
  if (diffDays === 0) label = 'Today'
  else if (diffDays === 1) label = 'Yesterday'
  else label = msgDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex justify-center py-2">
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">{label}</span>
    </div>
  )
}

export function GroupStudyPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [currentGroup, setCurrentGroup] = useState<StudyGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [inRoom, setInRoom] = useState(false)

  const [members, setMembers] = useState<{ userId: string; name: string; timerState?: TimerState | null }[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [leavingGroup, setLeavingGroup] = useState(false)

  const [comparisonRequesters, setComparisonRequesters] = useState<{ userId: string; userName: string }[]>([])
  const [acceptedForCompare, setAcceptedForCompare] = useState<{ userId: string; userName: string }[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonMember[] | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonSent, setComparisonSent] = useState(false)
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerSyncRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const channel = inRoom && currentGroup ? `group:${currentGroup.id}` : ''
  const { isConnected } = useSSE({
    channel,
    enabled: inRoom && !!currentGroup,
    onEvent: useCallback((event: string, data: any) => {
      if (event === 'group-history') setMessages(data.messages || [])
      else if (event === 'group-chat-message') {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev
          const optIdx = prev.findIndex(m =>
            typeof m.id === 'string' && m.id.startsWith('opt-') && m.userId === data.userId && m.content === data.content
          )
          if (optIdx >= 0) {
            const next = [...prev]
            next[optIdx] = data
            return next
          }
          return [...prev, data]
        })
      }
      else if (event === 'group-members') setMembers(data.members || [])
    }, []),
  })

  useEffect(() => {
    if (!messages.length || !currentGroup) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.type !== 'system') return
    if (lastMsg.content === '__comparison_request__' && lastMsg.userId !== userId) {
      setComparisonRequesters(prev => prev.some(r => r.userId === lastMsg.userId) ? prev : [...prev, { userId: lastMsg.userId, userName: lastMsg.userName }])
    } else if (lastMsg.content === '__comparison_accepted__') {
      setAcceptedForCompare(prev => prev.some(a => a.userId === lastMsg.userId) ? prev : [...prev, { userId: lastMsg.userId, userName: lastMsg.userName }])
    } else if (lastMsg.content === '__comparison_declined__') {
      setComparisonRequesters(prev => prev.filter(r => r.userId !== lastMsg.userId))
    }
  }, [messages, currentGroup, userId])

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUserId(payload.id || '')
        setUserName(payload.fullName || payload.email?.split('@')[0] || 'Student')
      }
    } catch (e) { /* ignore */ }
  }, [])

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentGroups()
      setGroups(data.groups || [])
      setCurrentGroup(data.currentGroup || null)
    } catch (err) { console.error('Groups fetch error:', err) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const [joinError, setJoinError] = useState<string | null>(null)

  const handleJoinGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (group && group.activeMembers >= group.maxCapacity) { setJoinError('This group is full. Please try another group.'); return }
    setJoinLoading(groupId); setJoinError(null)
    try { await api.studentJoinGroup(groupId); await fetchGroups() } catch (err: any) {
      const msg = err?.message || err?.error || 'Failed to join group'
      setJoinError(typeof msg === 'string' ? msg : 'Failed to join group')
    } finally { setJoinLoading(null) }
  }

  const handleLeaveGroup = async () => {
    if (!currentGroup) return
    setLeavingGroup(true)
    setShowMobileMenu(false)
    try {
      await api.studentLeaveGroup(currentGroup.id)
      setCurrentGroup(null); setInRoom(false); setMessages([]); setMembers([])
      await fetchGroups()
    } catch (err) { console.error('Leave group error:', err) } finally { setLeavingGroup(false) }
  }

  const enterRoom = useCallback((group: StudyGroup) => { setInRoom(true); setMessages([]); setMembers([]); setShowMembersPanel(false); setShowMobileMenu(false) }, [])

  useEffect(() => { if (currentGroup && !inRoom && userId) enterRoom(currentGroup) }, [currentGroup, inRoom, userId, enterRoom])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!currentGroup || !inRoom) return
    const syncTimer = () => {
      try {
        const timerData = localStorage.getItem('mission-cs-pomodoro-state')
        if (timerData) {
          const parsed = JSON.parse(timerData)
          const timerState: TimerState = { running: parsed.timerRunning || false, paused: parsed.timerPaused || false, remaining: parsed.timerSeconds || 0, total: parsed.timerTotalSeconds || 0, chapterName: parsed.chapterName || null }
          api.realtimePublish({ action: 'group-timer', groupId: currentGroup.id, timerState }).catch(() => {})
          setMembers(prev => prev.map(m => m.userId === userId ? { ...m, timerState } : m))
        }
      } catch (e) { /* ignore */ }
    }
    syncTimer()
    timerSyncRef.current = setInterval(syncTimer, 5000)
    return () => { if (timerSyncRef.current) clearInterval(timerSyncRef.current) }
  }, [currentGroup, inRoom, userId])

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentGroup) return
    const filtered = filterContent(chatInput.trim())
    const optId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    setMessages(prev => [...prev, { id: optId, userId, userName, content: filtered, type: 'text', timestamp: Date.now() }])
    setChatInput('')
    try { await api.realtimePublish({ action: 'group-message', groupId: currentGroup.id, content: filtered }) } catch (e) { console.error(e) }
  }

  const handleRequestComparison = () => {
    if (!currentGroup) return
    setComparisonSent(true); setAcceptedForCompare([{ userId, userName }]); setComparisonData(null)
    setShowMobileMenu(false)
    api.realtimePublish({ action: 'group-comparison-request', groupId: currentGroup.id }).catch(() => {})
  }

  const handleAcceptComparison = (requesterId: string) => {
    if (!currentGroup) return
    setComparisonRequesters(prev => prev.filter(r => r.userId !== requesterId))
    api.realtimePublish({ action: 'group-comparison-response', groupId: currentGroup.id, accepted: true }).catch(() => {})
    setAcceptedForCompare(prev => prev.some(a => a.userId === userId) ? prev : [...prev, { userId, userName }])
  }

  const handleDeclineComparison = (requesterId: string) => {
    if (!currentGroup) return
    setComparisonRequesters(prev => prev.filter(r => r.userId !== requesterId))
    api.realtimePublish({ action: 'group-comparison-response', groupId: currentGroup.id, accepted: false }).catch(() => {})
  }

  const handleViewComparison = async () => {
    if (!currentGroup) return
    const ids = acceptedForCompare.map(a => a.userId)
    if (ids.length < 2) return
    setComparisonLoading(true)
    try { const data = await api.studentGroupCompare(currentGroup.id, ids); setComparisonData(data.members || []); setShowComparison(true) } catch (e) { console.error(e) } finally { setComparisonLoading(false) }
  }

  const handleCloseComparison = () => { setShowComparison(false); setComparisonData(null); setComparisonSent(false); setAcceptedForCompare([]) }

  const handleBackToList = () => { setInRoom(false); setCurrentGroup(null); setShowMobileMenu(false); setShowMembersPanel(false) }

  // Group messages by date for dividers
  const getMessageGroups = () => {
    const groups: { date: string; messages: any[] }[] = []
    messages.forEach(msg => {
      const date = new Date(typeof msg.timestamp === 'number' ? msg.timestamp : msg.timestamp).toDateString()
      const last = groups[groups.length - 1]
      if (last && last.date === date) last.messages.push(msg)
      else groups.push({ date, messages: [msg] })
    })
    return groups
  }

  // Filter groups by search
  const filteredGroups = groups.filter(g =>
    !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.subjectName && g.subjectName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const hasActiveGroups = groups.some(g => g.isCurrentUserMember)
  const studyingMembers = members.filter(m => m.timerState?.running).length

  // ─── GROUP LISTING VIEW (WhatsApp-style chat list) ─────────────────────
  if (!inRoom || !currentGroup) {
    return (
      <div className="page-transition max-w-2xl mx-auto">
        {/* Join Error Banner */}
        {joinError && (
          <div className="mx-2 mb-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">{joinError}</p>
            <button onClick={() => setJoinError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 ml-3 text-lg leading-none font-bold">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-2 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 flex items-center justify-center shadow-sm">
            <Users className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Group Study</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Study together with peers in real-time</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-2 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm bg-slate-100 dark:bg-slate-800 rounded-xl border-0 outline-none focus:ring-2 focus:ring-indigo-400/50 placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-1 px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                  <Skeleton className="h-3 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        // Empty state
        ) : groups.length === 0 ? (
          <div className="px-2 pt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-indigo-400 dark:text-indigo-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1.5">No Study Groups Yet</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">Study groups will appear here once created by admin. Check back soon to join your peers!</p>
          </div>
        // Group list
        ) : (
          <div>
            {/* Current membership banner */}
            {hasActiveGroups && (
              <div className="px-2 pb-1">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Your Groups</p>
              </div>
            )}

            {/* Group rows */}
            {filteredGroups.map((group, idx) => {
              const isMember = group.isCurrentUserMember
              return (
                <div
                  key={group.id}
                  className={`flex items-center gap-3 px-3 py-3 mx-2 rounded-xl transition-all duration-150 active:scale-[0.99] cursor-pointer ${
                    isMember
                      ? 'hover:bg-indigo-50/60 dark:hover:bg-indigo-900/15'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onClick={() => isMember ? enterRoom(group) : handleJoinGroup(group.id)}
                >
                  {/* Group Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      isMember
                        ? 'bg-gradient-to-br from-indigo-600 to-blue-600'
                        : 'bg-gradient-to-br from-indigo-500 to-blue-500'
                    }`}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950 ${
                      group.isFull ? 'bg-slate-400' : 'bg-blue-500'
                    }`}>
                      {group.activeMembers}/{group.maxCapacity}
                    </div>
                    {/* Live indicator */}
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3">
                      <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
                      <div className="absolute inset-0 rounded-full bg-red-500" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {isMember && <Crown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {group.isFull && !isMember && (
                          <Badge variant="secondary" className="text-[9px] bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-1.5 py-0 rounded-full">Full</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {group.description || group.subjectName || `${group.activeMembers}/${group.maxCapacity} members`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex -space-x-1.5">
                        {group.members.slice(0, 3).map(m => (
                          <div key={m.studentId} className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[7px] font-bold text-indigo-700 dark:text-indigo-400">
                            {m.studentName.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      {group.subjectName && (
                        <span className="text-[10px] text-slate-400 truncate">{group.subjectName}</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isMember ? (
<Button size="sm" onClick={() => enterRoom(group)}
                         className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white h-8 text-xs px-3 rounded-full shadow-sm">
                        Open
                      </Button>
                    ) : group.isFull ? (
                      <Button size="sm" variant="outline" disabled
                        className="h-8 text-xs px-3 rounded-full opacity-50 border-slate-200 dark:border-slate-700">
                        Full
                      </Button>
                    ) : (
<Button size="sm" onClick={() => handleJoinGroup(group.id)} disabled={joinLoading === group.id}
                         className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs px-3 rounded-full shadow-sm">
                        {joinLoading === group.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* No search results */}
            {searchQuery && filteredGroups.length === 0 && (
              <div className="px-2 pt-6 text-center">
                <p className="text-sm text-slate-400">No groups matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── CHAT ROOM VIEW (WhatsApp-style) ───────────────────────────────────
  return (
    <>
      {/* Mobile overlay for members panel */}
      {showMembersPanel && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowMembersPanel(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-xl flex flex-col slide-in-right"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700">
              <span className="text-sm font-semibold text-white">Members ({members.length})</span>
              <button onClick={() => setShowMembersPanel(false)} className="p-1 text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {members.map(m => (<MemberItem key={m.userId} member={m} currentUserId={userId} />))}
                {members.length === 0 && (
                  <div className="py-8 text-center"><Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" /><p className="text-xs text-slate-400">No members yet</p></div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Mobile menu dropdown */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute inset-0 bg-transparent" />
          <div className="absolute right-2 top-14 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowMembersPanel(true); setShowMobileMenu(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <Users className="w-4 h-4 text-indigo-600" /> Members
            </button>
            {members.length > 1 && (
              <button onClick={() => { setShowMobileMenu(false); comparisonSent && acceptedForCompare.length > 1 ? handleViewComparison() : handleRequestComparison() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> {comparisonSent ? 'View Comparison' : 'Compare Progress'}
              </button>
            )}
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <button onClick={handleLeaveGroup} disabled={leavingGroup}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              {leavingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Leave Group
            </button>
          </div>
        </div>
      )}

      {/* Comparison overlay */}
      {showComparison && comparisonData && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={handleCloseComparison} className="p-1 -ml-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800"><ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Group Progress Comparison</h3>
            </div>
            <button onClick={handleCloseComparison} className="hidden sm:flex w-7 h-7 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Study Hours', key: 'totalStudyHours' as const, suffix: 'h', color: 'text-indigo-600' },
                  { label: 'Score', key: 'score' as const, suffix: '', color: 'text-amber-600', format: (v: number) => v.toLocaleString() },
                  { label: 'Streak', key: 'currentStreak' as const, suffix: 'd', color: 'text-orange-600' },
                  { label: 'Accuracy', key: 'quizAccuracy' as const, suffix: '%', color: 'text-blue-600' },
                  { label: 'Sessions (30d)', key: 'sessionsLast30' as const, suffix: '', color: 'text-purple-600' },
                ].map(metric => {
                  const values = comparisonData.map(m => ({ id: m.userId, val: typeof m[metric.key] === 'number' ? (m[metric.key] as number) : 0, isRequester: m.isRequester }))
                  return (
                    <div key={metric.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-2">{metric.label}</p>
                      {values.map(v => (
                        <div key={v.id} className="flex items-center justify-between text-xs py-0.5">
                          <span className={`truncate max-w-[60%] ${v.isRequester ? 'font-semibold text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>{v.isRequester ? 'You' : 'Peer'}</span>
                          <span className={`font-bold ${metric.color}`}>{metric.format ? metric.format(v.val) : v.val}{metric.suffix}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Daily Study (Last 7 Days)</h4>
                {comparisonData[0]?.dailyMinutes.map((day) => (
                  <div key={day.date} className="mb-2">
                    <p className="text-[10px] text-slate-400 mb-1">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    {comparisonData.map(m => {
                      const minutes = m.dailyMinutes.find(d => d.date === day.date)?.minutes || 0
                      const maxMin = Math.max(...comparisonData.map(mm => Math.max(...mm.dailyMinutes.map(d => d.minutes), 1)))
                      return (
                        <div key={m.userId} className="flex items-center gap-2 text-[10px] mb-0.5">
                          <span className={`w-8 text-right ${m.isRequester ? 'font-semibold text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{m.isRequester ? 'You' : 'Peer'}</span>
                          <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${m.isRequester ? 'bg-gradient-to-r from-indigo-400 to-indigo-500' : 'bg-gradient-to-r from-indigo-400 to-purple-500'}`} style={{ width: `${Math.max((minutes / maxMin) * 100, 2)}%` }} />
                          </div>
                          <span className="w-10 text-right text-slate-600 dark:text-slate-300">{minutes}m</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {comparisonData.map(m => (
                  <div key={m.userId} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <h4 className={`text-xs font-semibold mb-3 ${m.isRequester ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-700 dark:text-indigo-400'}`}>{m.isRequester ? 'Your Subjects' : 'Peer Subjects'}</h4>
                    {m.subjectDistribution.length === 0 ? <p className="text-[10px] text-slate-400">No study data yet</p> : m.subjectDistribution.map(s => {
                      const total = m.subjectDistribution.reduce((sum, ss) => sum + ss.minutes, 0)
                      return (
                        <div key={s.name} className="flex items-center gap-2 mb-1.5 text-[10px]">
                          <span className="w-20 truncate text-slate-600 dark:text-slate-400">{s.name}</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${m.isRequester ? 'bg-indigo-400' : 'bg-indigo-400'}`} style={{ width: `${total > 0 ? Math.round((s.minutes / total) * 100) : 0}%` }} />
                          </div>
                          <span className="w-12 text-right text-slate-500">{s.minutes}m</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Achievements</h4>
                  {comparisonData.map(m => (
                    <div key={m.userId} className="flex items-center justify-between text-xs py-1">
                      <span className={m.isRequester ? 'font-semibold text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}>{m.isRequester ? 'You' : 'Peer'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{m.achievementsUnlocked} / {m.totalAchievements}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Quizzes</h4>
                  {comparisonData.map(m => (
                    <div key={m.userId} className="flex items-center justify-between text-xs py-1">
                      <span className={m.isRequester ? 'font-semibold text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}>{m.isRequester ? 'You' : 'Peer'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{m.totalQuizzes} attempts · {m.quizAccuracy}% accuracy</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Room */}
      <div className="flex flex-col bg-white dark:bg-slate-900 h-full relative">
        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700 text-white px-2 sm:px-4 py-2.5 flex items-center gap-2 shadow-sm z-10">
          {/* Back button (mobile only) */}
          <button onClick={handleBackToList}
            className="md:hidden p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Group avatar */}
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
            {currentGroup.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 ml-1">
            <h2 className="text-sm font-semibold truncate leading-tight">{currentGroup.name}</h2>
            <p className="text-[10px] text-white/70 flex items-center gap-0.5">
              {members.length > 0 ? (
                <>{members.length} member{members.length !== 1 ? 's' : ''}{studyingMembers > 0 && `, ${studyingMembers} studying`}</>
              ) : 'No members'}
              <Dot className="w-3 h-3" />
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-300' : 'bg-amber-300'}`} />
              <span>{isConnected ? 'Online' : 'Connecting...'}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setShowMembersPanel(true)}
              className="hidden md:flex p-2 rounded-full hover:bg-white/10 transition-colors" title="Members">
              <Users className="w-5 h-5" />
            </button>
            {members.length > 1 && (
              <button onClick={comparisonSent && acceptedForCompare.length > 1 ? handleViewComparison : handleRequestComparison}
                disabled={comparisonLoading}
                className="hidden md:flex p-2 rounded-full hover:bg-white/10 transition-colors" title={comparisonSent ? 'View Comparison' : 'Compare Progress'}>
                {comparisonLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
              </button>
            )}
            {/* Mobile menu trigger */}
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-full hover:bg-white/10 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {/* Desktop leave button */}
            <button onClick={handleLeaveGroup} disabled={leavingGroup}
              className="hidden md:flex p-2 rounded-full hover:bg-white/10 transition-colors ml-1" title="Leave Group">
              {leavingGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Comparison notifications */}
        {comparisonRequesters.length > 0 && (
          <div className="flex-shrink-0 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800/50 space-y-1.5">
            {comparisonRequesters.map(r => (
              <div key={r.userId} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-indigo-700 dark:text-indigo-300"><BarChart3 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /><strong>{r.userName}</strong> wants to compare</span>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleAcceptComparison(r.userId)}
                    className="w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-sm transition-colors"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeclineComparison(r.userId)}
                    className="w-7 h-7 rounded-full bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500 text-white flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {comparisonSent && acceptedForCompare.length > 0 && !showComparison && (
          <div className="flex-shrink-0 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                <BarChart3 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />{acceptedForCompare.length}/{members.length} accepted
                {acceptedForCompare.length > 1 && <button onClick={handleViewComparison} className="ml-2 underline font-semibold">View</button>}
              </span>
              <button onClick={() => { setComparisonSent(false); setAcceptedForCompare([]) }} className="text-indigo-400 hover:text-indigo-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}

        {/* ── Messages area ── */}
        <div className="flex-1 min-h-0 flex">
          {/* Members sidebar (desktop) */}
          <div className="hidden md:flex md:w-56 lg:w-64 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Members ({members.length})</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                {members.map(m => (<MemberItem key={m.userId} member={m} currentUserId={userId} />))}
                {members.length === 0 && (
                  <div className="py-6 text-center"><Users className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" /><p className="text-[10px] text-slate-400">No members</p></div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat messages */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
            <ScrollArea className="flex-1">
              <div className="px-2 sm:px-4 py-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-3">
                      <MessageCircle className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Start the conversation!</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Say hi to your study group members</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {getMessageGroups().map(group => (
                      <div key={group.date}>
                        <DateDivider date={group.date} />
                        {group.messages.map((msg, idx) => {
                          const prevMsg = idx > 0 ? group.messages[idx - 1] : null
                          const nextMsg = idx < group.messages.length - 1 ? group.messages[idx + 1] : null
                          const isSelf = msg.userId === userId
                          const showAvatar = !isSelf && (
                            !nextMsg || nextMsg.userId !== msg.userId || nextMsg.type === 'system'
                          )
                          const showName = !isSelf && (
                            !prevMsg || prevMsg.userId !== msg.userId || prevMsg.type === 'system'
                          )
                          return <ChatMessageBubble key={msg.id} msg={msg} currentUserId={userId} showAvatar={showAvatar} showName={showName} />
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Input bar ── */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-800 px-2 sm:px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 rounded-full px-4 py-1.5 shadow-sm border border-slate-200/60 dark:border-slate-600/60">
                  <input
                    ref={inputRef}
                    placeholder={isConnected ? 'Type a message' : 'Message'}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 py-1"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    chatInput.trim()
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm hover:from-indigo-700 hover:to-blue-700'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                  }`}>
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
              {!isConnected && (
                <p className="text-[10px] text-amber-500 text-center mt-1.5">Reconnecting... messages will be sent when online</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
