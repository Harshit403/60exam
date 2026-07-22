'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, AlertCircle, Loader2, ArrowLeft, Mail, KeyRound, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { usePageMeta } from '@/lib/seo'
import { toast } from 'sonner'

interface ForgotPasswordProps {
  onBack: () => void
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  usePageMeta('forgot-password')
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.studentForgotPassword(email)
      if (data.devOtp) {
        setDevOtp(data.devOtp)
        toast.success(`OTP sent! (Dev mode: ${data.devOtp})`)
      } else {
        toast.success('OTP sent to your email!')
      }
      setStep('otp')
    } catch (err: any) {
      const message = err.message || 'Failed to send OTP. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP')
      return
    }

    setStep('reset')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await api.studentResetPassword(email, otp, newPassword)
      toast.success('Password reset successfully! Please sign in.')
      onBack()
    } catch (err: any) {
      const message = err.message || 'Failed to reset password. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
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
            <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
              {step === 'email' && <Mail className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
              {step === 'otp' && <KeyRound className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
              {step === 'reset' && <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
            </div>
            <CardTitle className="text-xl">
              {step === 'email' && 'Forgot Password?'}
              {step === 'otp' && 'Verify OTP'}
              {step === 'reset' && 'Set New Password'}
            </CardTitle>
            <CardDescription>
              {step === 'email' && 'Enter your email to receive a reset code'}
              {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
              {step === 'reset' && 'Create a new password for your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`w-8 h-1.5 rounded-full transition-colors ${step === 'email' ? 'bg-slate-900 dark:bg-slate-100' : 'bg-green-500'}`} />
              <div className={`w-8 h-1.5 rounded-full transition-colors ${step === 'otp' ? 'bg-slate-900 dark:bg-slate-100' : step === 'reset' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
              <div className={`w-8 h-1.5 rounded-full transition-colors ${step === 'reset' ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`} />
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {devOtp && step === 'otp' && (
              <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  Dev Mode OTP: <strong className="font-mono text-lg">{devOtp}</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  {loading ? 'Sending OTP...' : 'Send Reset Code'}
                </Button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">6-Digit OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter the 6-digit code"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                    required
                    disabled={loading}
                    className="h-11 text-center text-xl font-mono tracking-[0.5em]"
                    maxLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold"
                  disabled={otp.length !== 6}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Verify OTP
                </Button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:underline"
                >
                  Resend OTP
                </button>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError('') }}
                    required
                    disabled={loading}
                    className="h-11"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    required
                    disabled={loading}
                    className="h-11"
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
