'use client'

import { useState, useCallback, useEffect, useSyncExternalStore, useRef } from 'react'
import { useAuthStore } from '@/lib/store'
import LandingPage from '@/components/landing/LandingPage'
import CSExecutivePage from '@/components/landing/CSExecutivePage'
import CSProfessionalPage from '@/components/landing/CSProfessionalPage'
import AdminPanel from '@/components/admin/AdminPanel'
import StudentPanel from '@/components/student/StudentPanel'
import StudentLogin from '@/components/student/StudentLogin'
import StudentSignup from '@/components/student/StudentSignup'
import ForgotPassword from '@/components/student/ForgotPassword'
import DiscussionLandingPage from '@/components/landing/DiscussionLandingPage'
import ReviewsLandingPage from '@/components/landing/ReviewsLandingPage'
import PrivacyPolicyPage from '@/components/legal/PrivacyPolicyPage'
import TermsAndConditionsPage from '@/components/legal/TermsAndConditionsPage'
import RefundPolicyPage from '@/components/legal/RefundPolicyPage'

type View = 'landing' | 'admin' | 'student' | 'student-login' | 'student-signup' | 'forgot-password' | 'cs-executive' | 'cs-professional' | 'discussions' | 'reviews' | 'privacy-policy' | 'terms-conditions' | 'refund-policy'

// Loading skeleton for SSR
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// Empty subscription for useSyncExternalStore (no real external store needed)
const emptySubscribe = () => () => {}

export default function Home() {
  // Detect client-side rendering without using setState in effects
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const { token, role, setAuth, logout, hydrate, hydrated } = useAuthStore()
  const [currentView, setCurrentView] = useState<View>('landing')
  const initialUrlRead = useRef(false)

  const navigableViews = new Set<View>(['reviews','discussions','cs-executive','cs-professional','student-login','student-signup','forgot-password','privacy-policy','terms-conditions','refund-policy'])

  // Read view from URL on mount
  useEffect(() => {
    if (!hydrated) { hydrate(); return }
    if (initialUrlRead.current) return
    initialUrlRead.current = true

    const params = new URLSearchParams(window.location.search)
    const raw = params.get('view')
    if (raw === 'signin') { setCurrentView('student-login'); return }
    if (raw === 'signup') { setCurrentView('student-signup'); return }
    if (raw === 'admin-login') { window.location.href = '/admin'; return }
    if (raw && navigableViews.has(raw as View)) { setCurrentView(raw as View) }
  }, [hydrated, hydrate])

  // Sync view → URL when navigating
  const handleNavigate = useCallback((view: string) => {
    if (view === 'admin-login') { window.location.href = '/admin'; return }
    setCurrentView(view as View)
    const v = view === 'student-login' ? 'signin' : view === 'student-signup' ? 'signup' : view
    window.history.pushState({ view: v }, '', v === 'landing' ? '/' : `/?view=${v}`)
  }, [])

  // Handle browser back/forward
  useEffect(() => {
    const handlePop = () => {
      if (!initialUrlRead.current) return
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('view')
      if (raw === 'signin') { setCurrentView('student-login'); return }
      if (raw === 'signup') { setCurrentView('student-signup'); return }
      if (raw && navigableViews.has(raw as View)) { setCurrentView(raw as View); return }
      setCurrentView('landing')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    if (!hydrated) { hydrate() }
  }, [hydrated, hydrate])

  // Log visitor IP on page load
  useEffect(() => {
    if (isClient && hydrated) {
      fetch('/api/ip-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: window.location.pathname,
          action: 'visit',
          studentId: undefined,
        }),
      }).catch(() => {})
    }
  }, [isClient, hydrated, token, role])

  const handleStudentLogin = useCallback((newToken: string, userData: any) => {
    setAuth(newToken, 'student', userData)
    setCurrentView('student')
  }, [setAuth])

  const handleLogout = useCallback(() => {
    logout()
    setCurrentView('landing')
  }, [logout])

  // Determine the effective view based on auth state
  const effectiveView: View = (() => {
    if (!isClient || !hydrated) return 'landing'
    // If user has token and on landing, auto-redirect to their panel
    if (token && role === 'admin' && currentView === 'landing') return 'admin'
    if (token && role === 'student' && currentView === 'landing') return 'student'
    // If no token and trying to access protected views, redirect to landing
    if (!token && (currentView === 'admin' || currentView === 'student')) return 'landing'
    return currentView
  })()

  // Don't render app content until client-side hydration is complete
  if (!isClient) {
    return <LoadingSkeleton />
  }

  const isLoggedIn = !!token
  const userRole = role as 'admin' | 'student' | null

  if (effectiveView === 'admin') {
    return <AdminPanel onLogout={handleLogout} />
  }

  if (effectiveView === 'student') {
    return <StudentPanel onLogout={handleLogout} />
  }

  if (effectiveView === 'student-login') {
    return (
      <StudentLogin
        onLogin={handleStudentLogin}
        onNavigateToSignup={() => setCurrentView('student-signup')}
        onNavigateToForgotPassword={() => setCurrentView('forgot-password')}
      />
    )
  }

  if (effectiveView === 'student-signup') {
    return (
      <StudentSignup
        onSignup={handleStudentLogin}
        onNavigateToLogin={() => setCurrentView('student-login')}
      />
    )
  }

  if (effectiveView === 'forgot-password') {
    return (
      <ForgotPassword
        onBack={() => setCurrentView('student-login')}
      />
    )
  }

  if (effectiveView === 'cs-executive') {
    return <CSExecutivePage onNavigate={handleNavigate} />
  }

  if (effectiveView === 'cs-professional') {
    return <CSProfessionalPage onNavigate={handleNavigate} />
  }

  if (effectiveView === 'reviews') {
    return <ReviewsLandingPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} userRole={userRole} />
  }

  if (effectiveView === 'discussions') {
    return <DiscussionLandingPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} userRole={userRole} />
  }

  if (effectiveView === 'privacy-policy') {
    return <PrivacyPolicyPage onNavigate={handleNavigate} />
  }

  if (effectiveView === 'terms-conditions') {
    return <TermsAndConditionsPage onNavigate={handleNavigate} />
  }

  if (effectiveView === 'refund-policy') {
    return <RefundPolicyPage onNavigate={handleNavigate} />
  }

  return <LandingPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} userRole={userRole} />
}
