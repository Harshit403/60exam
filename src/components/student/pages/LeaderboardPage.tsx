'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Medal, Flame, CheckCircle2, Crown, Award, Users, Clock, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api-client'
import { formatMinutes } from '../utils'

interface LeaderboardEntry {
  rank: number
  id: string
  fullName: string
  score: number
  studyMinutes?: number
  currentStreak: number
  verified: boolean
  courseTitle: string
  courseId: string
  isCurrentUser: boolean
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  currentUserRank: LeaderboardEntry | null
  totalStudents: number
}

type Period = 'today' | '24h'

const PERIOD_TABS: { key: Period; label: string; icon: typeof Clock; desc: string }[] = [
  { key: 'today', label: 'Today', icon: Clock, desc: 'Top by study minutes today' },
  { key: '24h', label: 'Last 24h', icon: TrendingUp, desc: 'Top by study minutes in last 24 hours' },
]

const RANK_STYLES: Record<number, { bg: string; border: string; icon: typeof Crown; iconColor: string; label: string }> = {
  1: { bg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20', border: 'border-amber-300 dark:border-amber-700', icon: Crown, iconColor: 'text-amber-500', label: '🥇' },
  2: { bg: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-700/20', border: 'border-slate-300 dark:border-slate-600', icon: Medal, iconColor: 'text-slate-400', label: '🥈' },
  3: { bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20', border: 'border-orange-300 dark:border-orange-700', icon: Award, iconColor: 'text-orange-500', label: '🥉' },
}

export function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('24h')

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const result = await api.studentLeaderboard(5, undefined, period)
      setData(result)
    } catch (err) {
      console.error('Leaderboard fetch error:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  // Keep the leaderboard fresh: poll periodically and refetch when the tab
  // regains focus/visibility (e.g. after finishing a Pomodoro session).
  useEffect(() => {
    const id = setInterval(() => fetchLeaderboard(true), 20000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchLeaderboard(true) }
    const onFocus = () => fetchLeaderboard(true)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchLeaderboard])

  const leaderboard = data?.leaderboard || []
  const currentUserRank = data?.currentUserRank
  const top3 = leaderboard.filter(e => e.rank <= 3)
  const rest = leaderboard.filter(e => e.rank > 3)

  const activeTab = PERIOD_TABS.find(t => t.key === period)!

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
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Leaderboard</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data ? `${data.totalStudents} students competing` : 'Top performers'}
            </p>
          </div>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {PERIOD_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => setPeriod(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                period === tab.key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Period description */}
      <div className="flex items-center gap-2 -mt-3">
        <activeTab.icon className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400">{activeTab.desc}</p>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Top Performers Today
            </h3>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-200/50 to-transparent dark:from-amber-800/30" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[2, 1, 3].map(rank => {
              const entry = top3.find(e => e.rank === rank)
              if (!entry) return <div key={rank} />
              const style = RANK_STYLES[rank]
              const isFirst = rank === 1
              const metric = entry.studyMinutes
              const metricLabel = 'min studied'

              return (
                <Card key={rank}
                  className={`relative overflow-hidden border-2 ${style.border} ${style.bg} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${isFirst ? 'md:-mt-4' : ''}`}>
                  <CardContent className={`p-3 sm:p-4 text-center ${isFirst ? 'py-4 sm:py-6' : 'py-3 sm:py-4'}`}>
                    <div className="text-3xl mb-2 leading-none">{style.label}</div>
                    <div className="relative inline-block mb-2">
                      <Avatar className={`${isFirst ? 'h-12 w-12 sm:h-16 sm:w-16' : 'h-10 w-10 sm:h-12 sm:w-12'} ring-2 ${style.border}`}>
                        <AvatarFallback className={`${isFirst ? 'text-lg' : 'text-sm'} font-bold bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 text-slate-700 dark:text-slate-200`}>
                          {(entry.fullName || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {entry.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className={`font-semibold text-slate-900 dark:text-slate-100 truncate ${isFirst ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'}`}>
                      {entry.fullName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{entry.courseTitle}</p>
                    <div className="mt-2 inline-flex items-center gap-1 bg-white/60 dark:bg-slate-800/60 rounded-full px-2.5 py-1">
                      <Clock className={`w-3 h-3 ${isFirst ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className={`text-xs font-bold ${isFirst ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        {formatMinutes(metric || 0)}
                      </span>
                      <span className="text-[9px] text-slate-400">{metricLabel}</span>
                    </div>
                    {entry.isCurrentUser && (
                      <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0 bg-emerald-500 text-white">You</Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Current User Rank (if not in top visible list) */}
      {currentUserRank && !leaderboard.some(e => e.isCurrentUser) && (
        <Card className="border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10 overflow-hidden">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">#{currentUserRank.rank}</span>
            </div>
            <Avatar className="h-9 w-9 ring-2 ring-amber-300 dark:ring-amber-700">
              <AvatarFallback className="bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-700 dark:to-amber-600 text-amber-800 dark:text-amber-200 text-sm font-semibold">
                {(currentUserRank.fullName || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{currentUserRank.fullName}</p>
                <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500 text-white">You</Badge>
                {currentUserRank.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{formatMinutes(currentUserRank.studyMinutes || 0)} studied</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-[11px] text-slate-500">{currentUserRank.currentStreak}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remaining Rankings List (4-10) */}
      {rest.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Top 5 Ranking</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200/50 to-transparent dark:from-slate-700/30" />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rest.map(entry => {
                    const metric = entry.studyMinutes
                    const metricLabel = 'min'
                    return (
                      <div key={entry.id}
                        className={`flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${entry.isCurrentUser ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">#{entry.rank}</span>
                        </div>
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold">
                              {(entry.fullName || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {entry.verified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                              <CheckCircle2 className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{entry.fullName}</p>
                            {entry.isCurrentUser && <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500 text-white">You</Badge>}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{entry.courseTitle}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="text-[10px] text-slate-500">{entry.currentStreak}</span>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20`}>
                            <Clock className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatMinutes(metric || 0)}</span>
                            <span className="text-[9px] text-slate-400">{metricLabel}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {leaderboard.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No data yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Complete study sessions to appear on this leaderboard
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
