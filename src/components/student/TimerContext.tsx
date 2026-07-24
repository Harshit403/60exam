'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'

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
}

const TimerContext = createContext<TimerContextType | null>(null)

function saveTimerState(state: TimerPersistState) {
  try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function loadTimerState(): TimerPersistState | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as TimerPersistState
    if (state.timerRunning && !state.timerPaused && state.timerSeconds > 0) {
      const elapsed = Math.floor((Date.now() - state.timestamp) / 1000)
      state.timerSeconds = Math.max(0, state.timerSeconds - elapsed)
    }
    return state
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
  const [screenLocked, setScreenLocked] = useState(false)

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Restore timer from localStorage on mount ────────────────────────
  useEffect(() => {
    const saved = loadTimerState()
    if (saved && saved.timerSeconds > 0) {
      setSelectedSubjectId(saved.selectedSubjectId)
      setSelectedChapterId(saved.selectedChapterId)
      setChapterName(saved.chapterName)
      setTimerTotalSeconds(saved.timerTotalSeconds)
      setSessionQuote(saved.sessionQuote)
      if (saved.timerRunning && !saved.timerPaused) {
        if (saved.timerSeconds <= 0) {
          setTimerSeconds(0)
          setTimerRunning(false)
          setTimerCompleted(true)
        } else {
          setTimerSeconds(saved.timerSeconds)
          setTimerRunning(true)
        }
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
      })
    } else if (timerSeconds === 0 && timerTotalSeconds === 0) {
      clearTimerState()
    }
  }, [selectedSubjectId, selectedChapterId, timerSeconds, timerTotalSeconds, timerRunning, timerPaused, sessionQuote, chapterName])

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

  // ─── Timer Interval ──────────────────────────────────────────────────
  useEffect(() => {
    if (timerRunning && !timerPaused && timerSeconds > 0) {
      timerInterval.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false)
            setTimerCompleted(true)
            clearTimerState()
            if (timerInterval.current) {
              clearInterval(timerInterval.current)
              timerInterval.current = null
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
        timerInterval.current = null
      }
    }
  }, [timerRunning, timerPaused, timerSeconds])

  const startTimer = useCallback((minutes: number) => {
    if (minutes <= 0) return
    setTimerTotalSeconds(minutes * 60)
    setTimerSeconds(minutes * 60)
    setTimerRunning(true)
    setTimerPaused(false)
    setTimerCompleted(false)
  }, [])

  const resetTimer = useCallback(() => {
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerSeconds(0)
    setTimerTotalSeconds(0)
    setTimerCompleted(false)
    setSessionQuote('')
    setChapterName('')
    clearTimerState()
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
  }, [])

  return (
    <TimerContext.Provider value={{
      selectedSubjectId, selectedChapterId, timerSeconds, timerTotalSeconds,
      timerRunning, timerPaused, timerCompleted, screenLocked, sessionQuote, chapterName,
      setSelectedSubjectId, setSelectedChapterId, setTimerSeconds, setTimerTotalSeconds,
      setTimerRunning, setTimerPaused, setTimerCompleted, setSessionQuote, setChapterName,
      startTimer, resetTimer,
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
