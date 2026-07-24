'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev && !localStorage.getItem('sw-test')) return

    let registration: ServiceWorkerRegistration | null = null

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[SW] Registered with scope:', registration.scope)

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.onupdatefound = () => {
          const newWorker = registration!.installing
          if (!newWorker) return

          newWorker.onstatechange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Update Available', {
                description: 'A new version is ready.',
                action: {
                  label: 'Refresh',
                  onClick: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  },
                },
                duration: 10000,
              })
            }
          }
        }
      } catch (err) {
        console.warn('[SW] Registration failed:', err)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }

    return () => {
      if (registration) {
        registration.onupdatefound = null
      }
    }
  }, [])

  return null
}