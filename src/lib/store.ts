import { create } from 'zustand'

interface AuthState {
  token: string | null
  role: 'admin' | 'student' | null
  user: any | null
  hydrated: boolean
  setAuth: (token: string, role: 'admin' | 'student', user: any) => void
  logout: () => void
  hydrate: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  role: null,
  user: null,
  hydrated: false,
  setAuth: (token, role, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
    }
    set({ token, role, user, hydrated: true })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
    }
    set({ token: null, role: null, user: null, hydrated: true })
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const role = localStorage.getItem('role') as 'admin' | 'student' | null
      set({ token, role, hydrated: true })
    }
  },
  isAuthenticated: () => !!get().token,
}))
