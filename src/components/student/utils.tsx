'use client'

import { useState, useEffect, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── CSS Animations (injected once) ─────────────────────────────────────

export const CSS_ANIMATIONS = `
@keyframes firePulse {
  0% { transform: scale(1); filter: brightness(1); }
  25% { transform: scale(1.3); filter: brightness(1.5) drop-shadow(0 0 8px #f97316); }
  50% { transform: scale(1.1); filter: brightness(1.8) drop-shadow(0 0 16px #ef4444); }
  75% { transform: scale(1.25); filter: brightness(1.3) drop-shadow(0 0 12px #f59e0b); }
  100% { transform: scale(1); filter: brightness(1); }
}
.fire-animate { animation: firePulse 0.8s ease-in-out; }

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.badge-shimmer { background-size: 200% 100%; animation: shimmer 3s ease-in-out infinite; }

@keyframes confetti-fall {
  0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
.confetti-piece {
  position: fixed; width: 10px; height: 10px; z-index: 9999; pointer-events: none;
  animation: confetti-fall 2.5s ease-in forwards;
}

@keyframes screen-flash {
  0% { opacity: 0; } 15% { opacity: 0.4; } 100% { opacity: 0; }
}
.strike-flash { animation: screen-flash 0.6s ease-out forwards; }

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.4), 0 0 16px rgba(59,130,246,0.2); }
  50% { box-shadow: 0 0 16px rgba(59,130,246,0.6), 0 0 32px rgba(59,130,246,0.3); }
}
.verified-glow { animation: glow-pulse 2s ease-in-out infinite; }

@keyframes celebration-burst {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.celebration-burst { animation: celebration-burst 0.6s ease-out forwards; }

@keyframes float-particle {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-40px) scale(0); opacity: 0; }
}
.flame-particle {
  position: absolute; width: 6px; height: 6px; border-radius: 50%;
  animation: float-particle 0.8s ease-out forwards; pointer-events: none;
}

@keyframes page-fade-in {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
.page-transition { animation: page-fade-in 0.2s ease-out forwards; }

@keyframes slide-in-left {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
.sidebar-slide-in { animation: slide-in-left 0.3s ease-out forwards; }

@keyframes fade-in {
  0% { opacity: 0; } 100% { opacity: 1; }
}
.fade-in { animation: fade-in 0.2s ease-out forwards; }

@keyframes grow-in {
  0% { opacity: 0; max-height: 0; } 100% { opacity: 1; max-height: 500px; }
}
.grow-in { animation: grow-in 0.3s ease-out forwards; overflow: hidden; }

@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.pop-in { animation: pop-in 0.4s ease-out forwards; }

.card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.card-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.card-hover:active { transform: scale(0.98); }

.nav-active-indicator { transition: all 0.3s ease; }

@keyframes pulse-check {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(249,115,22,0); }
}
.pulse-check { animation: pulse-check 2s ease-in-out infinite; }

@keyframes shimmer-bar {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.shimmer-bar { animation: shimmer-bar 1.5s ease-in-out infinite; }

@keyframes score-reveal {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
.score-reveal { animation: score-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

@keyframes check-pop {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
.check-pop { animation: check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

@keyframes accordion-open {
  0% { height: 0; opacity: 0; }
  100% { height: var(--radix-accordion-content-height); opacity: 1; }
}
@keyframes accordion-close {
  0% { height: var(--radix-accordion-content-height); opacity: 1; }
  100% { height: 0; opacity: 0; }
}

@keyframes pin-bounce {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-15deg) scale(1.2); }
  50% { transform: rotate(10deg) scale(1.1); }
  100% { transform: rotate(0deg) scale(1); }
}
.pin-bounce { animation: pin-bounce 0.4s ease-out forwards; }

@keyframes slide-up {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
.slide-up { animation: slide-up 0.3s ease-out forwards; }

@keyframes bar-grow {
  0% { transform: scaleY(0); }
  100% { transform: scaleY(1); }
}
.bar-grow { transform-origin: bottom; animation: bar-grow 0.5s ease-out forwards; }

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }

/* Focus ring for accessibility */
.focus-ring:focus-visible { outline: 2px solid #64748b; outline-offset: 2px; border-radius: 4px; }
`

// ─── Constants ──────────────────────────────────────────────────────────

export const MOTIVATIONAL_QUOTES = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
]

export const SESSION_QUOTES = [
  "Let's crush this study session! 💪", "Focus mode: ACTIVATED 🎯",
  "One chapter at a time, you've got this! 📚", "Today's effort = Tomorrow's success ⭐",
  "Deep breath. Let's begin. 🧘", "Knowledge is power - let's power up! ⚡",
  "Small steps lead to big results 🚀", "Your future self will thank you 🌟",
]

export const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Arjun Sharma', score: 2840, streak: 14 },
  { rank: 2, name: 'Priya Patel', score: 2360, streak: 11 },
  { rank: 3, name: 'Rahul Verma', score: 1920, streak: 8 },
  { rank: 4, name: 'Ananya Singh', score: 1650, streak: 7 },
  { rank: 5, name: 'Vikram Joshi', score: 1480, streak: 5 },
]

// ─── Helpers ────────────────────────────────────────────────────────────

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Circular Progress Ring ─────────────────────────────────────────────

export function CircularProgressRing({
  size = 120, strokeWidth = 8, progress = 0, color = '#10b981',
  trackColor = 'rgba(100,116,139,0.2)', children, className = '',
}: {
  size?: number; strokeWidth?: number; progress?: number; color?: string
  trackColor?: string; children?: React.ReactNode; className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference
  const center = size / 2

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle cx={center} cy={center} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

// ─── Timer Countdown Ring ───────────────────────────────────────────────

export function TimerCountdownRing({
  size = 240, strokeWidth = 10, totalSeconds = 0, remainingSeconds = 0,
}: {
  size?: number; strokeWidth?: number; totalSeconds?: number; remainingSeconds?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0
  const offset = circumference - progress * circumference
  const center = size / 2

  let ringColor = '#10b981', glowColor = 'rgba(16,185,129,0.3)'
  if (progress < 0.25) { ringColor = '#ef4444'; glowColor = 'rgba(239,68,68,0.4)' }
  else if (progress < 0.5) { ringColor = '#f59e0b'; glowColor = 'rgba(245,158,11,0.3)' }

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={center} cy={center} r={radius + 4} stroke={glowColor}
        strokeWidth={strokeWidth + 8} fill="none" className="blur-sm" />
      <circle cx={center} cy={center} r={radius} stroke="rgba(100,116,139,0.15)"
        strokeWidth={strokeWidth} fill="none" />
      <circle cx={center} cy={center} r={radius} stroke={ringColor} strokeWidth={strokeWidth}
        fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 2s ease', filter: `drop-shadow(0 0 8px ${glowColor})` }} />
      {Array.from({ length: 60 }).map((_, i) => {
        const angle = (i / 60) * 360
        const isMajor = i % 5 === 0
        const innerR = radius - (isMajor ? 18 : 14)
        const outerR = radius - 12
        const rad = (angle * Math.PI) / 180
        return (
          <line key={i}
            x1={center + innerR * Math.cos(rad)} y1={center + innerR * Math.sin(rad)}
            x2={center + outerR * Math.cos(rad)} y2={center + outerR * Math.sin(rad)}
            stroke={isMajor ? 'rgba(100,116,139,0.3)' : 'rgba(100,116,139,0.15)'}
            strokeWidth={isMajor ? 2 : 1} transform={`rotate(90, ${center}, ${center})`} />
        )
      })}
    </svg>
  )
}

// ─── Confetti ───────────────────────────────────────────────────────────

export function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo(() => {
    if (!active) return []
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i, x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8, size: Math.random() * 8 + 5,
    }))
  }, [active])

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setVisible(true)
      const timeout = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timeout)
    } else { setVisible(false) }
  }, [active])

  if (!visible || pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece"
          style={{ left: `${p.x}%`, backgroundColor: p.color, width: `${p.size}px`,
            height: `${p.size}px`, borderRadius: p.id % 2 ? '50%' : '2px', animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  )
}

// ─── Study Heatmap ──────────────────────────────────────────────────────

export function StudyHeatmap({ data }: { data: Record<string, number> }) {
  const today = new Date()
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(); d.setDate(today.getDate() - (29 - i)); return formatDate(d)
  })
  const maxMin = Math.max(...Object.values(data), 1)

  const getColor = (minutes: number) => {
    if (minutes === 0) return 'bg-slate-100 dark:bg-slate-800'
    const intensity = minutes / maxMin
    if (intensity < 0.25) return 'bg-emerald-200 dark:bg-emerald-900'
    if (intensity < 0.5) return 'bg-emerald-300 dark:bg-emerald-700'
    if (intensity < 0.75) return 'bg-emerald-400 dark:bg-emerald-600'
    return 'bg-emerald-500 dark:bg-emerald-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        <div className="flex flex-col gap-0.5">
          {days.map((day, i) => {
            const minutes = data[day] || 0
            return (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`w-4 h-4 rounded-[2px] ${getColor(minutes)} cursor-pointer transition-colors hover:ring-1 hover:ring-slate-400`} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <p className="text-slate-400">{minutes > 0 ? formatMinutes(minutes) : 'No study'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-[2px] bg-slate-100 dark:bg-slate-800" />
        <div className="w-3 h-3 rounded-[2px] bg-emerald-200 dark:bg-emerald-900" />
        <div className="w-3 h-3 rounded-[2px] bg-emerald-300 dark:bg-emerald-700" />
        <div className="w-3 h-3 rounded-[2px] bg-emerald-400 dark:bg-emerald-600" />
        <div className="w-3 h-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
