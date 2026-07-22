'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Brain, Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle, BookOpen, Users, Trophy, Link2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

interface Quiz {
  id: string; title: string; description?: string | null
  difficulty: string; points: number; isActive: boolean
  courseTitle: string | null; subjectName: string | null
  questionsCount: number; attemptsCount: number; createdAt: string
}

interface Course { id: string; title: string }
interface Subject { id: string; name: string; courseId: string }

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800',
  medium: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800',
  hard: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800',
}

const DIFFICULTY_GRADIENTS: Record<string, string> = {
  easy: 'from-emerald-500 to-green-500',
  medium: 'from-amber-500 to-orange-500',
  hard: 'from-rose-500 to-red-500',
}

export function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [points, setPoints] = useState(10)
  const [isActive, setIsActive] = useState(true)
  const [questions, setQuestions] = useState<any[]>([{ text: '', options: ['', '', '', ''], correctIdx: 0, explanation: '' }])
  const [formLoading, setFormLoading] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkQuizId, setLinkQuizId] = useState<string | null>(null)
  const [linkedChapterIds, setLinkedChapterIds] = useState<string[]>([])
  const [allChapters, setAllChapters] = useState<{ id: string; name: string; subject: { name: string; courseId: string } }[]>([])
  const [linkLoading, setLinkLoading] = useState(false)

  const fetchQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.adminQuizzes()
      setQuizzes(data.quizzes || [])
    } catch (err) { console.error('Quizzes fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  const fetchMeta = useCallback(async () => {
    try {
      const cData = await api.adminCourses()
      setCourses(cData.courses || [])
      const sData = await api.adminSubjects()
      setSubjects(sData.subjects || [])
    } catch (err) { console.error('Meta fetch error:', err) }
  }, [])

  useEffect(() => { fetchQuizzes(); fetchMeta() }, [fetchQuizzes, fetchMeta])

  const resetForm = () => {
    setTitle(''); setDescription(''); setCourseId(''); setSubjectId('')
    setDifficulty('medium'); setPoints(10); setIsActive(true)
    setQuestions([{ text: '', options: ['', '', '', ''], correctIdx: 0, explanation: '' }])
    setEditingId(null); setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!title || questions.length === 0 || questions.some(q => !q.text || q.options.some(o => !o))) {
      toast.error('Please fill all fields and questions')
      return
    }
    setFormLoading(true)
    try {
      if (editingId) {
        // Update basic info only (questions not edited for simplicity)
        await api.adminUpdateQuiz(editingId, {
          title, description, courseId: courseId || null,
          subjectId: subjectId || null, difficulty, points, isActive
        })
        toast.success('Quiz updated')
      } else {
        await api.adminCreateQuiz({
          title, description, courseId: courseId || null,
          subjectId: subjectId || null, difficulty, points, isActive,
          questions: questions.map(q => ({
            text: q.text, options: q.options, correctIdx: q.correctIdx, explanation: q.explanation
          }))
        })
        toast.success('Quiz created')
      }
      resetForm(); fetchQuizzes()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quiz')
    } finally { setFormLoading(false) }
  }

  const handleEdit = (quiz: Quiz) => {
    setTitle(quiz.title); setDescription(quiz.description || '')
    setDifficulty(quiz.difficulty); setPoints(quiz.points); setIsActive(quiz.isActive)
    setEditingId(quiz.id); setShowForm(true)
    // Note: editing questions not enabled in this version
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz? All attempts will be removed.')) return
    try {
      await api.adminDeleteQuiz(id)
      toast.success('Quiz deleted')
      fetchQuizzes()
    } catch (err: any) { toast.error(err.message) }
  }

  const toggleActive = async (quiz: Quiz) => {
    try {
      await api.adminUpdateQuiz(quiz.id, { isActive: !quiz.isActive })
      fetchQuizzes()
    } catch (err: any) { toast.error(err.message) }
  }

  const updateQuestion = (idx: number, field: string, value: any) => {
    const next = [...questions]
    next[idx] = { ...next[idx], [field]: value }
    setQuestions(next)
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const next = [...questions]
    const opts = [...next[qIdx].options]
    opts[oIdx] = value
    next[qIdx] = { ...next[qIdx], options: opts }
    setQuestions(next)
  }

  const addQuestion = () => setQuestions([...questions, { text: '', options: ['', '', '', ''], correctIdx: 0, explanation: '' }])
  const removeQuestion = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx))

  const openLinkDialog = async (quizId: string) => {
    setLinkQuizId(quizId); setLinkDialogOpen(true); setLinkLoading(true)
    try {
      const [chData, linkData] = await Promise.all([
        api.adminChapters(),
        api.adminQuizChapters(quizId),
      ])
      setAllChapters(chData.chapters || [])
      setLinkedChapterIds((linkData as any).chapterIds || [])
    } catch (err) { console.error('Link data error:', err) }
    finally { setLinkLoading(false) }
  }

  const saveChapterLinks = async () => {
    if (!linkQuizId) return
    setLinkLoading(true)
    try {
      await api.adminSetQuizChapters(linkQuizId, linkedChapterIds)
      toast.success('Chapter links updated')
      setLinkDialogOpen(false)
    } catch (err: any) { toast.error(err.message || 'Failed to update links') }
    finally { setLinkLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Quizzes</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Create & manage quizzes for students</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4 mr-2" /> New Quiz
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 relative overflow-hidden card-lift">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <Brain className="w-5 h-5 text-purple-500 mb-1" />
          <p className="text-xs text-slate-500">Total Quizzes</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{quizzes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 relative overflow-hidden card-lift">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{quizzes.filter(q => q.isActive).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 relative overflow-hidden card-lift">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
          <Users className="w-5 h-5 text-sky-500 mb-1" />
          <p className="text-xs text-slate-500">Total Attempts</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{quizzes.reduce((s, q) => s + q.attemptsCount, 0)}</p>
        </div>
      </div>

      {showForm && (
        <Card className="grow-in">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? 'Edit Quiz' : 'Create New Quiz'}</CardTitle>
            <CardDescription className="text-xs">
              {editingId ? 'Update quiz details (questions cannot be edited in this version)' : 'Fill in quiz details and add questions'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Title *</Label>
                <Input placeholder="Quiz title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="General (no course)" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Any subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.filter(s => !courseId || s.courseId === courseId).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Points for passing</Label>
                <Input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Label className="text-sm">Active (visible to students)</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-emerald-500 transition-colors" />
            </div>

            {!editingId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Questions ({questions.length})</Label>
                  <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="w-3 h-3 mr-1" /> Add Question</Button>
                </div>
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-950 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 text-[10px] font-bold">{qIdx + 1}</span>
                        Question {qIdx + 1}
                      </span>
                      {questions.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeQuestion(qIdx)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <Input placeholder="Question text" value={q.text}
                      onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button type="button" onClick={() => updateQuestion(qIdx, 'correctIdx', oIdx)}
                            className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                              q.correctIdx === oIdx ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                              : 'border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-600'
                            }`}>
                            {q.correctIdx === oIdx ? '✓' : String.fromCharCode(65 + oIdx)}
                          </button>
                          <Input placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} value={opt}
                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} className="text-xs" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">Click the circle to mark the correct answer.</p>
                    <Input placeholder="Explanation (optional)" value={q.explanation}
                      onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)} className="text-xs" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={formLoading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200">
                {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingId ? 'Update Quiz' : 'Create Quiz'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-purple-500/10 mx-auto mb-4"><Brain className="size-7 text-purple-400" /></div>
            <h3 className="font-semibold text-muted-foreground mb-1">No quizzes yet</h3>
            <p className="text-sm text-muted-foreground/70">Click "New Quiz" to create one</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="card-hover hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge className={`${DIFFICULTY_COLORS[quiz.difficulty] || DIFFICULTY_COLORS.medium} text-xs font-semibold`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-gradient-to-r ${DIFFICULTY_GRADIENTS[quiz.difficulty] || DIFFICULTY_GRADIENTS.medium}`} />
                        {quiz.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 gap-1">
                        <Trophy className="w-3 h-3" /> {quiz.points} pts
                      </Badge>
                      {!quiz.isActive && <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-500">Inactive</Badge>}
                    </div>
                    <CardTitle className="text-base">{quiz.title}</CardTitle>
                    {quiz.description && (
                      <CardDescription className="text-xs mt-1 line-clamp-2">{quiz.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"><BookOpen className="w-3 h-3" /> {quiz.questionsCount} Qs</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium"><Users className="w-3 h-3" /> {quiz.attemptsCount}</span>
                  {quiz.courseTitle && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{quiz.courseTitle}</span>}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Switch checked={quiz.isActive} onCheckedChange={() => toggleActive(quiz)} className="data-[state=checked]:bg-emerald-500 transition-colors" />
                    <span className={`text-xs font-medium ${quiz.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>{quiz.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openLinkDialog(quiz.id)} className="hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors" title="Link Chapters">
                      <Link2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(quiz)} className="hover:bg-sky-500/10 hover:text-sky-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(quiz.id)} className="hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link Chapters Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-500" /> Link Chapters to Quiz
            </DialogTitle>
            <DialogDescription className="text-xs">
              Students must complete ALL linked chapters before they can take this quiz. Leave empty to keep the quiz unlocked for everyone.
            </DialogDescription>
          </DialogHeader>
          {linkLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {allChapters.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No chapters available. Create chapters first.</p>
              ) : (
                allChapters.map(ch => (
                  <label key={ch.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={linkedChapterIds.includes(ch.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLinkedChapterIds([...linkedChapterIds, ch.id])
                        } else {
                          setLinkedChapterIds(linkedChapterIds.filter(id => id !== ch.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{ch.name}</p>
                      <p className="text-[10px] text-slate-500">{ch.subject?.name || 'No subject'}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-slate-500">{linkedChapterIds.length} chapter(s) selected</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={saveChapterLinks} disabled={linkLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {linkLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Save Links
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
