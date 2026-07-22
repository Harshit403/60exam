'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CalendarDays, CheckCircle2, Clock, TrendingUp, Flame, Zap, StickyNote, BookOpen } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts'
import { api } from '@/lib/api-client'
import { Subject, StudySession } from '../types'
import { formatDate, formatMinutes, StudyHeatmap } from '../utils'

export function TrackStudyPage({ subjects: _subjects }: { subjects: Subject[] }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [totalMin, setTotalMin] = useState(0)
  const [chartData, setChartData] = useState<{ date: string; minutes: number }[]>([])
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({})
  const [weeklySummary, setWeeklySummary] = useState<{ totalMin: number; sessions: number; bestDay: string; bestDayMin: number } | null>(null)
  const [todayMin, setTodayMin] = useState(0)
  const [todaySessions, setTodaySessions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const data = await api.studentStudyHistory()
        const allSessions = data.sessions || []
        const dateMap: Record<string, number> = {}
        allSessions.forEach((s: any) => {
          const d = new Date(s.date)
          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          dateMap[dateKey] = (dateMap[dateKey] || 0) + s.durationMin
        })
        const chart: { date: string; minutes: number }[] = []
        for (let i = 13; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          const key = formatDate(d)
          chart.push({ date: key, minutes: dateMap[key] || 0 })
        }
        setChartData(chart)
        const heatmap: Record<string, number> = {}
        for (let i = 29; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          const key = formatDate(d)
          heatmap[key] = dateMap[key] || 0
        }
        setHeatmapData(heatmap)
        let weekTotal = 0, bestDay = '', bestDayMin = 0
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          const key = formatDate(d)
          const min = dateMap[key] || 0
          weekTotal += min
          if (min > bestDayMin) { bestDayMin = min; bestDay = key }
        }
        const todayKey = formatDate(new Date())
        setTodayMin(dateMap[todayKey] || 0)
        setTodaySessions(allSessions.filter((s: any) => formatDate(new Date(s.date)) === todayKey).length)
        setWeeklySummary({ totalMin: weekTotal, sessions: allSessions.length, bestDay, bestDayMin })
      } catch (err) { console.error('Chart data error:', err) }
    }
    fetchChart()
  }, [])

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true)
      try {
        const dateStr = formatDate(selectedDate)
        const data = await api.studentStudyHistory(dateStr)
        setSessions(data.sessions || []); setTotalMin(data.totalMin || 0)
      } catch (err) { console.error('Sessions fetch error:', err) }
      finally { setLoading(false) }
    }
    fetchSessions()
  }, [selectedDate])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
          <CalendarDays className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Track Study</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Monitor your daily study progress & sessions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card className="overflow-hidden">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">{formatMinutes(todayMin)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Today's Study</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-violet-700 dark:text-violet-400">{todaySessions}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sessions Today</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400">{formatMinutes(weeklySummary?.totalMin || 0)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This Week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-6">
        <Card className="overflow-hidden">
          <CardContent className="pt-4 flex justify-center">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} className="rounded-md" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardTitle>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{formatMinutes(totalMin)} studied</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No study sessions on this day</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start a session from the Dashboard</p>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-2">
                  {sessions.map((s, si) => (
                    <div key={s.id} className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 slide-up ${s.completed ? 'border-l-3 border-l-emerald-400 dark:border-l-emerald-600' : ''}`} style={{ animationDelay: `${si * 0.05}s` }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${s.completed ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                            {s.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{s.chapter?.name || 'General Study'}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              {s.chapter?.subject?.name ? (
                                <>
                                  <BookOpen className="w-3 h-3" /> {s.chapter.subject.name}
                                </>
                              ) : (
                                <span className="italic">No chapter linked</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">{formatMinutes(s.durationMin)}</span>
                      </div>
                      {s.notes && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                          <StickyNote className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2">{s.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart — Line Graph */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-400" /> Last 14 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.6 0 0 / 0.2)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                tickFormatter={(val: string) => {
                  const d = new Date(val + 'T00:00:00')
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                tickFormatter={(val: number) => formatMinutes(val)}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]
                  return (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-md text-xs">
                      <p className="text-slate-500">{d.payload.date}</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formatMinutes(d.value as number)} studied</p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Study Activity — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent><StudyHeatmap data={heatmapData} /></CardContent>
      </Card>

      {/* Weekly Summary - Enhanced */}
      {weeklySummary && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> This Week&apos;s Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="text-center p-2 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-base sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatMinutes(weeklySummary.totalMin)}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Total Study</p>
              </div>
              <div className="text-center p-2 sm:p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-100 dark:border-violet-900/30">
                <p className="text-base sm:text-2xl font-bold text-violet-700 dark:text-violet-400">{weeklySummary.sessions}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Sessions</p>
              </div>
              <div className="text-center p-2 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-900/30">
                <p className="text-base sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{formatMinutes(weeklySummary.bestDayMin)}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Best Day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
