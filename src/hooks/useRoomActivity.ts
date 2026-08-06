'use client'

import { useEffect, useRef, useCallback } from 'react'

const INTERACTION_WINDOW_MS = 2 * 60 * 1000

// Tracks whether the user is genuinely present in a call. A user counts as
// active if they've interacted with the page recently (mouse/touch/keyboard/
// scroll) or if they're actively listening (tab is visible AND call audio/video
// is running). The returned `isActive` guards the heartbeat request so that
// truly inactive users (hidden/closed tab, walked away) stop refreshing their
// `lastActiveAt` and get pruned by the server-side inactivity timeout.
export function useRoomActivity(getListening: () => boolean): () => boolean {
  const lastInteractionRef = useRef<number>(Date.now())

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = [
      'pointermove', 'pointerdown', 'keydown', 'touchstart', 'scroll', 'click',
    ]
    const onActivity = () => { lastInteractionRef.current = Date.now() }
    for (const e of events) window.addEventListener(e, onActivity, { passive: true })
    return () => {
      for (const e of events) window.removeEventListener(e, onActivity)
    }
  }, [])

  return useCallback(() => {
    const interacted = Date.now() - lastInteractionRef.current < INTERACTION_WINDOW_MS
    return interacted || getListening()
  }, [getListening])
}
