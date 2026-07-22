'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  History, Brain, CheckCircle2, XCircle, TrendingUp, Trophy, Target,
  ChevronLeft, ChevronRight, BookOpen, Calendar, Sparkles, BarChart3,
} from 'lucide-react'
import { api } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────

interface QuizAttemptItem {
  id: string
  quizId: string
  quizTitle: string
  quizDifficulty: 'easy' | 'medium' | 'hard' | string
  courseTitle: string
  subjectTitle: string | null
  score: number
  totalQuestions: number
  percentage: number
  passed: boolean
  pointsEarned: number
  answers: string
  createdAt: string
}

interface DifficultyStat {
  attempts: number
  passed: number
  avgScore: number
}

interface QuizHistoryStats {
  totalAttempts: number
  totalPassed: number
  totalFailed: number
  passRate: number
  avgScore: number
  totalPointsEarned: number
  bestStreak: number
  byDifficulty: Record<string, DifficultyStat>
  recentTrend: { date: string; attempts: number; avgScore: number }[]
}

interface QuizHistoryData {
  attempts: QuizAttemptItem[]
  stats: QuizHistoryStats
  totalPages: number
  currentPage: number
}

// ─── Constants ────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<string, {
  label: string
  badge: string
  dot: string
  barFrom: string
  barTo: string
  text: string
  ring: string
}> = {
  easy: {
    label: 'Easy',
    badge: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    barFrom: 'from-emerald-500',
    barTo: 'to-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  medium: {
    label: 'Medium',
    badge: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    barFrom: 'from-amber-500',
    barTo: 'to-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  hard: {
    label: 'Hard',
    badge: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
    barFrom: 'from-rose-500',
    barTo: 'to-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-200 dark:ring-rose-800',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Main Component ───────────────────────────────────────────────────

export function QuizHistoryPage() {
  const [data, setData] = useState<QuizHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])

  // Filters
  const [courseId, setCourseId] = useState<string>('all')
  const [difficulty, setDifficulty] = useState<string>('all')
  const [passed, setPassed] = useState<string>('all')
  const [page, setPage] = useState<number>(1)

  const PAGE_LIMIT = 10

  // Fetch courses for the filter dropdown (public list)
  useEffect(() => {
    let mounted = true
    async function fetchCourses() {
      try {
        const result = await api.publicCourses()
        const list = (result.courses || []) as { id: string; title: string }[]
        if (mounted) setCourses(list)
      } catch (err) {
        console.error('Failed to fetch courses for filter:', err)
      }
    }
    fetchCourses()
    return () => { mounted = false }
  }, [])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const result = (await api.studentQuizHistory({
        courseId: courseId !== 'all' ? courseId : undefined,
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        passed: passed !== 'all' ? passed : undefined,
        page,
        limit: PAGE_LIMIT,
      })) as QuizHistoryData
      setData(result)
    } catch (err) {
      console.error('Quiz history fetch error:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [courseId, difficulty, passed, page])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [courseId, difficulty, passed])

  // ─── Loading state ─────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const attempts = data?.attempts || []
  const totalPages = data?.totalPages || 1
  const currentPage = data?.currentPage || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 dark:from-slate-100 dark:via-slate-200 dark:to-slate-300 p-6 shadow-lg">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 dark:bg-amber-500/20 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-emerald-400/10 dark:bg-emerald-500/20 rounded-full translate-y-1/2 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700 flex items-center justify-center shadow-md flex-shrink-0">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white dark:text-slate-900 tracking-tight">
              Quiz History
            </h2>
            <p className="text-xs md:text-sm text-white/70 dark:text-slate-600 mt-0.5">
              Review your past attempts, track progress & find areas to improve
            </p>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Brain}
          label="Total Attempts"
          value={stats ? String(stats.totalAttempts) : '—'}
          sub={stats ? `${stats.totalPassed} passed · ${stats.totalFailed} failed` : 'Loading…'}
          gradient="from-slate-500/15 to-slate-400/5"
          iconBg="bg-slate-500/20 text-slate-600 dark:text-slate-300"
        />
        <StatCard
          icon={CheckCircle2}
          label="Pass Rate"
          value={stats ? `${stats.passRate}%` : '—'}
          sub={stats && stats.totalAttempts > 0 ? `${stats.totalPassed}/${stats.totalAttempts} cleared` : 'No data yet'}
          gradient="from-emerald-500/15 to-emerald-400/5"
          iconBg="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Score"
          value={stats ? `${stats.avgScore}%` : '—'}
          sub={stats && stats.bestStreak > 0 ? `Best streak: ${stats.bestStreak}✓` : 'Keep going!'}
          gradient="from-amber-500/15 to-amber-400/5"
          iconBg="bg-amber-500/20 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={Trophy}
          label="Points Earned"
          value={stats ? String(stats.totalPointsEarned) : '—'}
          sub="From quiz attempts"
          gradient="from-orange-500/15 to-orange-400/5"
          iconBg="bg-orange-500/20 text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FilterField label="Course">
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Difficulty">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Result">
              <Select value={passed} onValueChange={setPassed}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="true">Passed Only</SelectItem>
                  <SelectItem value="false">Failed Only</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Breakdown + Recent Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Difficulty breakdown - spans 2 cols on lg */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-500" />
              Performance by Difficulty
            </CardTitle>
            <CardDescription className="text-xs">
              Pass rate and average score across difficulty levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((diff) => {
                const d = stats?.byDifficulty?.[diff] || { attempts: 0, passed: 0, avgScore: 0 }
                const cfg = DIFFICULTY_CONFIG[diff]
                const passRate = d.attempts > 0 ? Math.round((d.passed / d.attempts) * 100) : 0
                return (
                  <div
                    key={diff}
                    className={`p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.badge}`}>
                        {d.attempts} attempts
                      </Badge>
                    </div>
                    <p className={`text-2xl font-bold ${cfg.text}`}>
                      {d.attempts > 0 ? `${d.avgScore}%` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {d.passed} passed · {d.attempts - d.passed} failed
                    </p>
                    <div className="mt-2.5">
                      <Progress value={passRate} className="h-1.5" />
                      <p className="text-[10px] text-slate-400 mt-1">{passRate}% pass rate</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Trend - last 7 days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Last 7 Days
            </CardTitle>
            <CardDescription className="text-xs">Average score per day</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTrendChart trend={stats?.recentTrend || []} />
          </CardContent>
        </Card>
      </div>

      {/* Attempts List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Quiz Attempts
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Page {currentPage} of {totalPages} · showing {attempts.length} of{' '}
                {stats?.totalAttempts || 0} total
              </CardDescription>
            </div>
            {(courseId !== 'all' || difficulty !== 'all' || passed !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCourseId('all')
                  setDifficulty('all')
                  setPassed('all')
                }}
                className="h-8 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : attempts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="px-4 pb-4 space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
              {attempts.map((a, idx) => (
                <AttemptCard key={a.id} attempt={a} index={idx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && !loading && attempts.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="font-medium text-slate-700 dark:text-slate-300">{currentPage}</span> of{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="h-8"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub Components ───────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  iconBg,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  gradient: string
  iconBg: string
}) {
  return (
    <Card className="overflow-hidden relative group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100`} />
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-md group-hover:scale-150 transition-transform duration-300" />
      <CardContent className="p-4 relative">
        <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg} mb-2.5 shadow-sm`}>
          <Icon className="size-4" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function RecentTrendChart({ trend }: { trend: { date: string; attempts: number; avgScore: number }[] }) {
  const maxScore = 100
  const hasData = trend.some((d) => d.attempts > 0)
  const maxAttempts = Math.max(...trend.map((d) => d.attempts), 1)

  if (!hasData) {
    return (
      <div className="py-8 text-center">
        <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400">No quiz attempts in the last 7 days</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5 h-32">
        {trend.map((d, i) => {
          const heightPct = (d.avgScore / maxScore) * 100
          const hasAttempts = d.attempts > 0
          const intensity = d.attempts / maxAttempts
          // Color intensity based on score: higher score = deeper emerald
          const barColor = !hasAttempts
            ? 'bg-slate-100 dark:bg-slate-800'
            : d.avgScore >= 75
              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
              : d.avgScore >= 50
                ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                : 'bg-gradient-to-t from-rose-500 to-rose-400'
          return (
            <div key={i} className="flex-1 group relative flex flex-col items-center">
              <div className="w-full h-full flex items-end">
                <div
                  className={`w-full rounded-t transition-all duration-300 ${barColor}`}
                  style={{
                    height: `${hasAttempts ? Math.max(heightPct, 8) : 0}%`,
                    minHeight: hasAttempts ? '6px' : '0',
                    opacity: hasAttempts ? 0.4 + intensity * 0.6 : 1,
                  }}
                />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {formatShortDate(d.date)}: {hasAttempts ? `${d.avgScore}% · ${d.attempts} attempt(s)` : 'No attempts'}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        {trend.map((d, i) => (
          <span key={i} className="flex-1 text-center">
            {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span>Range: 0–100%</span>
        <span>{trend.reduce((s, d) => s + d.attempts, 0)} total attempts</span>
      </div>
    </div>
  )
}

function AttemptCard({ attempt, index }: { attempt: QuizAttemptItem; index: number }) {
  const cfg = DIFFICULTY_CONFIG[attempt.quizDifficulty] || DIFFICULTY_CONFIG.medium
  const isPass = attempt.passed

  // Parse answers for the breakdown preview
  const answers = useMemo(() => {
    try {
      const parsed = JSON.parse(attempt.answers)
      return Array.isArray(parsed) ? (parsed as number[]) : []
    } catch {
      return []
    }
  }, [attempt.answers])

  const correctCount = attempt.score
  const incorrectCount = Math.max(0, attempt.totalQuestions - attempt.score)

  return (
    <div
      className={`relative rounded-xl border transition-all slide-up hover:shadow-sm ${
        isPass
          ? 'border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-950/10 dark:to-slate-900'
          : 'border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/40 to-white dark:from-rose-950/10 dark:to-slate-900'
      }`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Pass/Fail indicator stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isPass ? 'bg-emerald-500' : 'bg-rose-500'}`} />

      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Pass/Fail icon badge */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              isPass
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-rose-100 dark:bg-rose-900/40'
            }`}
          >
            {isPass ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
                  {attempt.quizTitle}
                </h3>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                  <BookOpen className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{attempt.courseTitle}</span>
                  {attempt.subjectTitle && (
                    <>
                      <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
                      <span className="truncate">{attempt.subjectTitle}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Percentage - large and color-coded */}
              <div className="text-right flex-shrink-0">
                <p
                  className={`text-lg sm:text-2xl font-bold leading-none ${
                    isPass
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {attempt.percentage}%
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isPass ? 'Passed' : 'Failed'}
                </p>
              </div>
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${cfg.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
                {cfg.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                Score: {attempt.score}/{attempt.totalQuestions}
              </Badge>
              {attempt.pointsEarned > 0 && (
                <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800">
                  <Trophy className="w-3 h-3 mr-0.5" /> +{attempt.pointsEarned} pts
                </Badge>
              )}
            </div>

            {/* Answer breakdown mini-bar */}
            {answers.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(correctCount / attempt.totalQuestions) * 100}%` }}
                    />
                    <div
                      className="bg-rose-400/70 dark:bg-rose-500/60 transition-all"
                      style={{ width: `${(incorrectCount / attempt.totalQuestions) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {correctCount}✓ · {incorrectCount}✗
                  </span>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{formatDateTime(attempt.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-16 text-center px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 mb-4">
        <History className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
        No quiz attempts found
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
        {`You haven't taken any quizzes matching these filters yet. Head over to the Quizzes tab to start practicing and your attempts will appear here.`}
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Tip: Try clearing filters to see all attempts</span>
      </div>
    </div>
  )
}
