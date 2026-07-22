'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Flame, Settings, CheckCircle2, Clock, Play, Pause, RotateCcw,
  ChevronRight, Trophy, BookOpen, Target, Loader2, Lock, Crown, Sparkles, ListChecks, StickyNote,
  CalendarCheck, ArrowRight, MonitorSmartphone,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { ACHIEVEMENT_TIERS } from '@/lib/achievements'

import { DashboardData } from '../types'
import {
  MOTIVATIONAL_QUOTES, SESSION_QUOTES, MOCK_LEADERBOARD,
  formatTimer, formatMinutes, CircularProgressRing, TimerCountdownRing, Confetti, LoadingSkeleton,
} from '../utils'

// ─── Timer Persistence Helpers ─────────────────────────────────────────
const TIMER_STORAGE_KEY = 'mission-cs-pomodoro-state'

interface TimerPersistState {
  selectedSubjectId: string
  selectedChapterId: string
  timerSeconds: number
  timerTotalSeconds: number
  timerRunning: boolean
  timerPaused: boolean
  timestamp: number // when the state was saved
  sessionQuote: string
}

function saveTimerState(state: TimerPersistState) {
  try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function loadTimerState(): TimerPersistState | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as TimerPersistState
    // If timer was running, calculate elapsed time since last save
    if (state.timerRunning && !state.timerPaused) {
      const elapsed = Math.floor((Date.now() - state.timestamp) / 1000)
      state.timerSeconds = Math.max(0, state.timerSeconds - elapsed)
      if (state.timerSeconds <= 0) {
        state.timerRunning = false
        state.timerPaused = false
      }
    }
    return state
  } catch { return null }
}

function clearTimerState() {
  try { localStorage.removeItem(TIMER_STORAGE_KEY) } catch {}
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE (Redesigned)
// ═══════════════════════════════════════════════════════════════════════

export function DashboardPage({ data, onRefresh, onNavigate }: { data: DashboardData | null; onRefresh: () => void; onNavigate?: (page: string) => void }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [timerPreset, setTimerPreset] = useState(0)
  const [customMinutes, setCustomMinutes] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerTotalSeconds, setTimerTotalSeconds] = useState(0)
  const [timerCompleted, setTimerCompleted] = useState(false)
  const [strikeAnimating, setStrikeAnimating] = useState(false)
  const [strikeLoading, setStrikeLoading] = useState(false)
  const [strikeFlash, setStrikeFlash] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [screenLocked, setScreenLocked] = useState(false)
  const [achievementsData, setAchievementsData] = useState<any>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [sessionQuote, setSessionQuote] = useState('')
  const [dailyGoalMin] = useState(120)
  const [sessionNotes, setSessionNotes] = useState('')
  const [leaderboardData, setLeaderboardData] = useState<any[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [lastStudySession, setLastStudySession] = useState<any>(null)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unavailable'>('default')

  useEffect(() => {
    if (!('Notification' in window)) { setNotifPerm('unavailable'); return }
    setNotifPerm(Notification.permission)
  }, [])

  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      setNotifPerm(result)
    }
  }, [])

  const sendCompletionNotification = useCallback((chapterName: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try {
      new Notification('Session Complete! 🎉', {
        body: `Great work on "${chapterName}"! Take a moment to reflect.`,
        icon: '/favicon.ico',
      })
    } catch {}
  }, [])

  const dailyQuote = useMemo(() => MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length], [])
  const student = data?.student
  const subjects = data?.subjects || []
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const chapters = selectedSubject?.chapters || []

  // ─── Restore timer from localStorage on mount ────────────────────────
  useEffect(() => {
    const saved = loadTimerState()
    if (saved && saved.timerSeconds > 0) {
      setSelectedSubjectId(saved.selectedSubjectId)
      setSelectedChapterId(saved.selectedChapterId)
      setTimerSeconds(saved.timerSeconds)
      setTimerTotalSeconds(saved.timerTotalSeconds)
      setTimerRunning(saved.timerRunning)
      setTimerPaused(saved.timerPaused)
      setSessionQuote(saved.sessionQuote)
    }
  }, [])

  // ─── Screen Wake Lock: keep screen on while timer is running ──────────
  useEffect(() => {
    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        wakeLockRef.current = sentinel
        setScreenLocked(true)
        sentinel.addEventListener('release', () => {
          setScreenLocked(false)
          wakeLockRef.current = null
        })
      } catch (err) {
        console.warn('Wake Lock request failed:', err)
        setScreenLocked(false)
      }
    }

    const releaseWakeLock = async () => {
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
          setScreenLocked(false)
        }
      } catch {}
    }

    if (timerRunning && !timerPaused) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }

    return () => { releaseWakeLock() }
  }, [timerRunning, timerPaused])

  // Re-acquire wake lock when page becomes visible again (user switched tabs and came back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerRunning && !timerPaused && !wakeLockRef.current && 'wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(sentinel => {
          wakeLockRef.current = sentinel
          setScreenLocked(true)
          sentinel.addEventListener('release', () => {
            setScreenLocked(false)
            wakeLockRef.current = null
          })
        }).catch(() => setScreenLocked(false))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [timerRunning, timerPaused])

  // ─── Save timer state to localStorage on change ──────────────────────
  useEffect(() => {
    if (timerRunning || timerPaused) {
      saveTimerState({
        selectedSubjectId,
        selectedChapterId,
        timerSeconds,
        timerTotalSeconds,
        timerRunning,
        timerPaused,
        timestamp: Date.now(),
        sessionQuote,
      })
    } else if (timerSeconds === 0 && timerTotalSeconds === 0) {
      clearTimerState()
    }
  }, [timerRunning, timerPaused, timerSeconds, timerTotalSeconds, selectedSubjectId, selectedChapterId, sessionQuote])

  // ─── Fetch data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLeaderboardLoading(true)
        const data = await api.publicLeaderboard()
        setLeaderboardData(data.leaderboard || [])
      } catch (err) { console.error('Leaderboard fetch error:', err) }
      finally { setLeaderboardLoading(false) }
    }
    fetchLeaderboard()
  }, [])

  useEffect(() => {
    const fetchAchievements = async () => {
      try { setAchievementsData(await api.studentAchievements()) }
      catch (err) { console.error('Achievements fetch error:', err) }
    }
    fetchAchievements()
  }, [data?.student?.score])

  useEffect(() => {
    const fetchLastSession = async () => {
      try {
        const data = await api.studentStudyHistory()
        const sessions = data.sessions || []
        if (sessions.length > 0) {
          const last = sessions[0]
          setLastStudySession(last)
        }
      } catch (err) { console.error('Last session fetch error:', err) }
    }
    fetchLastSession()
  }, [data])

  // ─── Timer logic ─────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning && !timerPaused && timerSeconds > 0) {
      timerInterval.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            const chapterName = chapters.find(c => c.id === selectedChapterId)?.name || 'Chapter'
            setTimerRunning(false); setTimerCompleted(true); setShowConfetti(true)
            sendCompletionNotification(chapterName)
            clearTimerState()
            if (timerInterval.current) clearInterval(timerInterval.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current) }
  }, [timerRunning, timerPaused, timerSeconds])

  const startTimer = () => {
    let minutes = timerPreset
    if (timerPreset === -1) minutes = Math.min(parseInt(customMinutes) || 0, 300)
    if (minutes <= 0 || !selectedChapterId) return
    requestNotifPermission()
    setTimerTotalSeconds(minutes * 60); setTimerSeconds(minutes * 60)
    setTimerRunning(true); setTimerPaused(false); setTimerCompleted(false)
    setSessionQuote(SESSION_QUOTES[Math.floor(Math.random() * SESSION_QUOTES.length)])
  }

  const resetTimer = () => {
    setTimerRunning(false); setTimerPaused(false); setTimerSeconds(0)
    setTimerTotalSeconds(0); setTimerCompleted(false); setSessionQuote('')
    clearTimerState()
    if (timerInterval.current) clearInterval(timerInterval.current)
  }

  const handleTimerComplete = async (completed: boolean) => {
    const durationMin = Math.round(timerTotalSeconds / 60)
    try {
      await api.studentStartSession({ chapterId: selectedChapterId, durationMin, completed, notes: sessionNotes.trim() || undefined })
      if (completed) await api.studentMarkChapter(selectedChapterId, true)
    } catch (err) { console.error('Session save error:', err) }
    setSessionNotes('')
    setTimerCompleted(false); setShowConfetti(false); resetTimer(); onRefresh()
  }

  const handleStrike = async () => {
    setStrikeLoading(true); setStrikeAnimating(true); setStrikeFlash(true)
    try {
      await api.studentSendStrike()
      setTimeout(() => { setStrikeAnimating(false); setStrikeFlash(false) }, 800)
      onRefresh()
    } catch {
      setStrikeAnimating(false); setStrikeFlash(false)
    } finally { setStrikeLoading(false) }
  }

  const handleResetStats = async () => {
    setResetLoading(true)
    try { await api.studentResetStats(); setResetDialogOpen(false); onRefresh() }
    catch (err) { console.error('Reset error:', err) }
    finally { setResetLoading(false) }
  }

  const handleResumeLastChapter = () => {
    if (lastStudySession?.chapter?.subject?.id) {
      setSelectedSubjectId(lastStudySession.chapter.subject.id)
    }
    if (lastStudySession?.chapter?.id) {
      setSelectedChapterId(lastStudySession.chapter.id)
    }
    // Scroll to study session card
    document.getElementById('study-session-card')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!data || !student || !student.fullName) return <LoadingSkeleton />

  const canStrike = !(student as any).lastStrikeAt ||
    new Date((student as any).lastStrikeAt).toDateString() !== new Date().toDateString()

  const timerPresets = [
    { label: '25m', value: 25, desc: 'Pomodoro' },
    { label: '30m', value: 30, desc: 'Short' },
    { label: '45m', value: 45, desc: 'Medium' },
    { label: '1h', value: 60, desc: 'Long' },
    { label: '1.5h', value: 90, desc: 'Extended' },
    { label: '2h', value: 120, desc: 'Marathon' },
  ]

  const unlockedCount = achievementsData?.totalUnlocked || 0
  const totalAchievements = achievementsData?.totalAchievements || 12
  const dailyGoalProgress = Math.min((data.todayStudyMin / dailyGoalMin) * 100, 100)
  const dailyGoalReached = data.todayStudyMin >= dailyGoalMin

  // Timer progress for circular ring
  const timerProgress = timerTotalSeconds > 0 ? (timerSeconds / timerTotalSeconds) * 100 : 0

  return (
    <div className="space-y-6">
      <Confetti active={showConfetti} />
      {strikeFlash && <div className="fixed inset-0 bg-orange-400/20 dark:bg-orange-500/10 strike-flash pointer-events-none z-[999]" />}

      {/* ═══════════════════════════════════════════════════════════════════
          0. TOP HEADER BAR — Course Name, Points, Streak, Quote
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900 p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="relative">
          {/* Top Row: Course Name + Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">{student.course?.title || 'CS Executive Test Series'}</h2>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase">MISSION CS TEST SERIES</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 sm:px-3 py-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-white font-bold text-sm">{student.score}</span>
                <span className="text-slate-400 text-xs hidden sm:inline">study score</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 sm:px-3 py-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-white font-bold text-sm">{student.currentStreak}</span>
                <span className="text-slate-400 text-xs hidden sm:inline">day streak</span>
              </div>
              <TooltipProvider><Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost"
                    className={`h-9 w-9 text-orange-400 hover:text-orange-300 hover:bg-white/10 relative ${strikeAnimating ? 'fire-animate' : ''}`}
                    onClick={handleStrike} disabled={!canStrike || strikeLoading}>
                    <Flame className="w-5 h-5" />
                    {strikeAnimating && (
                      <>
                        <div className="flame-particle bg-orange-500" style={{ top: '-8px', left: '4px' }} />
                        <div className="flame-particle bg-red-500" style={{ top: '-10px', left: '10px', animationDelay: '0.1s' }} />
                        <div className="flame-particle bg-amber-500" style={{ top: '-5px', left: '16px', animationDelay: '0.2s' }} />
                        <div className="flame-particle bg-yellow-400" style={{ top: '-12px', left: '7px', animationDelay: '0.15s' }} />
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{canStrike ? 'Send Strike! (+10 pts)' : 'Already struck today'}</TooltipContent>
              </Tooltip></TooltipProvider>
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset All Stats?</DialogTitle>
                    <DialogDescription>This will permanently delete all your study sessions, plans, chapter completions, and achievements. Your score and streak will be reset to zero. This action cannot be undone.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleResetStats} disabled={resetLoading}>
                      {resetLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reset Stats
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {/* Quote Row */}
          <div className="flex items-start gap-3 pt-3 border-t border-white/10">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white/80 text-sm italic leading-relaxed">&ldquo;{dailyQuote.text}&rdquo;</p>
              <p className="text-amber-300/60 text-xs mt-1">— {dailyQuote.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          1. STUDY SESSION CARD (Pomodoro Timer) — TOP PRIORITY
      ═══════════════════════════════════════════════════════════════════ */}
      <Card id="study-session-card" className="overflow-hidden border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20">
        <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              Study Session
            </CardTitle>
            {timerRunning && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                <Clock className="w-3 h-3 mr-1" /> {timerPaused ? 'Paused' : 'In Progress'}
              </Badge>
            )}
          </div>
          <CardDescription className="text-emerald-700/70 dark:text-emerald-400/70">Which chapter do you want to study today?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {sessionQuote && timerRunning && (
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 grow-in">
              <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium text-center">{sessionQuote}</p>
            </div>
          )}

          {!timerRunning && !timerCompleted ? (
            <>
              {/* Subject & Chapter Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Subject</Label>
                  <Select value={selectedSubjectId} onValueChange={(v) => { setSelectedSubjectId(v); setSelectedChapterId('') }}>
                    <SelectTrigger className="bg-white/80 dark:bg-slate-800/80 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-300">
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Chapter</Label>
                  <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={!selectedSubjectId}>
                    <SelectTrigger className="bg-white/80 dark:bg-slate-800/80 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-300">
                      <SelectValue placeholder="Choose chapter" />
                    </SelectTrigger>
                    <SelectContent>{chapters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Timer Presets with Pomodoro label */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Study Duration (Pomodoro Timer)</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {timerPresets.map(p => (
                    <button key={p.value} onClick={() => { setTimerPreset(p.value); setCustomMinutes('') }}
                      className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all active:scale-[0.97] ${
                        timerPreset === p.value
                          ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 shadow-sm'
                          : 'border-emerald-200 dark:border-emerald-800 bg-white/60 dark:bg-slate-800/40 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}>
                      <span className={`text-sm font-bold ${timerPreset === p.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>{p.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{p.desc}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="number" placeholder="Custom (min)" className="w-32 h-8 text-sm bg-white/80 dark:bg-slate-800/80 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-300"
                    value={customMinutes} onChange={(e) => {
                      const v = e.target.value
                      if (v === '' || parseInt(v) <= 300) { setCustomMinutes(v); setTimerPreset(-1) }
                    }} min={1} max={300} />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">min</span>
                </div>
              </div>

              <Button onClick={startTimer}
                disabled={!selectedChapterId || (timerPreset === 0 && !customMinutes) || (timerPreset === -1 && !customMinutes)}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white shadow-md font-semibold">
                <Play className="w-4 h-4 mr-2" /> Start Pomodoro Session
              </Button>
            </>
          ) : timerCompleted ? (
            /* Timer Completion Dialog */
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center celebration-burst">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Session Complete! 🎉</h3>
              <p className="text-emerald-700/70 dark:text-emerald-400/70">Have you completed this chapter?</p>
              <div className="text-left space-y-1.5 max-w-md mx-auto">
                <label className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <StickyNote className="w-3 h-3" /> Session Notes (optional)
                </label>
                <textarea
                  placeholder="What did you learn? Any key takeaways?"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-700 resize-none"
                />
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => handleTimerComplete(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Yes, Done!
                </Button>
                <Button variant="outline" onClick={() => handleTimerComplete(false)} className="border-emerald-200 dark:border-emerald-800">Not Yet</Button>
              </div>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════════
                CIRCULAR POMODORO TIMER (Active Session)
            ═══════════════════════════════════════════════════════════════ */
            <div className="text-center py-4 space-y-4">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Studying</p>
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">{chapters.find(c => c.id === selectedChapterId)?.name}</p>
              </div>

              {/* Circular Progress Bar Timer */}
              <div className="relative inline-flex items-center justify-center">
                <TimerCountdownRing size={240} strokeWidth={10} totalSeconds={timerTotalSeconds} remainingSeconds={timerSeconds} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-mono font-bold text-emerald-900 dark:text-emerald-100 tabular-nums tracking-tight">
                    {formatTimer(timerSeconds)}
                  </span>
                  <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-medium uppercase tracking-wider">
                    {timerPaused ? '⏸ Paused' : '🔥 Focus Mode'}
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${timerPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {Math.round(timerProgress)}% complete
                      </span>
                    </div>
                    {screenLocked && !timerPaused && (
                      <div className="flex items-center gap-1 bg-blue-500/10 rounded-full px-1.5 py-0.5">
                        <MonitorSmartphone className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">Screen On</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="icon"
                  onClick={() => setTimerPaused(prev => !prev)}
                  className="h-14 w-14 rounded-full border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                  {timerPaused ? <Play className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <Pause className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                </Button>
                <Button variant="outline" size="icon"
                  onClick={resetTimer}
                  className="h-14 w-14 rounded-full border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                  <RotateCcw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </Button>
              </div>

              <Button variant="ghost" onClick={() => { resetTimer(); setSelectedChapterId('') }} className="text-sm text-emerald-600 dark:text-emerald-400">
                Choose Another Chapter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          2. ACTION CARDS (Group of 3)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-all card-hover border-l-4 border-l-amber-500" onClick={() => {
          if (subjects.length === 0) return
          for (const s of subjects) {
            if (s.chapters.length > 0) { setSelectedSubjectId(s.id); setSelectedChapterId(s.chapters[0].id); break }
          }
          document.getElementById('study-session-card')?.scrollIntoView({ behavior: 'smooth' })
        }}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Continue where you left off</p>
                <p className="text-xs text-slate-500">Jump back into studying</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all card-hover border-l-4 border-l-orange-500 relative overflow-hidden" onClick={handleStrike}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${canStrike ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                <Flame className={`w-5 h-5 ${canStrike ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Continue Streak</p>
                <p className="text-xs text-slate-500">{canStrike ? 'Send your daily strike!' : 'Already struck today ✓'}</p>
              </div>
              {canStrike && (
                <div className="ml-auto w-3 h-3 rounded-full bg-orange-500 pulse-check flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all card-hover border-l-4 border-l-emerald-500" onClick={() => onNavigate?.('planner')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">View Study Plan</p>
                <p className="text-xs text-slate-500">Check today's schedule</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* ═══════════════════════════════════════════════════════════════════
          5. RESUME LAST CHAPTER CARD
      ═══════════════════════════════════════════════════════════════════ */}
      {lastStudySession && !timerRunning && !timerCompleted && (
        <Card className="card-hover overflow-hidden border-l-4 border-l-emerald-500 cursor-pointer slide-up" onClick={handleResumeLastChapter}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resume Last Chapter</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {lastStudySession.chapter?.name || 'General Study'}
                  {lastStudySession.chapter?.subject?.name && ` — ${lastStudySession.chapter.subject.name}`}
                </p>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 flex-shrink-0">
                {formatMinutes(lastStudySession.durationMin)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          6. QUICK STATS & DAILY GOAL + LEADERBOARD
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: BookOpen, value: data.totalSubjects, label: 'Subjects', gradient: 'from-blue-500 to-cyan-500' },
              { icon: ListChecks, value: data.totalChapters, label: 'Total Chapters', gradient: 'from-violet-500 to-purple-500' },
              { icon: CheckCircle2, value: data.completedChapters, label: 'Completed', gradient: 'from-emerald-500 to-teal-500' },
              { icon: Clock, value: formatMinutes(data.todayStudyMin), label: 'Today', gradient: 'from-amber-500 to-orange-500' },
            ].map((stat, i) => (
              <Card key={i} className="card-hover overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.08] dark:opacity-[0.12]`} />
                <CardContent className="pt-4 pb-4 relative">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-sm`}>
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Achievements */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Achievements
                </CardTitle>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {unlockedCount}/{totalAchievements} Unlocked
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Progress</span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{Math.round((unlockedCount / totalAchievements) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500 relative" style={{ width: `${(unlockedCount / totalAchievements) * 100}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-bar" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {(achievementsData?.achievements || ACHIEVEMENT_TIERS.map((t, i) => ({ ...t, id: `tier-${i}`, unlocked: false, unlockedAt: null }))).map((a: any) => (
                  <TooltipProvider key={a.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all relative overflow-hidden card-hover ${
                          a.unlocked
                            ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-700 badge-shimmer shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}
                          style={a.unlocked ? { backgroundImage: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)', backgroundSize: '200% 100%' } : undefined}>
                          {a.unlocked ? (
                            <span className="text-2xl drop-shadow-sm">{a.icon || '🏆'}</span>
                          ) : (
                            <div className="relative">
                              <span className="text-2xl opacity-30 grayscale">{a.icon || '🏆'}</span>
                              <div className="absolute inset-0 flex items-center justify-center"><Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" /></div>
                            </div>
                          )}
                          <span className={`text-[10px] font-medium text-center leading-tight ${
                            a.unlocked ? 'text-amber-800 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'
                          }`}>{a.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-xs">{a.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{a.threshold} study score needed</p>
                        {a.unlockedAt && <p className="text-xs text-emerald-500 mt-0.5">✓ Unlocked</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Daily Goal + Leaderboard */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" /> Daily Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CircularProgressRing size={100} strokeWidth={8} progress={dailyGoalProgress}
                color={dailyGoalReached ? '#10b981' : '#f59e0b'} trackColor="rgba(100,116,139,0.2)">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatMinutes(data.todayStudyMin)}</p>
                  <p className="text-[10px] text-slate-400">of {formatMinutes(dailyGoalMin)}</p>
                </div>
              </CircularProgressRing>
              <div className="mt-3 text-center">
                {dailyGoalReached ? (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Goal Reached!
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">{formatMinutes(dailyGoalMin - data.todayStudyMin)} more to go</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboardLoading ? (
                  <div className="space-y-2">
                    {Array.from({length: 5}).map((_, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                        <div className="flex-1" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                    ))}
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No data yet</p>
                ) : leaderboardData.map((entry: any) => (
                  <div key={entry.rank} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                    entry.rank <= 3 ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      entry.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      entry.rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                      entry.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500'
                    }`}>
                      {entry.rank === 1 ? <Crown className="w-3.5 h-3.5" /> : entry.rank}
                    </div>
                    <div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{entry.name}</p></div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Flame className="w-3 h-3 text-orange-400" /><span className="text-[10px] text-slate-500">{entry.currentStreak}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">{entry.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
