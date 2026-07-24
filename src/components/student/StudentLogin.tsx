'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, LogIn, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, Mail, KeyRound, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api-client'
import { usePageMeta } from '@/lib/seo'
import { toast } from 'sonner'

interface StudentLoginProps {
  onLogin: (token: string, user: any) => void
  onNavigateToSignup: () => void
  onNavigateToForgotPassword: () => void
}

export default function StudentLogin({ onLogin, onNavigateToSignup, onNavigateToForgotPassword }: StudentLoginProps) {
  usePageMeta('signin')
  const [emailOrMobile, setEmailOrMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.studentLogin(emailOrMobile, password)
      toast.success('Welcome back!')
      onLogin(data.token, data.user)
    } catch (err: any) {
      const message = err.message || 'Login failed. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-0 flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-100 mb-4 shadow-lg">
            <GraduationCap className="w-8 h-8 text-white dark:text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">MISSION CS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">TEST SERIES</p>
        </div>

        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your student account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="animate-shake">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="emailOrMobile">Email or Mobile</Label>
                <Input
                  id="emailOrMobile"
                  type="text"
                  placeholder="Enter your email or mobile number"
                  value={emailOrMobile}
                  onChange={(e) => { setEmailOrMobile(e.target.value); setError('') }}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={onNavigateToForgotPassword}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    required
                    disabled={loading}
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <button
                  onClick={onNavigateToSignup}
                  className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
