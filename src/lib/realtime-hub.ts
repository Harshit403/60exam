// In-memory realtime hub for instant fan-out (used for WebRTC signaling).
// Channels are just string keys. Known channels: 'droom:<id>', 'vroom:<id>'.
type SendFn = (event: string, data: any) => void

const subscribers = new Map<string, Set<SendFn>>()

export function hubSubscribe(channel: string, fn: SendFn): () => void {
  let set = subscribers.get(channel)
  if (!set) {
    set = new Set()
    subscribers.set(channel, set)
  }
  set.add(fn)
  return () => {
    set!.delete(fn)
    if (set!.size === 0) subscribers.delete(channel)
  }
}

export function hubPublish(channel: string, event: string, data: any) {
  const set = subscribers.get(channel)
  if (!set) return 0
  let count = 0
  set.forEach(fn => {
    try { fn(event, data); count++ } catch { /* per-subscriber errors are ignored */ }
  })
  return count
}

export function hubHas(channel: string): boolean {
  return (subscribers.get(channel)?.size || 0) > 0
}