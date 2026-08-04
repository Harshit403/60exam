'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users, MessageCircle, LogOut, Send, Clock, UserPlus, Crown, Circle, Loader2,
  BarChart3, Check, X, ArrowLeft, MoreVertical, ChevronDown, User, Dot, Eye, EyeOff, Play,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSSE } from '@/hooks/useSSE'
import { StudyGroup, TimerState, ComparisonMember } from '../types'
import { formatTimer, CircularProgressRing } from '../utils'

const BLOCKED_TERMS = ['instagram', 'telegram', 'whatsapp', 'facebook', 'twitter', 'tiktok', 'snapchat', 'discord', 'youtube']

const MALE_NAMES = [
  'Tom Hanks', 'Leonardo DiCaprio', 'Brad Pitt', 'Will Smith', 'Morgan Freeman',
  'Denzel Washington', 'Chris Evans', 'John F. Kennedy', 'Martin Luther King', 'Elon Musk',
]
const FEMALE_NAMES = [
  'Meryl Streep', 'Scarlett Johansson', 'Taylor Swift', 'Beyoncé', 'Oprah Winfrey',
  'Marilyn Monroe', 'Michelle Obama', 'Serena Williams', 'Amelia Earhart', 'Jennifer Lawrence',
]
const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500',
  'bg-violet-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500', 'bg-fuchsia-500',
  'bg-sky-500', 'bg-yellow-500', 'bg-slate-500', 'bg-stone-500', 'bg-zinc-500',
]

function getRandomName(gender: 'male' | 'female'): { name: string; color: string } {
  const list = gender === 'male' ? MALE_NAMES : FEMALE_NAMES
  const full = list[Math.floor(Math.random() * list.length)]
  const name = full.split(' ')[0]
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  return { name, color }
}

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

function MemberItem({ member, currentUserId }: { member: { userId: string; name: string; timerState?: TimerState | null; lastAchievement?: string | null }; currentUserId: string }) {
  const isSelf = member.userId === currentUserId
  const ts = member.timerState
  const isStudying = ts?.running === true
  const isPaused = ts?.paused === true && ts?.running === false
  const isOnBreak = ts?.phase === 'break' && isStudying

  const statusText = isStudying
    ? (isOnBreak ? `Break · ${formatTimer(ts!.remaining)}` : ts?.subjectName
        ? `${ts.subjectName} · ${formatTimer(ts!.remaining)}`
        : `Studying · ${formatTimer(ts!.remaining)}`)
    : isPaused
      ? `Paused · ${formatTimer(ts!.remaining)}`
      : 'Idle'

  const dotColor = isStudying
    ? (isOnBreak ? 'bg-amber-400' : 'bg-emerald-500')
    : isPaused ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
      isSelf ? 'bg-indigo-50/80 dark:bg-indigo-900/20 shadow-sm' : 'hover:bg-white/80 dark:hover:bg-slate-800/40'
    }`}>
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-700 shadow-sm">
          <AvatarFallback className={`text-xs font-bold ${
            isSelf ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
          }`}>
            {(member.name || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-[3px] ring-white dark:ring-slate-800 ${dotColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {member.name} {isSelf && <span className="text-indigo-600 dark:text-indigo-400 text-xs">(You)</span>}
          {!isSelf && member.lastAchievement && (
            <span title={`Last achievement: ${member.lastAchievement}`}
              className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[8px] font-medium align-middle">
              <Crown className="w-2.5 h-2.5" />
            </span>
          )}
        </p>
        <p className={`text-xs ${isStudying ? 'text-indigo-600 dark:text-indigo-400 font-medium' : isPaused ? 'text-amber-500' : 'text-slate-400'}`}>
          {statusText}
        </p>
        {ts?.phaseLabel && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{ts.phaseLabel}</p>
        )}
      </div>
      {ts?.running && <MiniTimerRing timerState={ts} />}
    </div>
  )
}

function ChatMessageBubble({ msg, currentUserId, showAvatar, showName, showAchievement }: {
  msg: any
  currentUserId: string
  showAvatar: boolean
  showName: boolean
  showAchievement: boolean
}) {
  const isSystem = msg.type === 'system'
  const isSelf = msg.userId === currentUserId
  const isHidden = ['__comparison_request__', '__comparison_accepted__', '__comparison_declined__'].includes(msg.content)

  if (isSystem && isHidden) return null
  if (isSystem) return (
    <div className="flex justify-center py-2.5">
      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-4 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border border-slate-200/40 dark:border-slate-700/40">{msg.content}</span>
    </div>
  )

  const time = new Date(typeof msg.timestamp === 'number' ? msg.timestamp : msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex gap-2 px-1 ${isSelf ? 'justify-end' : 'justify-start'} animate-in`}
      style={{ animationDuration: '0.15s' }}>
      {!isSelf && (
        <div className="flex-shrink-0 self-end pb-0.5">
          {showAvatar ? (
            <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-800 shadow-sm">
              <AvatarFallback className={`text-xs font-semibold ${
                msg.gender === 'male'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  : msg.gender === 'female'
                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400'
                  : 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white'
              }`}>
                {msg.gender === 'male' ? '♂' : msg.gender === 'female' ? '♀' : (msg.userName || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}
      <div className={`max-w-[80%] sm:max-w-[70%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isSelf && showName && (
          <div className="flex items-center gap-1.5 ml-1 mb-0.5 min-h-[14px]">
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{msg.userName}</span>
            {msg.anonymous ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 text-[8px] font-medium uppercase tracking-wide">
                <EyeOff className="w-2.5 h-2.5" /> Anonymous
              </span>
            ) : showAchievement && msg.lastAchievement ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[8px] font-medium">
                <Crown className="w-2.5 h-2.5" /> {msg.lastAchievement}
              </span>
            ) : null}
          </div>
        )}
        <div className={`relative px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm ${
          isSelf
            ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-sm border border-slate-200/60 dark:border-slate-700/60'
        }`}>
          {msg.content}
          <span className={`text-[10px] leading-none ml-2 select-none ${
            isSelf ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {time}
          </span>
          {msg.disappearAfter && (
            <span className={`inline-block ml-1 ${isSelf ? 'text-white/60' : 'text-slate-400'}`} title={
              msg.disappearAfter === 'view_once' ? 'View once' :
              msg.disappearAfter === '30m' ? 'Disappears in 30 min' :
              msg.disappearAfter === '24h' ? 'Disappears in 24h' : ''
            }>
              <Clock className="w-2.5 h-2.5 inline" />
            </span>
          )}
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
    <div className="flex justify-center py-3">
      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-slate-200/40 dark:border-slate-700/40">{label}</span>
    </div>
  )
}

export function GroupStudyPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [currentGroup, setCurrentGroup] = useState<StudyGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [inRoom, setInRoom] = useState(false)

  const [members, setMembers] = useState<{ userId: string; name: string; timerState?: TimerState | null; lastAchievement?: string | null }[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [pomodoroRunning, setPomodoroRunning] = useState(false)
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

  const [anonymousMode, setAnonymousMode] = useState(false)
  const [anonymousGender, setAnonymousGender] = useState<'male' | 'female' | null>(null)
  const [anonymousName, setAnonymousName] = useState('')
  const [anonymousColor, setAnonymousColor] = useState('bg-indigo-500')
  const [showGenderPicker, setShowGenderPicker] = useState(false)

  const [disappearTimer, setDisappearTimer] = useState<string | null>(null)
  const [showDisappearPicker, setShowDisappearPicker] = useState(false)

  const [showStudyStarter, setShowStudyStarter] = useState(false)
  const [studySubjects, setStudySubjects] = useState<{ id: string; name: string; chapters: { id: string; name: string }[] }[]>([])
  const [selectedSubj, setSelectedSubj] = useState('')
  const [selectedChap, setSelectedChap] = useState('')
  const [studyMinutes, setStudyMinutes] = useState(30)

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
        const rawName = payload.fullName || payload.email?.split('@')[0] || 'Student'
        setUserName(rawName.split(' ')[0])
      }
    } catch (e) { /* ignore */ }
  }, [])

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentGroups()
      setGroups(data.groups || [])
      const joined = data.currentGroup || null
      setCurrentGroup(joined)
      if (joined) {
        // Already in a group: skip the listing entirely and enter the room
        setInRoom(true)
        setMessages([])
        setMembers([])
        api.studentMarkGroupRead(joined.id).catch(() => {})
      }
    } catch (err) { console.error('Groups fetch error:', err) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const [joinError, setJoinError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

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

  const enterRoom = useCallback((group: StudyGroup) => {
    setInRoom(true); setMessages([]); setMembers([]); setShowMembersPanel(false); setShowMobileMenu(false)
    // Mark messages as read
    api.studentMarkGroupRead(group.id).catch(() => {})
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, unreadCount: 0 } : g))
  }, [])

  useEffect(() => { if (currentGroup && !inRoom && userId) enterRoom(currentGroup) }, [currentGroup, inRoom, userId, enterRoom])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!currentGroup || !inRoom) return
    const syncTimer = () => {
      try {
        const timerData = localStorage.getItem('mission-cs-pomodoro-state')
        if (timerData) {
          const parsed = JSON.parse(timerData)
          const timerState: TimerState = {
            running: parsed.timerRunning || false,
            paused: parsed.timerPaused || false,
            remaining: parsed.timerSeconds || 0,
            total: parsed.timerTotalSeconds || 0,
            chapterName: parsed.chapterName || null,
            subjectName: parsed.subjectName || null,
            phase: parsed.timerRunning && !parsed.timerPaused ? 'work' : null,
            phaseLabel: parsed.timerRunning && !parsed.timerPaused ? 'Focus' : null,
          }
          api.realtimePublish({ action: 'group-timer', groupId: currentGroup.id, timerState, timerStartedAt: parsed.timerStartedAt || null }).catch(() => {})
          setMembers(prev => prev.map(m => m.userId === userId ? { ...m, timerState } : m))
          setPomodoroRunning(parsed.timerRunning && !parsed.timerPaused)
        }
      } catch (e) { /* ignore */ }
    }
    syncTimer()
    timerSyncRef.current = setInterval(syncTimer, 5000)
    return () => { if (timerSyncRef.current) clearInterval(timerSyncRef.current) }
  }, [currentGroup, inRoom, userId])

  const sendMessage = async () => {
    const text = chatInput.trim()
    if (!text || !currentGroup) return

    // Students cannot chat while their active Pomodoro focus session is running
    let timerRunning = false
    try {
      const timerData = JSON.parse(localStorage.getItem('mission-cs-pomodoro-state') || '{}')
      timerRunning = !!(timerData.timerRunning && !timerData.timerPaused)
    } catch {}
    if (timerRunning) { setChatError('Finish your Pomodoro focus session to send messages in this group'); return }

    const disappear = disappearTimer
    const filtered = filterContent(text)
    const displayName = anonymousMode && anonymousName ? anonymousName : userName
    const optId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    setMessages(prev => [...prev, { id: optId, userId, userName: displayName, content: filtered, type: 'text', timestamp: Date.now(), gender: anonymousMode ? anonymousGender : null, disappearAfter: disappear, expiresAt: null }])
    setChatInput('')
    setDisappearTimer(null)
    setChatError(null)
    try {
      const payload: any = { action: 'group-message', groupId: currentGroup.id, content: filtered }
      if (anonymousMode && anonymousName) payload.anonymousName = anonymousName
      if (anonymousMode && anonymousGender) payload.anonymousGender = anonymousGender
      if (disappear) payload.disappearAfter = disappear
      const result = await api.realtimePublish(payload)
      if (result?.message?.id) {
        setMessages(prev => prev.map(m => m.id === optId ? { ...m, id: result.message.id } : m))
      }
    } catch (e: any) {
      console.error('Send message failed:', e)
      setMessages(prev => prev.filter(m => m.id !== optId))
      setChatInput(text)
      setChatError(e?.message || 'Failed to send message. Please try again.')
      inputRef.current?.focus()
    }
  }

  const fetchStudySubjects = useCallback(async () => {
    try {
      const data = await api.studentDashboard()
      if (data?.subjects) setStudySubjects(data.subjects)
    } catch {}
  }, [])

  const startStudySession = async () => {
    if (!selectedSubj || !selectedChap || !currentGroup) return
    const subject = studySubjects.find(s => s.id === selectedSubj)
    const chapter = subject?.chapters.find(c => c.id === selectedChap)
    const subjectName = subject?.name || ''
    const chapterName = chapter?.name || ''
    const total = studyMinutes * 60
    const timerState: TimerState = {
      running: true, paused: false, remaining: total, total,
      chapterName, subjectName, phase: 'work', phaseLabel: 'Focus',
    }
    // Save to localStorage so TimerContext picks it up
    try {
      const existing = JSON.parse(localStorage.getItem('mission-cs-pomodoro-state') || '{}')
      localStorage.setItem('mission-cs-pomodoro-state', JSON.stringify({
        ...existing,
        selectedSubjectId: selectedSubj,
        selectedChapterId: selectedChap,
        chapterName,
        subjectName,
        timerSeconds: total,
        timerTotalSeconds: total,
        timerRunning: true,
        timerPaused: false,
        timerStartedAt: Date.now(),
        timestamp: Date.now(),
        sessionQuote: existing.sessionQuote || '',
      }))
    } catch {}
    // Publish to group
    await api.realtimePublish({ action: 'group-timer', groupId: currentGroup.id, timerState, timerStartedAt: new Date().toISOString() })
    // Update local member state
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, timerState } : m))
    setShowStudyStarter(false)
    setSelectedSubj('')
    setSelectedChap('')
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

  const startAnonymous = (gender: 'male' | 'female') => {
    const { name, color } = getRandomName(gender)
    setAnonymousGender(gender)
    setAnonymousName(name)
    setAnonymousColor(color)
    setAnonymousMode(true)
    setShowGenderPicker(false)
  }

  const stopAnonymous = () => {
    setAnonymousMode(false)
    setAnonymousName('')
    setAnonymousGender(null)
    setAnonymousColor('bg-indigo-500')
  }

  const handleAnonToggle = () => {
    if (anonymousMode) stopAnonymous()
    else setShowGenderPicker(true)
  }

  const handleBackToList = () => { setInRoom(false); setCurrentGroup(null); setShowMobileMenu(false); setShowMembersPanel(false); fetchGroups() }

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

  // Remove expired and view_once messages locally
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setMessages(prev => prev.filter(msg => {
        if (msg.disappearAfter === 'view_once') {
          const msgTime = typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()
          return now - msgTime < 10000
        }
        if (msg.expiresAt && now > msg.expiresAt) return false
        return true
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter groups by search
  const filteredGroups = groups.filter(g =>
    !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.subjectName && g.subjectName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const hasActiveGroups = groups.some(g => g.isCurrentUserMember)
  const studyingMembers = members.filter(m => m.timerState?.running).length

  // ─── GROUP LISTING VIEW (Modern card-style) ─────────────────────
  if (!inRoom || !currentGroup) {
    // While the group data is still loading, never flash the group-list page —
    // a student who has already joined a group should go straight to their room.
    if (loading) {
      return (
        <div className="page-transition max-w-2xl mx-auto px-2 flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Loading your study groups...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="page-transition max-w-2xl mx-auto px-2">
        {/* Join Error Banner */}
        {joinError && (
          <div className="mx-1 mb-4 bg-red-50/80 dark:bg-red-950/40 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
            <p className="text-sm text-red-700 dark:text-red-400">{joinError}</p>
            <button onClick={() => setJoinError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 ml-3 text-lg leading-none font-bold">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 px-1 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Group Study</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Study together with peers in real-time</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-1 pb-4">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border-0 outline-none focus:ring-2 focus:ring-indigo-400/50 placeholder:text-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
            />
          </div>
        </div>

        {/* Empty state */}
        {groups.length === 0 ? (
          <div className="px-1 pt-12 text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <Users className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Study Groups Yet</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">Study groups will appear here once created by admin. Check back soon to join your peers!</p>
          </div>
        // Group list
        ) : (
          <div className="space-y-3 px-1">
            {/* Current membership banner */}
            {hasActiveGroups && (
              <div className="pb-1">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Your Groups</p>
              </div>
            )}

            {/* Group cards */}
            {filteredGroups.map((group, idx) => {
              const isMember = group.isCurrentUserMember
              return (
                <div
                  key={group.id}
                  className={`group-card flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer ${
                    isMember
                      ? 'bg-white dark:bg-slate-800/90 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20 shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-slate-200/60 dark:border-slate-700/60'
                      : 'bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-slate-200/40 dark:border-slate-700/40 backdrop-blur-sm'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onClick={() => isMember ? enterRoom(group) : handleJoinGroup(group.id)}
                >
                  {/* Group Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                      isMember
                        ? 'bg-gradient-to-br from-indigo-600 to-blue-600 shadow-indigo-500/25'
                        : 'bg-gradient-to-br from-indigo-500 to-blue-500 shadow-indigo-500/20'
                    }`}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-[3px] ring-white dark:ring-slate-900 ${
                      group.isFull ? 'bg-slate-400' : 'bg-indigo-500'
                    } px-1`}>
                      {group.activeMembers}/{group.maxCapacity}
                    </div>
                    {group.activeMembers > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3">
                        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                        <div className="absolute inset-0 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {isMember && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {group.unreadCount > 0 && isMember && (
                          <span className="min-w-[20px] h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 shadow-sm shadow-rose-500/30">
                            {group.unreadCount > 99 ? '99+' : group.unreadCount}
                          </span>
                        )}
                        {group.isFull && !isMember && (
                          <Badge variant="secondary" className="text-[9px] bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-2 py-0.5 rounded-full font-medium">Full</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                      {group.description || group.subjectName || `${group.activeMembers}/${group.maxCapacity} members`}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex -space-x-1.5">
                        {group.members.slice(0, 3).map(m => (
                          <div key={m.studentId} className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-bold text-indigo-700 dark:text-indigo-400 shadow-sm">
                            {m.studentName.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {group.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-500 shadow-sm">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                      {group.subjectName && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">{group.subjectName}</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isMember ? (
<Button size="sm" onClick={() => enterRoom(group)}
                         className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white h-9 text-xs px-4 rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95">
                        Open
                      </Button>
                    ) : group.isFull ? (
                      <Button size="sm" variant="outline" disabled
                        className="h-9 text-xs px-4 rounded-xl opacity-50 border-slate-200 dark:border-slate-700">
                        Full
                      </Button>
                    ) : (
<Button size="sm" onClick={() => handleJoinGroup(group.id)} disabled={joinLoading === group.id}
                         className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs px-4 rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95">
                        {joinLoading === group.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Join'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* No search results */}
            {searchQuery && filteredGroups.length === 0 && (
              <div className="px-1 pt-8 text-center">
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
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700">
              <span className="text-sm font-semibold text-white">Members ({members.length})</span>
              <button onClick={() => setShowMembersPanel(false)} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 pt-3 pb-1.5">
              <button onClick={() => { setShowStudyStarter(true); fetchStudySubjects(); setShowMembersPanel(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all active:scale-95">
                <Play className="w-3.5 h-3.5" /> Start Studying
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
          <div className="absolute right-3 top-14 w-52 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowMembersPanel(true); setShowMobileMenu(false) }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
              <Users className="w-4 h-4 text-indigo-600" /> Members
            </button>
            {members.length > 1 && (
              <button onClick={() => { setShowMobileMenu(false); comparisonSent && acceptedForCompare.length > 1 ? handleViewComparison() : handleRequestComparison() }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> {comparisonSent ? 'View Comparison' : 'Compare Progress'}
              </button>
            )}
            <div className="h-px bg-slate-200 dark:bg-slate-700 mx-3" />
            <button onClick={handleLeaveGroup} disabled={leavingGroup}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              {leavingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Leave Group
            </button>
          </div>
        </div>
      )}

      {/* Comparison overlay */}
      {showComparison && comparisonData && (
        <div className="fixed inset-0 z-50 bg-white/98 dark:bg-slate-900/98 backdrop-blur-sm flex flex-col">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={handleCloseComparison} className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Group Progress Comparison</h3>
            </div>
            <button onClick={handleCloseComparison} className="hidden sm:flex w-8 h-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
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
                    <div key={metric.key} className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-2">{metric.label}</p>
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

              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
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
                  <div key={m.userId} className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
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
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Achievements</h4>
                  {comparisonData.map(m => (
                    <div key={m.userId} className="flex items-center justify-between text-xs py-1">
                      <span className={m.isRequester ? 'font-semibold text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}>{m.isRequester ? 'You' : 'Peer'}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{m.achievementsUnlocked} / {m.totalAchievements}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
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
      <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/50 h-[calc(100dvh-110px)] max-h-full md:h-[calc(100dvh-160px)] lg:h-[calc(100dvh-178px)] relative">
        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700 text-white px-2 sm:px-4 py-3 flex items-center gap-3 shadow-lg backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
          {/* Back button (mobile only) */}
          <button onClick={handleBackToList}
            className="md:hidden p-1.5 -ml-1 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Group avatar with presence dot */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center text-base font-bold shadow-inner backdrop-blur-sm">
              {currentGroup.name.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-indigo-600 ${isConnected ? 'bg-green-400' : 'bg-amber-400'}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate leading-tight">{currentGroup.name}</h2>
            <p className="text-[10px] text-white/70 flex items-center gap-1 truncate">
              {members.length > 0 ? (
                <>{members.length} member{members.length !== 1 ? 's' : ''}{studyingMembers > 0 && `, ${studyingMembers} studying`}</>
              ) : 'No members'}
              {anonymousMode && anonymousName && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] bg-white/15 px-2 py-0.5 rounded-full"><EyeOff className="w-2.5 h-2.5" />{anonymousName}</span>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button onClick={handleAnonToggle}
              className={`relative p-2 rounded-xl transition-colors ${anonymousMode ? 'bg-white/20 hover:bg-white/25' : 'hover:bg-white/10'}`}
              title={anonymousMode ? `Chatting as ${anonymousName} — tap to go back to your real name` : 'Chat anonymously'}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {anonymousMode && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>
            <button onClick={() => setShowMembersPanel(true)}
              className="hidden md:flex p-2 rounded-xl hover:bg-white/10 transition-colors" title="Members">
              <Users className="w-5 h-5" />
            </button>
            {members.length > 1 && (
              <button onClick={comparisonSent && acceptedForCompare.length > 1 ? handleViewComparison : handleRequestComparison}
                disabled={comparisonLoading}
                className="hidden md:flex p-2 rounded-xl hover:bg-white/10 transition-colors" title={comparisonSent ? 'View Comparison' : 'Compare Progress'}>
                {comparisonLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
              </button>
            )}
            {/* Mobile menu trigger */}
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {/* Desktop leave button */}
            <button onClick={handleLeaveGroup} disabled={leavingGroup}
              className="hidden md:flex p-2 rounded-xl hover:bg-white/10 transition-colors ml-1" title="Leave Group">
              {leavingGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Comparison notifications */}
        {comparisonRequesters.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 backdrop-blur-sm border-b border-indigo-200 dark:border-indigo-800/50 space-y-1.5">
            {comparisonRequesters.map(r => (
              <div key={r.userId} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-indigo-700 dark:text-indigo-300"><BarChart3 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /><strong>{r.userName}</strong> wants to compare</span>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleAcceptComparison(r.userId)}
                    className="w-7 h-7 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-sm transition-colors active:scale-95"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeclineComparison(r.userId)}
                    className="w-7 h-7 rounded-lg bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500 text-white flex items-center justify-center transition-colors active:scale-95"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {comparisonSent && acceptedForCompare.length > 0 && !showComparison && (
          <div className="flex-shrink-0 px-4 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/30 backdrop-blur-sm border-b border-indigo-200 dark:border-indigo-800/50">
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
          <div className="hidden md:flex md:w-60 lg:w-72 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/80">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Members ({members.length})</p>
            </div>
            <div className="px-3 pt-2 pb-1">
              <button onClick={() => { setShowStudyStarter(true); fetchStudySubjects() }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all active:scale-95">
                <Play className="w-3.5 h-3.5" /> Start Studying
              </button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {members.map(m => (<MemberItem key={m.userId} member={m} currentUserId={userId} />))}
                {members.length === 0 && (
                  <div className="py-8 text-center"><Users className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" /><p className="text-[10px] text-slate-400">No members</p></div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat messages */}
          <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-slate-50/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60">
            <ScrollArea className="flex-1">
              <div className="px-2 sm:px-4 py-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-inner">
                      <MessageCircle className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Start the conversation!</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Say hi to your study group members</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {getMessageGroups().map(group => (
                      <div key={group.date}>
                        <DateDivider date={group.date} />
                        {group.messages.map((msg, idx) => {
                          const isSelf = msg.userId === userId
                          const showAvatar = !isSelf
                          const showName = !isSelf
                          const showAchievement = !isSelf && !msg.anonymous
                          return <ChatMessageBubble key={msg.id} msg={msg} currentUserId={userId} showAvatar={showAvatar} showName={showName} showAchievement={showAchievement} />
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* ── Input bar ── */}
            <div className="flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-2 sm:px-4 py-3 border-t border-slate-200 dark:border-slate-700 shadow-lg">
              {chatError && (
                <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between gap-3 bg-red-50/90 dark:bg-red-950/50 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2 shadow-sm">
                  <p className="text-xs text-red-700 dark:text-red-400">{chatError}</p>
                  <button onClick={() => setChatError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none font-bold shrink-0">&times;</button>
                </div>
              )}
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                {/* Disappear timer button */}
                <div className="relative">
                  <button onClick={() => setShowDisappearPicker(!showDisappearPicker)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      disappearTimer ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'
                    }`}
                    title={disappearTimer === 'view_once' ? 'View once' : disappearTimer === '30m' ? 'Disappears in 30m' : disappearTimer === '24h' ? 'Disappears in 24h' : 'Disappearing messages'}>
                    <Clock className="w-4 h-4" />
                  </button>
                  {showDisappearPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDisappearPicker(false)} />
                      <div className="absolute bottom-full mb-2 left-0 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 min-w-[160px]">
                        <button onClick={() => { setDisappearTimer(null); setShowDisappearPicker(false) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${!disappearTimer ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                          <EyeOff className="w-3.5 h-3.5" /> Off
                        </button>
                        <button onClick={() => { setDisappearTimer('view_once'); setShowDisappearPicker(false) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${disappearTimer === 'view_once' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                          <Eye className="w-3.5 h-3.5" /> View once
                        </button>
                        <button onClick={() => { setDisappearTimer('30m'); setShowDisappearPicker(false) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${disappearTimer === '30m' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                          <Clock className="w-3.5 h-3.5" /> 30 minutes
                        </button>
                        <button onClick={() => { setDisappearTimer('24h'); setShowDisappearPicker(false) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${disappearTimer === '24h' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                          <Clock className="w-3.5 h-3.5" /> 24 hours
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 rounded-2xl px-4 py-2 shadow-sm border border-slate-200/60 dark:border-slate-600/60">
                  <input
                    ref={inputRef}
                    placeholder={pomodoroRunning ? 'Focus session in progress — you can chat after a break' : (isConnected ? 'Type a message' : 'Message')}
                    value={chatInput}
                    disabled={pomodoroRunning}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 py-1 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || pomodoroRunning}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                    chatInput.trim() && !pomodoroRunning
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                  }`}>
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {pomodoroRunning && (
                <div className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                  <Clock className="w-3 h-3" /> Focus session in progress — messages are disabled until your break
                </div>
              )}
              {/* Active timer indicator */}
              {disappearTimer && (
                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    {disappearTimer === 'view_once' ? 'Messages will disappear after being read' : `Messages will disappear in ${disappearTimer === '30m' ? '30 minutes' : '24 hours'}`}
                  </span>
                </div>
              )}
              {!isConnected && (
                <p className="text-[10px] text-amber-500 text-center mt-1.5">Reconnecting... messages will be sent when online</p>
              )}
            </div>
          </div>
        </div>
      </div>
    {/* Study starter dialog */}
      {showStudyStarter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowStudyStarter(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 w-80 mx-4 border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Start Study Session</h3>

            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Subject</label>
            <select value={selectedSubj} onChange={e => { setSelectedSubj(e.target.value); setSelectedChap('') }}
              className="w-full mb-3 px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400/50">
              <option value="">Select subject</option>
              {studySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Chapter</label>
            <select value={selectedChap} onChange={e => setSelectedChap(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400/50">
              <option value="">Select chapter</option>
              {studySubjects.find(s => s.id === selectedSubj)?.chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Duration</label>
            <div className="flex gap-2 mb-4">
              {[15, 25, 30, 45, 60].map(m => (
                <button key={m} onClick={() => setStudyMinutes(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${studyMinutes === m ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                  {m}m
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowStudyStarter(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                Cancel
              </button>
              <button onClick={startStudySession} disabled={!selectedSubj || !selectedChap}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-indigo-500/20">
                <Play className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Start
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Gender picker dialog */}
      {showGenderPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowGenderPicker(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-72 mx-4 border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 text-center mb-4">Chat Anonymously</h3>
            <div className="flex items-center gap-2 px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 bg-indigo-50/60 dark:bg-indigo-900/20 border-b border-slate-200 dark:border-slate-700">
              <Eye className="w-3.5 h-3.5 text-indigo-500" /> You will appear with a random anonymous name in this group
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => startAnonymous('male')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 transition-all active:scale-95">
                <span className="text-2xl">👨</span>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Male</span>
              </button>
              <button onClick={() => startAnonymous('female')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/40 border border-pink-200 dark:border-pink-800/50 transition-all active:scale-95">
                <span className="text-2xl">👩</span>
                <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">Female</span>
              </button>
            </div>
            <button onClick={() => setShowGenderPicker(false)}
              className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
