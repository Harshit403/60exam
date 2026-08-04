'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Flame, Clock, RefreshCw, Users, Timer, BookOpen, GraduationCap,
} from 'lucide-react'

interface LiveStudent {
  studentId: string
  name: string
  email: string
  courseTitle: string | null
  groupId: string
  groupName: string
  phase: string
  phaseLabel: string
  subjectName: string | null
  chapterName: string | null
  total: number
  remaining: number
  running: boolean
}

function formatClock(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function LiveStudyPage() {
  const [students, setStudents] = useState<LiveStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const fetchLive = useCallback(async () => {
    try {
      const data = await api.adminLiveStudy()
      setStudents(data.liveStudents || [])
      setUpdatedAt(new Date())
    } catch (err: any) {
      console.error('Live study fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLive() }, [fetchLive])

  const totalStudying = students.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Live Study</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Students currently in an active Pomodoro session</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchLive} disabled={loading}>
          <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/20 border-orange-200 dark:border-orange-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-orange-500/15 flex items-center justify-center"><Flame className="size-4 text-orange-600" /></div>
            <div>
              <p className="text-[10px] font-medium text-orange-600 uppercase tracking-wider">Studying Now</p>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{totalStudying}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-950/20 border-sky-200 dark:border-sky-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-sky-500/15 flex items-center justify-center"><Timer className="size-4 text-sky-600" /></div>
            <div>
              <p className="text-[10px] font-medium text-sky-600 uppercase tracking-wider">Break / Transition</p>
              <p className="text-xl font-bold text-sky-900 dark:text-sky-100">{students.filter(s => s.phase === 'break').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-950/20 border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Users className="size-4 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Groups Engaged</p>
              <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{new Set(students.map(s => s.groupId)).size}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Updated at */}
      {updatedAt && (
        <p className="text-[10px] text-slate-400">Last updated {updatedAt.toLocaleTimeString()}</p>
      )}

      {/* Live students */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-3">
              <Flame className="w-8 h-8 text-orange-300 dark:text-orange-700" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">No one is studying right now</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Students with an active Pomodoro session in a group will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {students.map(s => (
            <Card key={s.studentId} className="card-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-sm font-bold">
                        {(s.name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-[9px] border-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"><BookOpen className="size-2.5 mr-0.5" />{s.groupName}</Badge>
                      {s.courseTitle && <Badge variant="secondary" className="text-[9px] border-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"><GraduationCap className="size-2.5 mr-0.5" />{s.courseTitle}</Badge>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Clock className="size-4 text-orange-500" />
                    <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-100">{formatClock(s.remaining)}</span>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-[9px] border-0 ${s.phase === 'break' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                      {s.phaseLabel}
                    </Badge>
                    <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px]">{s.subjectName || 'Focus session'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}