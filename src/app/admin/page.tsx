'use client'

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react'
import { useAuthStore } from '@/lib/store'
import AdminPanel from '@/components/admin/AdminPanel'
import AdminLogin from '@/components/admin/AdminLogin'

const emptySubscribe = () => () => {}

export default function AdminPage() {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const { token, role, setAuth, logout, hydrate, hydrated } = useAuthStore()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  const handleLogin = useCallback((newToken: string, userData: any) => {
    setAuth(newToken, 'admin', userData)
    setLoggedIn(true)
  }, [setAuth])

  const handleLogout = useCallback(() => {
    logout()
    setLoggedIn(false)
  }, [logout])

  if (!isClient || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    )
  }

  if (token && role === 'admin' && !loggedIn) setLoggedIn(true)

  if (token && role === 'admin') {
    return <AdminPanel onLogout={handleLogout} />
  }

  return <AdminLogin onLogin={handleLogin} onBack={() => (window.location.href = '/')} />
}
