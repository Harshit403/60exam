'use client'

import { useEffect } from 'react'

// Keeps the device screen on for as long as `enabled` is true, using the
// Screen Wake Lock API. The wake lock is released automatically by the browser
// when the tab is hidden or the page is backgrounded, so we re-acquire it on
// `visibilitychange` while still in the room. Screens are released when the
// user leaves the room. Browsers that don't support the API (older Safari /
// Firefox) silently no-op.
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      if (sentinel && !sentinel.released) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        sentinel.addEventListener('release', () => { sentinel = null })
      } catch {
        // Denied or unsupported — the screen just sleeps normally.
      }
    }

    const onVisibility = () => {
      if (cancelled) return
      if (document.visibilityState === 'visible') void acquire()
      // Hidden: the browser releases the lock on its own; nothing to do.
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      try { sentinel?.release() } catch { /* already released */ }
      sentinel = null
    }
  }, [enabled])
}
