'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserCog, CheckCircle2, AlertCircle, Loader2, Camera, Bell, BellOff, CalendarClock, Clock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { DashboardData } from '../types'
import { LoadingSkeleton } from '../utils'

export function EditProfilePage({ data, onRefresh }: { data: DashboardData | null; onRefresh: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [courseId, setCourseId] = useState('')
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [initialized, setInitialized] = useState(false)

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true)
  const [dailyPlanReminderEnabled, setDailyPlanReminderEnabled] = useState(true)
  const [dailyPlanReminderTime, setDailyPlanReminderTime] = useState('09:00')
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const [profileData, coursesData, notifPrefs] = await Promise.all([
          api.studentProfile(),
          api.publicCourses(),
          api.getNotificationPreferences(),
        ])
        const s = profileData.student
        setFullName(s.fullName); setEmail(s.email); setMobile(s.mobile)
        setCourseId(s.courseId); setCourses(coursesData.courses || []); setInitialized(true)
        setPushNotificationsEnabled(notifPrefs.pushNotificationsEnabled)
        setDailyPlanReminderEnabled(notifPrefs.dailyPlanReminderEnabled)
        setDailyPlanReminderTime(notifPrefs.dailyPlanReminderTime || '09:00')
      } catch (err) { console.error('Profile init error:', err) }
    }
    init()
  }, [])

  const handleSave = async () => {
    if (!fullName) return
    setLoading(true); setError(''); setSuccess(false)
    try {
      await api.studentUpdateProfile({ fullName, courseId })
      setSuccess(true); onRefresh(); setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) { setError(err.message || 'Update failed') }
    finally { setLoading(false) }
  }

  const handleNotifSave = async () => {
    setNotifLoading(true); setNotifSuccess(false)
    try {
      await api.updateNotificationPreferences({
        pushNotificationsEnabled,
        dailyPlanReminderEnabled,
        dailyPlanReminderTime,
      })
      setNotifSuccess(true); setTimeout(() => setNotifSuccess(false), 3000)
    } catch (err: any) { setError(err.message || 'Failed to update preferences') }
    finally { setNotifLoading(false) }
  }

  if (!initialized) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 flex items-center justify-center shadow-sm">
          <UserCog className="w-5 h-5 text-white dark:text-slate-900" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Profile</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Update your personal information and notification preferences</p>
        </div>
      </div>

      <Card className="max-w-lg overflow-hidden">
        <CardContent className="pt-6 space-y-6 p-4 sm:p-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-slate-200 dark:ring-slate-700">
                <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 text-xl font-bold">
                  {(fullName || 'S').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 shadow-md hover:scale-110 transition-transform">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{fullName || 'Student'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 pop-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700 dark:text-emerald-400">Profile updated successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px]">Read Only</Badge></Label>
              <Input value={email} disabled className="h-11 bg-slate-50 dark:bg-slate-900 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mobile <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px]">Read Only</Badge></Label>
              <Input value={mobile} disabled className="h-11 bg-slate-50 dark:bg-slate-900 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading || !fullName}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 w-full sm:w-auto active:scale-[0.98] transition-transform">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="max-w-lg overflow-hidden">
        <CardContent className="pt-6 space-y-5 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Notification Preferences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Control what notifications you receive</p>
            </div>
          </div>

          {notifSuccess && (
            <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 pop-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700 dark:text-emerald-400">Notification preferences updated!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 min-w-0">
                {pushNotificationsEnabled ? (
                  <Bell className="w-5 h-5 text-indigo-600 shrink-0" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <Label className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer">Admin Push Notifications</Label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Receive broadcast notifications from admin</p>
                </div>
              </div>
              <Switch checked={pushNotificationsEnabled} onCheckedChange={setPushNotificationsEnabled} className="data-[state=checked]:bg-indigo-600 shrink-0" />
            </div>

            {/* Daily Plan Reminder */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 min-w-0">
                <CalendarClock className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <Label className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer">Daily Study Plan Reminder</Label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Get a daily push notification with your planned chapters</p>
                </div>
              </div>
              <Switch checked={dailyPlanReminderEnabled} onCheckedChange={setDailyPlanReminderEnabled} className="data-[state=checked]:bg-indigo-600 shrink-0" />
            </div>

            {/* Time picker - shown only when daily reminder is enabled */}
            {dailyPlanReminderEnabled && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50">
                <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Reminder Time</Label>
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-500">Choose when to receive your daily study plan</p>
                </div>
                <input
                  type="time"
                  value={dailyPlanReminderTime}
                  onChange={(e) => setDailyPlanReminderTime(e.target.value)}
                  className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-sm text-indigo-900 dark:text-indigo-100 outline-none focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>
            )}
          </div>

          <Button onClick={handleNotifSave} disabled={notifLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto active:scale-[0.98] transition-transform">
            {notifLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Save Notification Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
