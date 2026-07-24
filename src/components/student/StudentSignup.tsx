'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GraduationCap, UserPlus, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { usePageMeta } from '@/lib/seo'

interface StudentSignupProps {
  onSignup: (token: string, user: any) => void
  onNavigateToLogin: () => void
}

interface Course {
  id: string
  title: string
}

export default function StudentSignup({ onSignup, onNavigateToLogin }: StudentSignupProps) {
  usePageMeta('signup')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [courseId, setCourseId] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)
  const [coursesLoading, setCoursesLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.publicCourses()
        setCourses(data.courses || [])
      } catch (err) {
        console.error('Failed to fetch courses:', err)
      } finally {
        setCoursesLoading(false)
      }
    }
    fetchCourses()
  }, [])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address'
    }

    const mobileClean = mobile.replace(/\D/g, '')
    if (!mobileClean) {
      errors.mobile = 'Mobile number is required'
    } else if (mobileClean.length !== 10) {
      errors.mobile = 'Mobile number must be exactly 10 digits'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      const data = await api.studentSignup({
        fullName,
        email,
        mobile,
        password,
        courseId
      })

      // If pending approval
      if (data.status === 'pending') {
        setPendingApproval(true)
        return
      }

      // Auto-approved: auto-login
      if (data.token) {
        onSignup(data.token, data.user)
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (pendingApproval) {
    return (
    <div className="min-h-0 flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Registration Submitted!
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Your registration is pending admin approval. You&apos;ll be able to log in once an admin approves your account.
              </p>
              <Button
                onClick={onNavigateToLogin}
                variant="outline"
                className="mt-4"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-100 mb-4">
            <GraduationCap className="w-8 h-8 text-white dark:text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">MISSION CS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">TEST SERIES</p>
        </div>

        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Create Account</CardTitle>
            <CardDescription>Join the MISSION CS Test Series</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })) }}
                  required
                  disabled={loading}
                  className={`h-11 ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile No.</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); setFieldErrors(prev => ({ ...prev, mobile: '' })) }}
                  required
                  disabled={loading}
                  maxLength={10}
                  className={`h-11 ${fieldErrors.mobile ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.mobile && <p className="text-xs text-red-500 mt-1">{fieldErrors.mobile}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={courseId} onValueChange={setCourseId} disabled={loading || coursesLoading}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={coursesLoading ? 'Loading courses...' : 'Select a course'} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                disabled={loading || coursesLoading || !courseId}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                By clicking Create Account, you agree to our{' '}
                <a href="/?view=privacy-policy" className="underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>{' '}
                and{' '}
                <a href="/?view=terms-conditions" className="underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms &amp; Conditions</a>.
              </p>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={onNavigateToLogin}
                  className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
