'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart3, Users, Activity, UserPlus, Brain, Target, Clock,
  TrendingUp, TrendingDown, Minus, Trophy, Award, Zap, Flame,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────
interface OverviewData {
  totalStudents: number
  totalCourses: number
  totalQuizzes: number
  totalAttempts: number
  totalStudyMinutes: number
  activeStudentsThisWeek: number
  newStudentsThisMonth: number
}
interface GrowthPoint { month: string; count: number }
interface CourseDist { courseTitle: string; studentCount: number; percentage: number }
interface QuizPerf {
  quizTitle: string; difficulty: string; attempts: number; passRate: number; avgScore: number
}
interface DiffStat { difficulty: string; attempts: number; passRate: number; avgScore: number }
interface WeeklyAct { day: string; studyMinutes: number; quizAttempts: number }
interface TopPerf { fullName: string; score: number; courseTitle: string; studyMinutes: number }
interface Engagement {
  avgSessionDuration: number
  avgQuizzesPerStudent: number
  avgStudyMinutesPerDay: number
  retentionRate: number
}
interface AnalyticsData {
  overview: OverviewData
  studentGrowth: GrowthPoint[]
  courseDistribution: CourseDist[]
  quizPerformance: QuizPerf[]
  difficultyStats: DiffStat[]
  weeklyActivity: WeeklyAct[]
  topPerformers: TopPerf[]
  engagementMetrics: Engagement
}

// ─── Helpers ───────────────────────────────────────────────────────
const formatMin = (m: number) => {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}h ${r}m` : `${h}h`
}

const formatHours = (m: number) => {
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  return r > 0 ? `${h}h ${r}m` : `${h}h`
}

// ─── Section: Overview Stat Cards ──────────────────────────────────
function StatCard({
  icon: Icon, label, value, gradient, iconBg, trend, trendValue, delay,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  gradient: string
  iconBg: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  delay?: number
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-muted-foreground'
  return (
    <Card
      className="overflow-hidden relative card-lift anim-fade-up"
      style={{ animationDelay: `${delay || 0}ms` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg} mb-2`}>
              <Icon className="size-4" />
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider truncate">
              {label}
            </p>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${trendColor}`}>
              <TrendIcon className="size-3" />
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Chart: Student Growth (Area Chart) ────────────────────────────
function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  if (!data.length) return null

  const w = 560, h = 240, padL = 44, padR = 24, padT = 24, padB = 36
  const plotW = w - padL - padR, plotH = h - padT - padB
  const maxVal = Math.max(...data.map((d) => d.count), 1)
  // round max up to nearest 5
  const niceMax = Math.ceil(maxVal / 5) * 5
  const yScale = (v: number) => padT + plotH - (v / niceMax) * plotH
  const xScale = (i: number) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW)

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.count)}`).join(' ')
  const areaPath = linePath + ` L${xScale(data.length - 1)},${padT + plotH} L${padL},${padT + plotH} Z`
  const yTicks = 5
  const yStep = niceMax / yTicks

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>
        <defs>
          <linearGradient id="growthArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines + labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const val = Math.round(i * yStep)
          const y = yScale(val)
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4 4" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="10">{val}</text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#growthArea)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + hover hit areas + X labels */}
        {data.map((d, i) => {
          const x = xScale(i), y = yScale(d.count)
          const isHover = hoverIdx === i
          return (
            <g key={i}>
              <circle
                cx={x} cy={y} r={isHover ? 6 : 4}
                fill="#10b981"
                stroke="white" strokeWidth={isHover ? 2 : 1.5}
                className="transition-all"
              />
              <rect
                x={x - plotW / data.length / 2} y={padT} width={plotW / data.length} height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              <text x={x} y={h - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="11">{d.month}</text>
            </g>
          )
        })}

        {/* Tooltip */}
        {hoverIdx !== null && (() => {
          const d = data[hoverIdx]
          const x = xScale(hoverIdx), y = yScale(d.count)
          const tipW = 90, tipH = 38
          const tipX = Math.max(padL, Math.min(x - tipW / 2, w - padR - tipW))
          const tipY = Math.max(padT, y - tipH - 10)
          return (
            <g pointerEvents="none">
              <line x1={x} y1={y} x2={x} y2={padT + plotH} stroke="#10b981" strokeOpacity={0.3} strokeDasharray="3 3" />
              <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="6" fill="#0f172a" opacity="0.95" />
              <text x={tipX + tipW / 2} y={tipY + 15} textAnchor="middle" className="fill-white" fontSize="10" fontWeight="600">{d.month}</text>
              <text x={tipX + tipW / 2} y={tipY + 30} textAnchor="middle" className="fill-emerald-400" fontSize="12" fontWeight="700">{d.count} students</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

// ─── Chart: Course Distribution (Donut) ────────────────────────────
const DONUT_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#ec4899', '#14b8a6']

function DonutChart({ data }: { data: CourseDist[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BookOpenIcon className="size-8 mb-2 opacity-40" />
        <p className="text-sm">No course data</p>
      </div>
    )
  }
  const total = data.reduce((s, d) => s + d.studentCount, 0)
  const radius = 70
  const circumference = 2 * Math.PI * radius
  // Pre-compute offsets for each segment to avoid mutating during render
  const segments = data.reduce<{ key: number; color: string; dashLen: number; dashGap: number; offset: number }[]>(
    (acc, d, i) => {
      const fraction = total > 0 ? d.studentCount / total : 0
      const dashLen = fraction * circumference
      const dashGap = circumference - dashLen
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dashLen : 0
      acc.push({
        key: i,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
        dashLen,
        dashGap,
        offset: prevOffset,
      })
      return acc
    },
    [],
  )

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
          {/* Background ring */}
          <circle cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="22" />
          {segments.map((s) => (
            <circle
              key={s.key}
              cx="90" cy="90" r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={`${s.dashLen} ${s.dashGap}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
              className="transition-all duration-300"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Students</span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5 group">
            <div
              className="size-3 rounded-sm shrink-0 transition-transform group-hover:scale-125"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="text-sm flex-1 truncate">{d.courseTitle}</span>
            <span className="text-xs font-semibold tabular-nums">{d.studentCount}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function BookOpenIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

// ─── Section: Difficulty Performance Bars ──────────────────────────
const DIFF_CONFIG: Record<string, { label: string; barFrom: string; barTo: string; bg: string; text: string; dot: string }> = {
  easy:   { label: 'Easy',   barFrom: 'from-emerald-500', barTo: 'to-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  medium: { label: 'Medium', barFrom: 'from-amber-500',   barTo: 'to-amber-400',   bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500'   },
  hard:   { label: 'Hard',   barFrom: 'from-rose-500',    barTo: 'to-rose-400',    bg: 'bg-rose-500/10',    text: 'text-rose-600 dark:text-rose-400',      dot: 'bg-rose-500'    },
}

function DifficultyCard({ stat, delay }: { stat: DiffStat; delay: number }) {
  const cfg = DIFF_CONFIG[stat.difficulty] || DIFF_CONFIG.medium
  return (
    <Card className="card-lift anim-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${cfg.dot}`} />
            <span className="font-semibold capitalize">{cfg.label}</span>
          </div>
          <Badge variant="secondary" className="text-xs">{stat.attempts} attempts</Badge>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Pass Rate</span>
            <span className="font-semibold">{stat.passRate}%</span>
          </div>
          <Progress
            value={stat.passRate}
            className={`h-2 [&>div]:bg-gradient-to-r [&>div]:${cfg.barFrom} [&>div]:${cfg.barTo}`}
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t">
          <span className="text-muted-foreground">Avg Score</span>
          <span className={`font-semibold ${cfg.text}`}>{stat.avgScore}%</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Chart: Weekly Activity (Dual Bars) ────────────────────────────
function WeeklyActivityChart({ data }: { data: WeeklyAct[] }) {
  if (!data.length) return null
  const w = 560, h = 240, padL = 44, padR = 24, padT = 20, padB = 36
  const plotW = w - padL - padR, plotH = h - padT - padB
  const maxStudy = Math.max(...data.map((d) => d.studyMinutes), 1)
  const maxQuiz = Math.max(...data.map((d) => d.quizAttempts), 1)
  const niceMax = Math.ceil(Math.max(maxStudy, maxQuiz * 10) / 10) * 10 || 10
  // Use a shared scale: study minutes vs quiz attempts * 10 to balance visual
  const yScaleStudy = (v: number) => padT + plotH - (v / niceMax) * plotH
  const yScaleQuiz = (v: number) => padT + plotH - ((v * 10) / niceMax) * plotH
  const groupGap = plotW / data.length
  const barW = Math.min(14, groupGap / 3.5)
  const yTicks = 5
  const yStep = niceMax / yTicks

  return (
    <div>
      <div className="flex items-center justify-end gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" />
          <span className="text-[10px] text-muted-foreground">Study Minutes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-500" />
          <span className="text-[10px] text-muted-foreground">Quiz Attempts</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>
        {/* Grid */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const val = Math.round(i * yStep)
          const y = yScaleStudy(val)
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4 4" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="10">{val}</text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = padL + i * groupGap + groupGap / 2
          const studyH = (d.studyMinutes / niceMax) * plotH
          const quizH = ((d.quizAttempts * 10) / niceMax) * plotH
          const studyY = padT + plotH - studyH
          const quizY = padT + plotH - quizH
          return (
            <g key={i} className="transition-opacity">
              <rect x={cx - barW - 1} y={studyY} width={barW} height={Math.max(0, studyH)} fill="#10b981" rx="2" className="hover:opacity-80 transition-opacity" />
              <rect x={cx + 1} y={quizY} width={barW} height={Math.max(0, quizH)} fill="#f59e0b" rx="2" className="hover:opacity-80 transition-opacity" />
              <text x={cx} y={h - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="11">{d.day}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Section: Quiz Performance Table ───────────────────────────────
function passRateColor(rate: number) {
  if (rate >= 70) return { bar: '[&>div]:bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
  if (rate >= 50) return { bar: '[&>div]:bg-amber-500',   text: 'text-amber-600 dark:text-amber-400'   }
  return { bar: '[&>div]:bg-rose-500',  text: 'text-rose-600 dark:text-rose-400' }
}

type SortColumn = 'attempts' | 'passRate' | 'avgScore' | 'title'

function SortableHeader({
  col, sortBy, sortDir, onToggle, children,
}: {
  col: SortColumn
  sortBy: SortColumn
  sortDir: 'asc' | 'desc'
  onToggle: (col: SortColumn) => void
  children: React.ReactNode
}) {
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onToggle(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="text-[9px] text-muted-foreground/60">
          {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
    </TableHead>
  )
}

function QuizPerformanceTable({ data }: { data: QuizPerf[] }) {
  const [sortBy, setSortBy] = useState<SortColumn>('attempts')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (col: SortColumn) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir(col === 'title' ? 'asc' : 'desc') }
  }

  const sorted = [...data].sort((a, b) => {
    let diff: number
    if (sortBy === 'title') diff = a.quizTitle.localeCompare(b.quizTitle)
    else diff = (a[sortBy] as number) - (b[sortBy] as number)
    return sortDir === 'asc' ? diff : -diff
  })

  const diffBadge = (d: string) => {
    const cfg = DIFF_CONFIG[d] || DIFF_CONFIG.medium
    return (
      <Badge variant="secondary" className={`text-[10px] capitalize ${cfg.bg} ${cfg.text} border-transparent`}>
        <span className={`size-1.5 rounded-full ${cfg.dot} mr-1`} />
        {cfg.label}
      </Badge>
    )
  }

  if (!data.length) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Brain className="size-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No quiz performance data yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm">
      <div className="overflow-x-auto max-h-96 overflow-y-auto admin-scroll">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-gradient-to-r from-muted/60 to-muted/30">
              <SortableHeader col="title" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>Quiz Title</SortableHeader>
              <TableHead>Difficulty</TableHead>
              <SortableHeader col="attempts" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>Attempts</SortableHeader>
              <SortableHeader col="passRate" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>Pass Rate</SortableHeader>
              <SortableHeader col="avgScore" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>Avg Score</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((q, i) => {
              const colors = passRateColor(q.passRate)
              return (
                <TableRow key={i} className={`transition-all duration-150 hover:bg-muted/30 ${i % 2 === 1 ? 'bg-muted/8' : ''}`}>
                  <TableCell className="font-medium max-w-[280px] truncate" title={q.quizTitle}>{q.quizTitle}</TableCell>
                  <TableCell>{diffBadge(q.difficulty)}</TableCell>
                  <TableCell className="tabular-nums">{q.attempts}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={q.passRate} className={`h-1.5 w-20 ${colors.bar}`} />
                      <span className={`text-xs font-semibold ${colors.text} tabular-nums`}>{q.passRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className={`font-semibold tabular-nums ${q.avgScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : q.avgScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {q.avgScore}%
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Section: Top Performers List ──────────────────────────────────
const RANK_STYLES: Record<number, { medal: string; ring: string; text: string }> = {
  1: { medal: '🥇', ring: 'ring-amber-400/60 bg-gradient-to-br from-amber-400/15 to-amber-500/5', text: 'text-amber-600 dark:text-amber-400' },
  2: { medal: '🥈', ring: 'ring-slate-300/60 bg-gradient-to-br from-slate-300/15 to-slate-400/5', text: 'text-slate-600 dark:text-slate-300' },
  3: { medal: '🥉', ring: 'ring-orange-400/50 bg-gradient-to-br from-orange-400/15 to-orange-500/5', text: 'text-orange-600 dark:text-orange-400' },
}

function TopPerformersList({ data }: { data: TopPerf[] }) {
  if (!data.length) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Trophy className="size-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No performers yet</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {data.map((p, i) => {
        const rank = i + 1
        const style = RANK_STYLES[rank]
        return (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors anim-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-center shrink-0">
              {style ? (
                <div className={`flex size-9 items-center justify-center rounded-full text-lg ring-2 ${style.ring}`}>
                  {style.medal}
                </div>
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {rank}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{p.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{p.courseTitle}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <Trophy className="size-3" />
                  {p.score}
                </div>
                <p className="text-[10px] text-muted-foreground">points</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="size-3" />
                  {Math.round(p.studyMinutes / 60)}h
                </div>
                <p className="text-[10px] text-muted-foreground">studied</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Engagement Metric Card ────────────────────────────────────────
function EngagementCard({
  icon: Icon, label, value, suffix, color, delay,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  suffix?: string
  color: string
  delay?: number
}) {
  return (
    <Card className="card-lift anim-fade-up" style={{ animationDelay: `${delay || 0}ms` }}>
      <CardContent className="p-4">
        <div className={`flex size-9 items-center justify-center rounded-xl ${color} mb-2`}>
          <Icon className="size-4" />
        </div>
        <p className="text-2xl font-bold tracking-tight">
          {value}
          {suffix && <span className="text-sm font-medium text-muted-foreground ml-1">{suffix}</span>}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl shimmer-bg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48 shimmer-bg" />
          <Skeleton className="h-3 w-36 shimmer-bg" />
        </div>
      </div>
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl shimmer-bg" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      {/* Growth chart */}
      <Skeleton className="h-64 w-full rounded-xl shimmer-bg" />
      {/* Donut + difficulty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl shimmer-bg" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl shimmer-bg" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
      {/* Weekly activity */}
      <Skeleton className="h-64 w-full rounded-xl shimmer-bg" />
      {/* Quiz performance */}
      <Skeleton className="h-72 w-full rounded-xl shimmer-bg" />
      {/* Engagement */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl shimmer-bg" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      {/* Top performers */}
      <Skeleton className="h-72 w-full rounded-xl shimmer-bg" />
    </div>
  )
}

// ─── Main AnalyticsPage ────────────────────────────────────────────
export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.adminAnalytics()
      setData(result)
    } catch (err: any) {
      console.error('Analytics fetch error:', err)
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) return <LoadingSkeleton />

  if (error || !data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
            <BarChart3 className="size-7 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold text-muted-foreground mb-1">Unable to load analytics</h3>
          <p className="text-sm text-muted-foreground/70 mb-4">{error || 'Please try again later.'}</p>
          <button
            onClick={fetchAnalytics}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  const { overview, studentGrowth, courseDistribution, quizPerformance, difficultyStats, weeklyActivity, topPerformers, engagementMetrics } = data

  // Compute simple trend indicators (current vs previous month)
  const lastMonthGrowth = studentGrowth[studentGrowth.length - 1]?.count || 0
  const prevMonthGrowth = studentGrowth[studentGrowth.length - 2]?.count || 0
  const growthTrend: 'up' | 'down' | 'neutral' = lastMonthGrowth > prevMonthGrowth
    ? 'up'
    : lastMonthGrowth < prevMonthGrowth
    ? 'down'
    : 'neutral'
  const growthDiff = Math.abs(lastMonthGrowth - prevMonthGrowth)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="anim-slide-down">
        <Card className="overflow-hidden relative card-lift">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent" />
          <CardContent className="p-5 relative">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-white/10 shrink-0">
                <BarChart3 className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight">Analytics Dashboard</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing data for the last 6 months · Updated {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Users} label="Total Students" value={overview.totalStudents}
          gradient="from-slate-500 to-slate-600" iconBg="bg-slate-500/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300"
          trend={growthTrend} trendValue={`${growthDiff} vs last mo`}
          delay={0}
        />
        <StatCard
          icon={Activity} label="Active This Week" value={overview.activeStudentsThisWeek}
          gradient="from-emerald-500 to-teal-500" iconBg="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          trend={overview.activeStudentsThisWeek > 0 ? 'up' : 'neutral'} trendValue={`${overview.totalStudents > 0 ? Math.round((overview.activeStudentsThisWeek / overview.totalStudents) * 100) : 0}%`}
          delay={40}
        />
        <StatCard
          icon={UserPlus} label="New This Month" value={overview.newStudentsThisMonth}
          gradient="from-amber-500 to-orange-500" iconBg="bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
          trend={overview.newStudentsThisMonth > 0 ? 'up' : 'neutral'} trendValue="this month"
          delay={80}
        />
        <StatCard
          icon={Brain} label="Total Quizzes" value={overview.totalQuizzes}
          gradient="from-purple-500 to-violet-500" iconBg="bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
          delay={120}
        />
        <StatCard
          icon={Target} label="Total Attempts" value={overview.totalAttempts}
          gradient="from-sky-500 to-cyan-500" iconBg="bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
          trend={overview.totalAttempts > 0 ? 'up' : 'neutral'} trendValue="all-time"
          delay={160}
        />
        <StatCard
          icon={Clock} label="Total Study Hours" value={Math.round(overview.totalStudyMinutes / 60)}
          gradient="from-rose-500 to-pink-500" iconBg="bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
          trend={overview.totalStudyMinutes > 0 ? 'up' : 'neutral'} trendValue={formatHours(overview.totalStudyMinutes)}
          delay={200}
        />
      </div>

      {/* Section 2: Student Growth Chart */}
      <Card className="card-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" />
            Student Growth
          </CardTitle>
          <CardDescription>New student signups over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <GrowthChart data={studentGrowth} />
        </CardContent>
      </Card>

      {/* Section 3: Course Distribution + Difficulty Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpenIcon className="size-4 text-violet-500" />
              Course Distribution
            </CardTitle>
            <CardDescription>Student enrollment across courses</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={courseDistribution} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-purple-500" />
            <h3 className="text-base font-semibold">Difficulty Performance</h3>
          </div>
          {difficultyStats.map((stat, i) => (
            <DifficultyCard key={stat.difficulty} stat={stat} delay={i * 60} />
          ))}
        </div>
      </div>

      {/* Section 4: Weekly Activity */}
      <Card className="card-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4 text-emerald-500" />
            Weekly Activity
          </CardTitle>
          <CardDescription>Aggregated study minutes and quiz attempts by day of week (last 90 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyActivityChart data={weeklyActivity} />
        </CardContent>
      </Card>

      {/* Section 5: Quiz Performance Table */}
      <Card className="card-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="size-4 text-sky-500" />
            Quiz Performance
          </CardTitle>
          <CardDescription>Performance breakdown for all quizzes · Click column headers to sort</CardDescription>
        </CardHeader>
        <CardContent>
          <QuizPerformanceTable data={quizPerformance} />
        </CardContent>
      </Card>

      {/* Section 6: Engagement Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-amber-500" />
          <h3 className="text-base font-semibold">Engagement Metrics</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <EngagementCard
            icon={Clock} label="Avg Session Duration" value={engagementMetrics.avgSessionDuration}
            suffix="min" color="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
            delay={0}
          />
          <EngagementCard
            icon={Brain} label="Avg Quizzes per Student" value={engagementMetrics.avgQuizzesPerStudent}
            color="bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
            delay={60}
          />
          <EngagementCard
            icon={Activity} label="Avg Study Minutes per Day" value={engagementMetrics.avgStudyMinutesPerDay}
            suffix="min" color="bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
            delay={120}
          />
          <EngagementCard
            icon={Flame} label="Retention Rate" value={engagementMetrics.retentionRate}
            suffix="%" color="bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
            delay={180}
          />
        </div>
      </div>

      {/* Section 7: Top Performers */}
      <Card className="card-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="size-4 text-amber-500" />
            Top Performers
          </CardTitle>
          <CardDescription>Top 5 students by score, streak, and study time</CardDescription>
        </CardHeader>
        <CardContent>
          <TopPerformersList data={topPerformers} />
        </CardContent>
      </Card>
    </div>
  )
}
