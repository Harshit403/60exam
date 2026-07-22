'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { BarChart3, TrendingUp, Clock, Brain, Trophy, Target, Flame, Calendar, Award, BookOpen, CheckCircle2, X } from 'lucide-react'
import { api } from '@/lib/api-client'

interface AnalyticsData {
  student: {
    score: number; totalStudyMin: number; currentStreak: number; verified: boolean
    courseTitle: string; memberSince: string
  }
  summary: {
    totalSessions: number; totalCompletedSessions: number; avgSessionLength: number
    studyDays: number; longestStreak: number; totalQuizAttempts: number
    quizPassRate: number; totalQuizPoints: number
  }
  dailyStudy: { date: string; minutes: number; sessions: number }[]
  weeklyStudy: { week: string; minutes: number }[]
  subjectDistribution: { name: string; minutes: number; sessions: number }[]
  quizTimeline: { id: string; date: string; quizTitle: string; score: number; total: number; percentage: number; passed: boolean; pointsEarned: number; difficulty: string }[]
  difficultyStats: { difficulty: string; attempts: number; passed: number; failed: number; passRate: number; avgScore: number }[]
  nextAchievements: { id: string; name: string; description: string; icon: string | null; threshold: number; progress: number; remaining: number }[]
  activityCalendar: { date: string; count: number; minutes: number }[]
  unlockedAchievementsCount: number
  totalAchievements: number
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10b981', medium: '#f59e0b', hard: '#ef4444',
}

const formatMin = (m: number) => {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}h ${r}m` : `${h}h`
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.studentAnalytics()
      setData(result)
    } catch (err) { console.error('Analytics fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500">Unable to load analytics</p>
        </CardContent>
      </Card>
    )
  }

  const { student, summary, dailyStudy, weeklyStudy, subjectDistribution, quizTimeline, difficultyStats, nextAchievements, activityCalendar } = data

  // Calculate max for scaling charts
  const maxDailyMin = Math.max(...dailyStudy.map(d => d.minutes), 1)
  const maxWeeklyMin = Math.max(...weeklyStudy.map(w => w.minutes), 1)
  const maxSubjectMin = Math.max(...subjectDistribution.map(s => s.minutes), 1)

  // Activity calendar colors
  const getActivityColor = (minutes: number) => {
    if (minutes === 0) return 'bg-slate-100 dark:bg-slate-800'
    if (minutes < 30) return 'bg-emerald-200 dark:bg-emerald-900'
    if (minutes < 60) return 'bg-emerald-300 dark:bg-emerald-700'
    if (minutes < 120) return 'bg-emerald-400 dark:bg-emerald-600'
    return 'bg-emerald-500 dark:bg-emerald-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-sm">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Study Analytics</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track your progress & performance over time</p>
        </div>
      </div>

      {/* Summary Stat Cards - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Total Study"
          value={formatMin(student.totalStudyMin)}
          sub={`${summary.studyDays} active days`}
          gradient="from-sky-500/15 to-sky-400/5"
          iconBg="bg-sky-500/20 text-sky-600 dark:text-sky-400"
        />
        <StatCard
          icon={Brain}
          label="Quiz Attempts"
          value={String(summary.totalQuizAttempts)}
          sub={`${summary.quizPassRate}% pass rate`}
          gradient="from-purple-500/15 to-purple-400/5"
          iconBg="bg-purple-500/20 text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={Trophy}
          label="Quiz Points"
          value={String(summary.totalQuizPoints)}
          sub={`Total: ${student.score} pts`}
          gradient="from-amber-500/15 to-amber-400/5"
          iconBg="bg-amber-500/20 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={`${student.currentStreak}d`}
          sub={`Best: ${summary.longestStreak}d`}
          gradient="from-orange-500/15 to-orange-400/5"
          iconBg="bg-orange-500/20 text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Daily Study Bar Chart - Enhanced */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Daily Study Time (Last 30 Days)
          </CardTitle>
          <CardDescription className="text-xs">Minutes studied per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-0.5 h-40">
            {dailyStudy.map((d, i) => {
              const heightPct = (d.minutes / maxDailyMin) * 100
              return (
                <div key={i} className="flex-1 group relative">
                  <div
                    className="bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t hover:from-emerald-600 hover:to-emerald-500 transition-colors cursor-pointer"
                    style={{ height: `${Math.max(heightPct, d.minutes > 0 ? 4 : 0)}%`, minHeight: d.minutes > 0 ? '4px' : '0' }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                    {formatDate(d.date)}: {formatMin(d.minutes)} ({d.sessions} sessions)
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>{formatDate(dailyStudy[0]?.date || '')}</span>
            <span>{formatDate(dailyStudy[dailyStudy.length - 1]?.date || '')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Weekly + Subject Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Study */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              Weekly Study Hours
            </CardTitle>
            <CardDescription className="text-xs">Last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {weeklyStudy.map((w, i) => {
                const heightPct = (w.minutes / maxWeeklyMin) * 100
                const hours = (w.minutes / 60).toFixed(1)
                return (
                  <div key={i} className="flex-1 group relative">
                    <div
                      className="bg-gradient-to-t from-sky-500 to-sky-400 rounded-t transition-colors hover:from-sky-600 hover:to-sky-500"
                      style={{ height: `${Math.max(heightPct, w.minutes > 0 ? 6 : 0)}%`, minHeight: w.minutes > 0 ? '6px' : '0' }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      {w.week}: {hours}h
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-1">{w.week}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Subject Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-500" />
              Subject Distribution
            </CardTitle>
            <CardDescription className="text-xs">Study time by subject</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectDistribution.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No subject-specific study yet
              </div>
            ) : (
              <div className="space-y-2">
                {subjectDistribution.slice(0, 6).map((s, i) => {
                  const widthPct = (s.minutes / maxSubjectMin) * 100
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{s.name}</span>
                        <span className="text-slate-500 ml-2">{formatMin(s.minutes)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance by Difficulty */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            Quiz Performance by Difficulty
          </CardTitle>
          <CardDescription className="text-xs">Pass rate and average score per difficulty</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {difficultyStats.map((d) => (
              <div key={d.difficulty} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">{d.difficulty}</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DIFFICULTY_COLORS[d.difficulty] }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: DIFFICULTY_COLORS[d.difficulty] }}>
                  {d.attempts > 0 ? `${d.avgScore}%` : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {d.attempts} attempts · {d.passed} passed
                </p>
                {d.attempts > 0 && (
                  <div className="mt-2">
                    <Progress value={d.passRate} className="h-1.5" />
                    <p className="text-[10px] text-slate-400 mt-1">{d.passRate}% pass rate</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Calendar (90 days) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            Activity Calendar (Last 90 Days)
          </CardTitle>
          <CardDescription className="text-xs">Your study consistency over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <div className="flex gap-0.5 flex-wrap min-w-max">
            {activityCalendar.map((day, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-[2px] ${getActivityColor(day.minutes)} hover:ring-1 hover:ring-slate-400 cursor-pointer transition-all`}
                title={`${formatDate(day.date)}: ${formatMin(day.minutes)}`}
              />
            ))}
          </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-3">
            <span>Less</span>
            <div className="w-3 h-3 rounded-[2px] bg-slate-100 dark:bg-slate-800" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-200 dark:bg-emerald-900" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-300 dark:bg-emerald-700" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-400 dark:bg-emerald-600" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-500" />
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Next Achievements - Enhanced */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Next Achievements to Unlock
          </CardTitle>
          <CardDescription className="text-xs">
            {data.unlockedAchievementsCount} of {data.totalAchievements} achievements unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nextAchievements.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All achievements unlocked!</p>
              <p className="text-xs text-slate-500">You've reached the highest tier. Amazing work!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextAchievements.map((a) => (
                <div key={a.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        {a.icon ? <span className="text-lg">{a.icon}</span> : <Trophy className="w-[18px] h-[18px]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{a.name}</p>
                        <p className="text-[10px] text-slate-500">{a.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{a.progress}%</p>
                      <p className="text-[10px] text-slate-400">{a.remaining} pts to go</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500 relative" style={{ width: `${a.progress}%` }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-bar" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Timeline */}
      {quizTimeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              Recent Quiz Attempts
            </CardTitle>
            <CardDescription className="text-xs">Your quiz history</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {quizTimeline.slice().reverse().slice(0, 10).map((q) => (
                  <div key={q.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${q.passed ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {q.passed ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{q.quizTitle}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(q.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${q.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {q.percentage}%
                      </p>
                      <p className="text-[10px] text-slate-400">+{q.pointsEarned} pts</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] hidden sm:inline-flex" style={{ color: DIFFICULTY_COLORS[q.difficulty], borderColor: DIFFICULTY_COLORS[q.difficulty] }}>
                      {q.difficulty}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Helper Components ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, gradient, iconBg }: {
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


