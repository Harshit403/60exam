'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Brain, CheckCircle2, XCircle, Trophy, Loader2, RefreshCw, Sparkles, Target, Award, BookOpen, Clock, AlertCircle, Lock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { QuizListItem, QuizDetail, QuizResult } from '../types'

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40', dot: 'bg-emerald-500', timePerQ: 60 },
  medium: { label: 'Medium', color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40', dot: 'bg-amber-500', timePerQ: 90 },
  hard: { label: 'Hard', color: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40', dot: 'bg-rose-500', timePerQ: 120 },
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function QuizPage() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeQuiz, setActiveQuiz] = useState<QuizDetail | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [timeExpired, setTimeExpired] = useState(false)
  const [lockError, setLockError] = useState<{ message: string; chapters: string[] } | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentQuizzes()
      setQuizzes(data.quizzes || [])
    } catch (err) { console.error('Quiz fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchQuizzes() }, [fetchQuizzes])

  // Timer effect
  useEffect(() => {
    if (!activeQuiz || result) return
    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (!timeExpired) {
        setTimeExpired(true)
        // Auto-submit when time runs out
        handleSubmitOnTimeout()
      }
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeQuiz, result, timeLeft, timeExpired])

  const handleSubmitOnTimeout = async () => {
    if (!activeQuiz) return
    setSubmitting(true)
    try {
      const data = await api.studentSubmitQuiz(activeQuiz.quiz.id, answers)
      setResult(data.result)
    } catch (err) { console.error('Quiz auto-submit error:', err) }
    finally { setSubmitting(false) }
  }

  const startQuiz = async (id: string) => {
    try {
      setSubmitting(true)
      setLockError(null)
      const data = await api.studentQuizDetail(id)
      if (data.quiz) {
        setActiveQuiz(data)
        setCurrentQ(0)
        setAnswers([])
        setResult(null)
        setTimeExpired(false)
        // Calculate total time based on difficulty
        const diff = data.quiz.difficulty as keyof typeof DIFFICULTY_CONFIG
        const perQ = DIFFICULTY_CONFIG[diff]?.timePerQ || 60
        const total = data.questions.length * perQ
        setTotalTime(total)
        setTimeLeft(total)
      }
    } catch (err: any) {
      console.error('Quiz start error:', err)
      // Check if this is a lock error (403)
      const errMsg = err?.message || String(err)
      if (errMsg.includes('locked') || errMsg.includes('Complete all linked chapters')) {
        setLockError({
          message: 'This quiz is locked. You must complete all linked chapters first.',
          chapters: [] // We don't have the specific chapters from the error
        })
      }
    }
    finally { setSubmitting(false) }
  }

  const submitQuiz = async () => {
    if (!activeQuiz) return
    setSubmitting(true)
    try {
      if (timerRef.current) clearInterval(timerRef.current)
      const data = await api.studentSubmitQuiz(activeQuiz.quiz.id, answers)
      setResult(data.result)
    } catch (err) { console.error('Quiz submit error:', err) }
    finally { setSubmitting(false) }
  }

  const exitQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setActiveQuiz(null)
    setResult(null)
    setCurrentQ(0)
    setAnswers([])
    setTimeLeft(0)
    setTotalTime(0)
    setTimeExpired(false)
    fetchQuizzes()
  }

  // ─── Result View ───────────────────────────────────────────────────
  if (result) {
    const pct = result.percentage
    const isPass = result.passed
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-4 py-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl score-reveal ${isPass ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-rose-100 dark:bg-rose-900/40'}`}>
            {isPass ? <Trophy className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
              : <Target className="w-12 h-12 text-rose-600 dark:text-rose-400" />}
          </div>
          <div className="slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {isPass ? 'Quiz Passed! 🎉' : 'Keep Practicing 💪'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              You scored {result.score} out of {result.total}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-2 slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="px-5 sm:px-6 py-3 sm:py-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-100 dark:to-slate-300 text-white dark:text-slate-900 min-w-[110px] sm:min-w-[130px] shadow-lg">
              <p className="text-xs opacity-80">Score</p>
              <p className="text-2xl sm:text-3xl font-bold">{pct}%</p>
            </div>
            <div className="px-5 sm:px-6 py-3 sm:py-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white min-w-[110px] sm:min-w-[130px] shadow-lg">
              <p className="text-xs opacity-80">Points Earned</p>
              <p className="text-2xl sm:text-3xl font-bold">+{result.pointsEarned}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-500" /> Review Answers
          </h3>
          {result.questionResults.map((qr, i) => (
            <Card key={qr.questionId} className={`border-l-4 transition-all slide-up ${qr.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'}`} style={{ animationDelay: `${i * 0.05}s` }}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${qr.isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-rose-100 dark:bg-rose-900/40'}`}>
                    {qr.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                  </div>
                  <CardTitle className="text-sm leading-snug">Q{i + 1}. {qr.questionText}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {qr.options.map((opt, oi) => {
                    const isCorrect = oi === qr.correctIdx
                    const isSelected = oi === qr.selectedIdx
                    return (
                      <div key={oi} className={`text-xs px-3 py-2 rounded-lg border ${
                        isCorrect ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-medium'
                          : isSelected ? 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {opt}
                        {isCorrect && <span className="ml-2">✓</span>}
                        {isSelected && !isCorrect && <span className="ml-2">✗</span>}
                      </div>
                    )
                  })}
                </div>
                {qr.explanation && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-semibold">Explanation:</span> {qr.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={exitQuiz} variant="outline" className="hover:-translate-y-0.5 transition-transform"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Quizzes</Button>
          </div>
      </div>
    )
  }

  // ─── Active Quiz (answering) ──────────────────────────────────────
  if (activeQuiz) {
    const total = activeQuiz.questions.length
    const q = activeQuiz.questions[currentQ]
    const progressPct = ((currentQ + 1) / total) * 100
    const selected = answers[currentQ]
    const timePct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0
    const isUrgent = timeLeft <= 30 && timeLeft > 0
    const isWarning = timeLeft <= 60 && timeLeft > 30

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={exitQuiz}><ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Exit</span></Button>
          <div className="flex items-center gap-3">
            {/* Animated Timer */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm transition-all duration-500 ${
              isUrgent ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse shadow-sm shadow-rose-200 dark:shadow-rose-900'
              : isWarning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shadow-sm shadow-amber-200 dark:shadow-amber-900'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              <Clock className={`w-4 h-4 transition-colors duration-500 ${isUrgent ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-500'}`} />
              {formatTime(timeLeft)}
            </div>
            {/* Progress Stepper */}
            <div className="hidden sm:flex items-center gap-1">
              {activeQuiz.questions.map((_, qi) => (
                <div key={qi} className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  qi === currentQ ? 'w-6 bg-slate-800 dark:bg-slate-200 rounded-sm'
                  : answers[qi] !== undefined ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700'
                }`} />
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-700 dark:text-slate-300">Q {currentQ + 1}</span>
              <span>/</span>
              <span>{total}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progress</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* Time progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time Remaining</span>
            <span className={isUrgent ? 'text-rose-500 font-medium' : ''}>{formatTime(timeLeft)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${timePct}%` }}
            />
          </div>
        </div>

        {timeExpired && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <p className="text-xs text-rose-700 dark:text-rose-300">Time's up! Your quiz is being submitted automatically.</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={DIFFICULTY_CONFIG[activeQuiz.quiz.difficulty as keyof typeof DIFFICULTY_CONFIG]?.color}>
                {DIFFICULTY_CONFIG[activeQuiz.quiz.difficulty as keyof typeof DIFFICULTY_CONFIG]?.label}
              </Badge>
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <Trophy className="w-3 h-3 mr-1" /> {activeQuiz.quiz.points} pts
              </Badge>
              <Badge variant="outline" className="text-sky-600 border-sky-300">
                <Clock className="w-3 h-3 mr-1" /> {DIFFICULTY_CONFIG[activeQuiz.quiz.difficulty as keyof typeof DIFFICULTY_CONFIG]?.timePerQ || 60}s/Q
              </Badge>
            </div>
            <CardTitle className="text-lg leading-snug">{q.text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.options.map((opt, idx) => {
              const isSelected = selected === idx
              return (
                <button key={idx} onClick={() => {
                  const next = [...answers]; next[currentQ] = idx; setAnswers(next)
                }}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 active:scale-[0.99] group ${
                    isSelected
                      ? 'border-slate-800 dark:border-slate-200 bg-slate-50 dark:bg-slate-800 shadow-sm ring-1 ring-slate-800/20 dark:ring-slate-200/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}>
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    isSelected
                      ? 'border-slate-800 dark:border-slate-200 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 scale-110'
                      : 'border-slate-300 dark:border-slate-700 text-slate-500 group-hover:border-slate-400 dark:group-hover:border-slate-600'
                  }`}>
                    {isSelected ? '✓' : String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`text-sm transition-colors ${isSelected ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex justify-between gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="min-h-[44px]">
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> Previous
          </Button>
          {currentQ < total - 1 ? (
            <Button onClick={() => setCurrentQ(currentQ + 1)} disabled={selected === undefined}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 min-h-[44px]">
              Next →
            </Button>
          ) : (
            <Button onClick={submitQuiz} disabled={submitting || selected === undefined}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Submit Quiz
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ─── Quiz List ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Daily Quizzes</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Test your knowledge & earn points</p>
        </div>
      </div>

      {/* Quiz Stats Banner - Enhanced */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-200/30 dark:bg-amber-800/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg" />
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 mb-1.5 relative" />
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Available</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">{quizzes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200/30 dark:bg-emerald-800/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg" />
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mb-1.5 relative" />
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Attempted</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">{quizzes.filter(q => q.attemptsCount > 0).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-200/30 dark:bg-purple-800/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg" />
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 mb-1.5 relative" />
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Total Points</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">{quizzes.reduce((s, q) => s + q.points, 0)}</p>
        </div>
      </div>

      {/* Lock Error Alert */}
      {lockError && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Quiz Locked</p>
            <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">{lockError.message}</p>
            <Button variant="outline" size="sm" className="mt-2 text-xs border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400" onClick={() => setLockError(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No quizzes available yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Check back later for new quizzes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(quiz => {
            const diff = DIFFICULTY_CONFIG[quiz.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.medium
            const attempted = quiz.attemptsCount > 0
            const isLocked = (quiz as any).isLocked === true
            const lockedChapters = ((quiz as any).lockedChapters || []) as { id: string; name: string; completed: boolean }[]
            const incompleteChapters = lockedChapters.filter(c => !c.completed)
            return (
              <Card key={quiz.id} className={`card-hover overflow-hidden relative ${isLocked ? 'opacity-90' : ''}`}>
                {isLocked && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Locked</span>
                    </div>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-block w-2 h-2 rounded-full ${diff.dot}`} />
                        <Badge className={diff.color}>{diff.label}</Badge>
                        {attempted && !isLocked && (
                          <Badge variant="outline" className={quiz.lastAttemptPassed ? 'text-emerald-600 border-emerald-300' : 'text-rose-600 border-rose-300'}>
                            {quiz.lastAttemptPassed ? 'Passed' : 'Failed'}
                          </Badge>
                        )}
                        {isLocked && (
                          <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-slate-600">
                            🔒 Complete chapters to unlock
                          </Badge>
                        )}
                      </div>
                      <CardTitle className={`text-base leading-snug ${isLocked ? 'text-slate-500 dark:text-slate-400' : ''}`}>{quiz.title}</CardTitle>
                      {quiz.description && (
                        <CardDescription className="text-xs mt-1 line-clamp-2">{quiz.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {quiz.totalQuestions} Qs</span>
                    <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {quiz.points} pts</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.totalQuestions * (DIFFICULTY_CONFIG[quiz.difficulty as keyof typeof DIFFICULTY_CONFIG]?.timePerQ || 60)}s</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {quiz.courseTitle}</span>
                  </div>

                  {/* Show locked chapter requirements */}
                  {isLocked && incompleteChapters.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Complete these chapters first:
                      </p>
                      <div className="space-y-1">
                        {incompleteChapters.map(ch => (
                          <div key={ch.id} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400/80">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            {ch.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {attempted && quiz.bestScore !== null && !isLocked && (
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Best: <span className="font-semibold text-slate-800 dark:text-slate-200">{quiz.bestScore}/{quiz.totalQuestions}</span>
                      <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                      Attempts: {quiz.attemptsCount}
                    </div>
                  )}
                  <Button
                    onClick={() => startQuiz(quiz.id)}
                    disabled={submitting || isLocked}
                    className={`w-full ${isLocked ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900'}`}
                    size="sm">
                    {isLocked ? (
                      <><Lock className="w-4 h-4 mr-2" /> Locked</>
                    ) : submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : attempted ? (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    {isLocked ? 'Complete Chapters First' : attempted ? 'Retry Quiz' : 'Start Quiz'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
