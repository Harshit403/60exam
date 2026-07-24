'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { CalendarCheck, Plus, Loader2, Bell, BellOff } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Subject, StudyPlan } from '../types'
import { formatDate } from '../utils'
import { toast } from 'sonner'

export function StudyPlannerPage({ subjects }: { subjects: Subject[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [plans, setPlans] = useState<StudyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formSubjectId, setFormSubjectId] = useState('')
  const [formChapterId, setFormChapterId] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderLoading, setReminderLoading] = useState(false)

  const chapters = subjects.find(s => s.id === formSubjectId)?.chapters || []

  useEffect(() => {
    api.getReminderPreference().then(res => {
      setReminderEnabled(res.studyReminderEnabled)
    }).catch(() => {})
  }, [])

  const toggleReminder = async () => {
    setReminderLoading(true)
    try {
      const newVal = !reminderEnabled
      await api.setReminderPreference(newVal)
      setReminderEnabled(newVal)
      toast.success(newVal ? 'Study reminders enabled' : 'Study reminders disabled')
    } catch {
      toast.error('Failed to update preference')
    } finally {
      setReminderLoading(false)
    }
  }

  const fetchPlans = useCallback(async () => {
    if (!selectedDate) return
    setLoading(true)
    try {
      const data = await api.studentStudyPlans(formatDate(selectedDate))
      setPlans(data.plans || [])
    } catch (err) { console.error('Plans fetch error:', err) }
    finally { setLoading(false) }
  }, [selectedDate])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleSavePlan = async () => {
    if (!formChapterId || !selectedDate) return
    setFormLoading(true)
    try {
      if (editingPlanId) {
        await api.studentUpdatePlan(editingPlanId, { chapterId: formChapterId, notes: formNotes, plannedDate: formatDate(selectedDate) })
      } else {
        await api.studentCreatePlan({ chapterId: formChapterId, notes: formNotes, plannedDate: formatDate(selectedDate) })
      }
      setShowForm(false); setFormSubjectId(''); setFormChapterId(''); setFormNotes(''); setEditingPlanId(null)
      fetchPlans()
    } catch (err) { console.error('Plan save error:', err) }
    finally { setFormLoading(false) }
  }

  const handleEdit = (plan: StudyPlan) => {
    setEditingPlanId(plan.id)
    const subject = subjects.find(s => s.chapters.some(c => c.id === plan.chapterId))
    if (subject) setFormSubjectId(subject.id)
    setFormChapterId(plan.chapterId || ''); setFormNotes(plan.notes || ''); setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false); setFormSubjectId(''); setFormChapterId(''); setFormNotes(''); setEditingPlanId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-sm">
          <CalendarCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Study Planner</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Plan your study schedule ahead</p>
        </div>
        <button
          onClick={toggleReminder}
          disabled={reminderLoading}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            reminderEnabled
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {reminderLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : reminderEnabled ? (
            <Bell className="w-3.5 h-3.5" />
          ) : (
            <BellOff className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{reminderEnabled ? 'Reminders ON' : 'Reminders OFF'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-6">
        <Card className="overflow-hidden order-2 md:order-1">
          <CardContent className="p-2 sm:p-3 md:p-4 flex justify-center">
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate}
              disabled={{ before: new Date() }} className="rounded-md w-full" />
          </CardContent>
        </Card>

        <div className="space-y-3 md:space-y-4 order-1 md:order-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm md:text-base truncate">
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                  </CardTitle>
                </div>
                <Button size="sm" onClick={() => { setShowForm(true); setEditingPlanId(null) }} disabled={!selectedDate}
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 active:scale-[0.98] transition-transform shrink-0 h-8 md:h-9 text-xs md:text-sm">
                  <Plus className="w-3.5 h-3.5 mr-1" /> <span className="hidden sm:inline">Add Plan</span><span className="sm:hidden">Add</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              {loading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14 md:h-16 rounded-lg" />)}</div>
              ) : plans.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <CalendarCheck className="w-8 h-8 md:w-10 md:h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No plans for this date</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap "Add" to schedule study</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan, pi) => (
                    <div key={plan.id} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 slide-up" style={{ animationDelay: `${pi * 0.05}s` }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{plan.chapter?.name || 'General'}</p>
                        <p className="text-xs text-slate-500 truncate">{plan.chapter?.subject?.name || ''}</p>
                        {plan.notes && <p className="text-xs text-slate-400 mt-1 italic line-clamp-2">{plan.notes}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(plan)} className="hover:text-slate-900 dark:hover:text-slate-100 shrink-0 px-2 md:px-3">Edit</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {showForm && selectedDate && (
            <div className="grow-in">
              <Card>
                <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
                  <CardTitle className="text-sm md:text-base">{editingPlanId ? 'Edit Plan' : 'New Plan'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-3 md:px-6 pb-3 md:pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Subject</Label>
                      <Select value={formSubjectId} onValueChange={(v) => { setFormSubjectId(v); setFormChapterId('') }}>
                        <SelectTrigger className="h-9 md:h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Chapter</Label>
                      <Select value={formChapterId} onValueChange={setFormChapterId} disabled={!formSubjectId}>
                        <SelectTrigger className="h-9 md:h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{chapters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Textarea placeholder="Add study notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="text-sm" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button onClick={handleSavePlan} disabled={!formChapterId || formLoading}
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 h-9 md:h-10 text-sm flex-1 sm:flex-none">
                      {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
                    </Button>
                    <Button variant="outline" onClick={handleCancelForm} className="h-9 md:h-10 text-sm flex-1 sm:flex-none">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
