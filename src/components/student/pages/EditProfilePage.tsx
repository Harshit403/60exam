'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserCog, CheckCircle2, AlertCircle, Loader2, Camera } from 'lucide-react'
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

  useEffect(() => {
    const init = async () => {
      try {
        const [profileData, coursesData] = await Promise.all([api.studentProfile(), api.publicCourses()])
        const s = profileData.student
        setFullName(s.fullName); setEmail(s.email); setMobile(s.mobile)
        setCourseId(s.courseId); setCourses(coursesData.courses || []); setInitialized(true)
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

  if (!initialized) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 flex items-center justify-center shadow-sm">
          <UserCog className="w-5 h-5 text-white dark:text-slate-900" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Profile</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Update your personal information</p>
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
    </div>
  )
}
