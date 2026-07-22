'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ListChecks, CheckCircle2, Trophy, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { SyllabusSubject } from '../types'
import { CircularProgressRing, Confetti } from '../utils'

export function SyllabusPage() {
  const [syllabus, setSyllabus] = useState<SyllabusSubject[]>([])
  const [totalChapters, setTotalChapters] = useState(0)
  const [completedChapters, setCompletedChapters] = useState(0)
  const [overallPercent, setOverallPercent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [celebratingSubject, setCelebratingSubject] = useState<string | null>(null)

  const fetchSyllabus = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentSyllabus()
      setSyllabus(data.syllabus || []); setTotalChapters(data.totalChapters || 0)
      setCompletedChapters(data.completedChapters || 0); setOverallPercent(data.overallPercent || 0)
    } catch (err) { console.error('Syllabus fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSyllabus() }, [fetchSyllabus])

  const toggleChapter = async (chapterId: string, currentCompleted: boolean, subjectId: string, subjectCompletionPercent: number) => {
    setTogglingId(chapterId)
    try {
      await api.studentMarkChapter(chapterId, !currentCompleted)
      if (!currentCompleted && subjectCompletionPercent >= 90) {
        fetchSyllabus()
        setTimeout(() => {
          const subject = syllabus.find(s => s.id === subjectId)
          if (subject && subject.completionPercent === 100) {
            setCelebratingSubject(subjectId)
            setTimeout(() => setCelebratingSubject(null), 3000)
          }
        }, 1000)
      } else { fetchSyllabus() }
    } catch (err) { console.error('Toggle error:', err) }
    finally { setTogglingId(null) }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-full" />
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      </div>
    )
  }

  const subjectColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#6366f1']

  return (
    <div className="space-y-6">
      <Confetti active={!!celebratingSubject} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-sm">
          <ListChecks className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Syllabus Completion</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track your chapter progress</p>
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 flex-col sm:flex-row">
            <CircularProgressRing size={90} strokeWidth={8} progress={overallPercent}
              color={overallPercent === 100 ? '#10b981' : '#3b82f6'} trackColor="rgba(100,116,139,0.2)">
              <div className="text-center"><p className="text-xl font-bold text-slate-900 dark:text-slate-100">{overallPercent}%</p></div>
            </CircularProgressRing>
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
              <Progress value={overallPercent} className="h-3 mt-2" />
              <p className="text-xs text-slate-500 mt-1.5">{completedChapters} of {totalChapters} chapters completed</p>
              {overallPercent === 100 && (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 pop-in">
                  <Trophy className="w-4 h-4" /> All chapters complete!
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects - Enhanced with tree-view style */}
      <div className="space-y-4">
        {syllabus.map((subject, idx) => {
          const color = subjectColors[idx % subjectColors.length]
          const isComplete = subject.completionPercent === 100
          const isCelebrating = celebratingSubject === subject.id

          return (
            <div key={subject.id} className={`transition-all ${isCelebrating ? 'ring-2 ring-emerald-400 rounded-xl' : ''}`}>
              <Card className={`overflow-hidden ${isComplete ? 'border-emerald-200 dark:border-emerald-800' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <CircularProgressRing size={56} strokeWidth={5} progress={subject.completionPercent}
                      color={isComplete ? '#10b981' : color} trackColor="rgba(100,116,139,0.2)">
                      <div className="text-center"><span className="text-xs font-bold text-slate-900 dark:text-slate-100">{subject.completionPercent}%</span></div>
                    </CircularProgressRing>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2 truncate">
                          {subject.name}
                          {isComplete && <CheckCircle2 className="w-5 h-5 text-emerald-500 check-pop" />}
                        </CardTitle>
                        <Badge variant="secondary" className={isComplete
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }>{subject.completedChapters}/{subject.totalChapters}</Badge>
                      </div>
                      <Progress value={subject.completionPercent} className="h-2 mt-2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 relative">
                    {/* Tree-view connecting line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
                    {subject.chapters.map((chapter, ci) => (
                      <div key={chapter.id}
                        className={`flex items-center gap-3 min-w-0 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all hover:translate-x-0.5 slide-up relative min-h-[44px]`}
                        style={{ animationDelay: `${ci * 0.03}s` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Tree node connector */}
                          <div className="relative flex-shrink-0">
                            <div className="absolute left-0 top-1/2 w-2.5 h-px bg-slate-200 dark:bg-slate-800" />
                            <button
                              onClick={() => toggleChapter(chapter.id, chapter.completed, subject.id, subject.completionPercent)}
                              disabled={togglingId === chapter.id}
                              className={`relative z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                chapter.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white scale-100 check-pop'
                                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:scale-110'
                              }`}>
                              {chapter.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {togglingId === chapter.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            </button>
                          </div>
                          <span className={`text-xs sm:text-sm truncate ${chapter.completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                            {chapter.name}
                          </span>
                        </div>
                        {chapter.completedAt && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {new Date(chapter.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
