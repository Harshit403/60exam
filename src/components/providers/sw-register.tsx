'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  try {
    const existing = await registration.pushManager.getSubscription()
    if (existing) return

    const publicKeyRes = await fetch('/api/push/public-key')
    if (!publicKeyRes.ok) return
    const { publicKey } = await publicKeyRes.json()
    if (!publicKey) return

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    })

    const sub = subscription.toJSON()
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: sub.keys?.p256dh,
        auth: sub.keys?.auth,
        userAgent: navigator.userAgent,
      }),
    })
    console.log('[SW] Push subscribed')
  } catch (e) {
    // Permission denied or not available — silently skip
    console.info('[SW] Push subscription skipped:', e)
  }
}

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

        const reg = registration
        if (!reg) return
        if (reg.active) {
          subscribeToPush(reg)
        } else {
          reg.addEventListener('activate', () => subscribeToPush(reg), { once: true })
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
