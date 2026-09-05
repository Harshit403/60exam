'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { api } from '@/lib/api-client'

const TIMER_STORAGE_KEY = 'mission-cs-pomodoro-state'

interface TimerPersistState {
  selectedSubjectId: string
  selectedChapterId: string
  timerSeconds: number
  timerTotalSeconds: number
  timerRunning: boolean
  timerPaused: boolean
  timestamp: number
  sessionQuote: string
  chapterName: string
  timerStartedAt: number | null
  activeSessionId: string | null
  reportedMinutes: number
  lectureMode: boolean
}

interface TimerContextType {
  selectedSubjectId: string
  selectedChapterId: string
  timerSeconds: number
  timerTotalSeconds: number
  timerRunning: boolean
  timerPaused: boolean
  timerCompleted: boolean
  screenLocked: boolean
  sessionQuote: string
  chapterName: string
  lectureMode: boolean
  setLectureMode: (v: boolean) => void
  setSelectedSubjectId: (id: string) => void
  setSelectedChapterId: (id: string) => void
  setTimerSeconds: React.Dispatch<React.SetStateAction<number>>
  setTimerTotalSeconds: React.Dispatch<React.SetStateAction<number>>
  setTimerRunning: React.Dispatch<React.SetStateAction<boolean>>
  setTimerPaused: React.Dispatch<React.SetStateAction<boolean>>
  setTimerCompleted: React.Dispatch<React.SetStateAction<boolean>>
  setSessionQuote: (quote: string) => void
  setChapterName: (name: string) => void
  startTimer: (minutes: number) => void
  resetTimer: () => void
  finalizeSession: (completed: boolean, notes?: string) => Promise<void>
}

const TimerContext = createContext<TimerContextType | null>(null)

function saveTimerState(state: TimerPersistState) {
  try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function loadTimerState(): TimerPersistState | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return null
    // Never adjust the countdown by wall-clock time: study time only accrues
    // while the countdown is actually running on this page. If the browser was
    // closed (or the tab was killed) the remaining seconds stay where they were.
    return JSON.parse(raw) as TimerPersistState
  } catch { return null }
}

function clearTimerState() {
  try { localStorage.removeItem(TIMER_STORAGE_KEY) } catch {}
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerTotalSeconds, setTimerTotalSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)
  const [timerCompleted, setTimerCompleted] = useState(false)
  const [sessionQuote, setSessionQuote] = useState('')
  const [chapterName, setChapterName] = useState('')
  const [lectureMode, setLectureMode] = useState(false)
  const [screenLocked, setScreenLocked] = useState(false)
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  // Minutes already stored on the server for the current session.
  const reportedMinRef = useRef(0)
  // Guards the per-minute sync against overlapping requests.
  const syncingRef = useRef(false)
  // Throttles lecture-mode syncs so the server is hit at most once per minute.
  const lastLectureSyncRef = useRef(0)

  // ─── Restore timer from localStorage on mount ────────────────────────
  useEffect(() => {
    const saved = loadTimerState()
    if (saved && saved.timerSeconds > 0) {
      setSelectedSubjectId(saved.selectedSubjectId)
      setSelectedChapterId(saved.selectedChapterId)
      setChapterName(saved.chapterName)
      setLectureMode(saved.lectureMode || false)
      setTimerTotalSeconds(saved.timerTotalSeconds)
      setSessionQuote(saved.sessionQuote)
      setActiveSessionId(saved.activeSessionId || null)
      reportedMinRef.current = saved.reportedMinutes || 0
      if (saved.timerRunning && saved.timerSeconds > 0) {
        // The browser was closed (or the tab was killed) while the timer was
        // running. Never auto-resume: the countdown only runs while this page
        // is actually open, so no study time accrues while away. Restore it
        // paused and let the user resume manually if they still want to.
        setTimerSeconds(saved.timerSeconds)
        setTimerRunning(true)
        setTimerPaused(true)
      } else {
        setTimerSeconds(saved.timerSeconds)
        setTimerRunning(saved.timerRunning)
        setTimerPaused(saved.timerPaused)
      }
    }
  }, [])

  // ─── Persist state on change ─────────────────────────────────────────
  const persistRef = useRef(timerRunning || timerPaused)
  useEffect(() => {
    persistRef.current = timerRunning || timerPaused
  })

  useEffect(() => {
    if (timerRunning || timerPaused) {
      saveTimerState({
        selectedSubjectId, selectedChapterId, timerSeconds, timerTotalSeconds,
        timerRunning, timerPaused, timestamp: Date.now(), sessionQuote, chapterName,
        timerStartedAt, activeSessionId, reportedMinutes: reportedMinRef.current,
        lectureMode,
      })
    } else if (timerSeconds === 0 && timerTotalSeconds === 0) {
      clearTimerState()
    }
  }, [selectedSubjectId, selectedChapterId, timerSeconds, timerTotalSeconds, timerRunning, timerPaused, sessionQuote, chapterName, timerStartedAt, activeSessionId, lectureMode])

  // ─── Wake Lock ───────────────────────────────────────────────────────
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
      } catch {
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

  // ─── End-of-session beeps ─────────────────────────────────────────────
  // Soft chime when 59s remain, and two soft beeps when 1s remains, so the
  // user gets an audible heads-up before the pomodoro completes. Built on a
  // lazily-created shared AudioContext (kept quiet at gain 0.08).
  const beepCtxRef = useRef<AudioContext | null>(null)
  const prevSecondsRef = useRef(0)
  const playSoftBeep = useCallback((count: number) => {
    try {
      if (!beepCtxRef.current) {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        beepCtxRef.current = new Ctx()
      }
      const ctx = beepCtxRef.current
      if (!ctx) return
      ctx.resume?.().catch(() => {})
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        const start = ctx.currentTime + i * 0.35
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.08, start + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25)
        osc.connect(gain).connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.3)
      }
    } catch { /* audio unavailable — silently skip */ }
  }, [])

  useEffect(() => {
    const prev = prevSecondsRef.current
    prevSecondsRef.current = timerSeconds
    if (!timerRunning || timerPaused) return
    // Fire only on a real tick transition (1 → 0 is handled as completion).
    if (prev === timerSeconds || prev <= 0) return
    if (timerSeconds === 59) playSoftBeep(1)
    else if (timerSeconds === 1) playSoftBeep(2)
  }, [timerSeconds, timerRunning, timerPaused, playSoftBeep])

  // ─── Timer Interval ──────────────────────────────────────────────────
  // NOTE: the interval must NOT be torn down/recreated on every tick (i.e.
  // `timerSeconds` must not be a dependency). Recreating it each second
  // restarts the 1s window after every render, so the countdown drifts and a
  // "25 min" pomodoro actually takes longer than 25 minutes of wall-clock
  // time — which is exactly why recorded study time didn't match the session.
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      timerInterval.current = setInterval(() => {
        // Pure updater only — side effects (completion, storage clear) live in
        // the dedicated effect below, so React can safely re-invoke this.
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
        timerInterval.current = null
      }
    }
  }, [timerRunning, timerPaused])

  // ─── Timer completion ─────────────────────────────────────────────────
  // Fires once when the countdown reaches zero while running. Also reports the
  // final minute of study time: while the timer runs, sync happens only while
  // timerSeconds > 0, so without this the last minute (e.g. 25th of a 25-min
  // session) was never stored when the timer turned itself off.
  useEffect(() => {
    if (!timerRunning || timerPaused || timerTotalSeconds <= 0 || timerSeconds > 0) return
    setTimerRunning(false)
    setTimerCompleted(true)
    clearTimerState()
    if (!lectureMode) {
      const studiedMin = Math.floor(timerTotalSeconds / 60)
      const toReport = studiedMin - reportedMinRef.current
      if (toReport > 0) {
        // Optimistic: mark as reported first so a quick finalize can't double-count.
        reportedMinRef.current = studiedMin
        api.studentStartSession({
          ...(activeSessionId ? { id: activeSessionId } : {}),
          chapterId: selectedChapterId || undefined,
          durationMin: toReport,
          completed: false,
        }).catch(err => console.error('Final minute sync failed:', err))
      }
    }
  }, [timerRunning, timerPaused, timerSeconds, timerTotalSeconds, lectureMode, activeSessionId, selectedChapterId])

  const startTimer = useCallback((minutes: number) => {
    if (minutes <= 0) return
    setTimerTotalSeconds(minutes * 60)
    setTimerSeconds(minutes * 60)
    setTimerRunning(true)
    setTimerPaused(false)
    setTimerCompleted(false)
    setTimerStartedAt(Date.now())
    setActiveSessionId(null)
    reportedMinRef.current = 0
    if (lectureMode && selectedChapterId) {
      // Server-authoritative: create the session on the server and let it
      // record startedAt, then sync elapsed time from the server clock.
      api.studentStartSession({
        mode: 'lecture',
        action: 'start',
        chapterId: selectedChapterId,
        plannedMin: minutes,
      }).then((res: any) => {
        if (res?.session?.id) setActiveSessionId(res.session.id)
      }).catch(err => console.error('Lecture session start failed:', err))
    }
  }, [lectureMode, selectedChapterId])

  const resetTimer = useCallback(() => {
    // Turning the timer OFF manually: before wiping local state, report any
    // studied minutes the per-minute sync hasn't stored yet (e.g. the user
    // stops at 12:37 of a 25-min pomodoro — ~12 min must be credited, not 0).
    // In lecture mode the server clock is authoritative and pause (below)
    // already accrues the elapsed time, so nothing extra is needed there.
    if (!lectureMode && timerTotalSeconds > 0 && !syncingRef.current) {
      const studiedMin = Math.max(0, Math.floor((timerTotalSeconds - timerSeconds) / 60))
      const toReport = studiedMin - reportedMinRef.current
      if (toReport > 0) {
        // Optimistic: prevents a later finalize from counting these minutes again.
        reportedMinRef.current = studiedMin
        api.studentStartSession({
          ...(activeSessionId ? { id: activeSessionId } : {}),
          chapterId: selectedChapterId || undefined,
          durationMin: toReport,
          completed: false,
        }).catch(err => console.error('Turn-off study-time sync failed:', err))
      }
    }
    // In lecture mode, tell the server to stop accruing time for this session
    // so the stored study time is not inflated after the timer is reset.
    if (activeSessionId && lectureMode) {
      api.studentStartSession({ id: activeSessionId, mode: 'lecture', action: 'pause' }).catch(() => {})
    }
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerSeconds(0)
    setTimerTotalSeconds(0)
    setTimerCompleted(false)
    setSessionQuote('')
    setChapterName('')
    setTimerStartedAt(null)
    setActiveSessionId(null)
    reportedMinRef.current = 0
    clearTimerState()
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
  }, [activeSessionId, lectureMode, timerSeconds, timerTotalSeconds, selectedChapterId])

  // ─── Per-minute study-time sync ───────────────────────────────────────
  // While the timer runs, every full minute of study time is reported to the
  // server. The first report creates the session row, subsequent ones update it
  // incrementally, so study time is stored even if the session is interrupted.
  const reportTick = useCallback(async () => {
    if (syncingRef.current || timerTotalSeconds <= 0) return

    if (lectureMode && activeSessionId) {
      // Server-authoritative: ask the server to fold its own elapsed time into
      // the session, then adopt its count so the client clock stays honest even
      // if the tab spent time in the background. Throttled to once per minute.
      if (Date.now() - lastLectureSyncRef.current < 60000) return
      lastLectureSyncRef.current = Date.now()
      syncingRef.current = true
      try {
        const res = await api.studentStartSession({ id: activeSessionId, mode: 'lecture', action: 'sync' })
        const elapsedMin = Number(res?.elapsedMin || 0)
        reportedMinRef.current = elapsedMin
        // If the server is ahead of the local countdown (backgrounded tab),
        // pull the display forward to match the stored study time.
        const serverSeconds = Math.max(0, timerTotalSeconds - elapsedMin * 60)
        setTimerSeconds(prev => (serverSeconds < prev ? serverSeconds : prev))
      } catch (err) {
        console.error('Lecture sync failed:', err)
      } finally {
        syncingRef.current = false
      }
      return
    }

    // In lecture mode the server is authoritative; skip the client-side
    // reporting path entirely (it would create a competing client session).
    if (lectureMode) return

    // At zero the countdown has turned itself off — the completion effect owns
    // reporting the final minute, so don't double-report it here.
    if (timerSeconds <= 0) return

    const studiedMin = Math.floor((timerTotalSeconds - timerSeconds) / 60)
    const toReport = studiedMin - reportedMinRef.current
    if (toReport <= 0) return
    syncingRef.current = true
    try {
      const res = await api.studentStartSession({
        ...(activeSessionId ? { id: activeSessionId } : {}),
        chapterId: selectedChapterId || undefined,
        durationMin: toReport,
        completed: false,
      })
      if (!activeSessionId && res?.session?.id) {
        setActiveSessionId(res.session.id)
      }
      reportedMinRef.current = studiedMin
    } catch (err) {
      console.error('Study time sync failed:', err)
    } finally {
      syncingRef.current = false
    }
  }, [timerTotalSeconds, timerSeconds, activeSessionId, selectedChapterId, lectureMode])

  useEffect(() => {
    if (!timerRunning || timerPaused) return
    reportTick()
  }, [reportTick, timerRunning, timerPaused])

  // ─── Lecture mode: pause/resume on the server ─────────────────────────
  // Keep the server's startedAt in sync with the local pause state so the
  // authoritative elapsed time only accrues while the user is actually running.
  const prevPausedRef = useRef(timerPaused)
  useEffect(() => {
    if (!lectureMode || !activeSessionId) {
      prevPausedRef.current = timerPaused
      return
    }
    if (timerPaused !== prevPausedRef.current) {
      const wasPaused = prevPausedRef.current
      prevPausedRef.current = timerPaused
      if (timerPaused && !wasPaused) {
        api.studentStartSession({ id: activeSessionId, mode: 'lecture', action: 'pause' }).catch(() => {})
      } else if (!timerPaused && wasPaused) {
        api.studentStartSession({ id: activeSessionId, mode: 'lecture', action: 'resume' }).catch(() => {})
      }
    }
  }, [lectureMode, activeSessionId, timerPaused])

  // ─── Lecture mode: freeze the server clock when the page is closed ────
  // If the tab/browser is closed mid-session, tell the server to stop accruing
  // time so no study time is stored while the page is gone. Note: we do NOT
  // pause on visibilitychange, because lecture mode is meant to keep counting
  // while the tab sits in the background.
  useEffect(() => {
    if (!lectureMode || !activeSessionId || timerPaused) return
    const pauseOnUnload = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      try {
        fetch('/api/student/study-session', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ id: activeSessionId, mode: 'lecture', action: 'pause' }),
        }).catch(() => {})
      } catch {}
    }
    window.addEventListener('pagehide', pauseOnUnload)
    window.addEventListener('beforeunload', pauseOnUnload)
    return () => {
      window.removeEventListener('pagehide', pauseOnUnload)
      window.removeEventListener('beforeunload', pauseOnUnload)
    }
  }, [lectureMode, activeSessionId, timerPaused])

  // ─── Finalize session on the completion screen ────────────────────────
  // Stores any minutes the per-minute sync didn't get to and marks the session
  // completed (or not), along with the student's optional notes.
  const finalizeSession = useCallback(async (completed: boolean, notes?: string) => {
    const id = activeSessionId
    const cleanNotes = typeof notes === 'string' && notes.trim() ? notes.trim() : undefined

    if (lectureMode) {
      if (id) {
        try {
          await api.studentStartSession({
            id,
            mode: 'lecture',
            action: 'complete',
            completed,
            ...(cleanNotes ? { notes: cleanNotes } : {}),
          })
        } catch (err) {
          console.error('Finalize lecture session error:', err)
        }
      }
      setActiveSessionId(null)
      reportedMinRef.current = 0
      return
    }

    const finalDelta = Math.max(0, Math.floor((timerTotalSeconds - timerSeconds) / 60) - reportedMinRef.current)
    if (!id && finalDelta <= 0) {
      setActiveSessionId(null)
      reportedMinRef.current = 0
      return
    }
    try {
      await api.studentStartSession({
        ...(id ? { id } : {}),
        chapterId: selectedChapterId || undefined,
        durationMin: finalDelta,
        completed,
        ...(cleanNotes ? { notes: cleanNotes } : {}),
      })
    } catch (err) {
      console.error('Finalize session error:', err)
    }
    setActiveSessionId(null)
    reportedMinRef.current = 0
  }, [activeSessionId, timerTotalSeconds, timerSeconds, selectedChapterId, lectureMode])

  return (
    <TimerContext.Provider value={{
      selectedSubjectId, selectedChapterId, timerSeconds, timerTotalSeconds,
      timerRunning, timerPaused, timerCompleted, screenLocked, sessionQuote, chapterName,
      lectureMode, setLectureMode,
      setSelectedSubjectId, setSelectedChapterId, setTimerSeconds, setTimerTotalSeconds,
      setTimerRunning, setTimerPaused, setTimerCompleted, setSessionQuote, setChapterName,
      startTimer, resetTimer, finalizeSession,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider')
  return ctx
}
