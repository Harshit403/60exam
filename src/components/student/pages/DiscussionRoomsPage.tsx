'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mic, MicOff, Users, Wifi, WifiOff, ArrowLeft, Loader2, ShieldCheck,
  UserX, UserPlus, Check, X, Clock, Volume2, MessageCircle,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSSE } from '@/hooks/useSSE'
import { useRoomActivity } from '@/hooks/useRoomActivity'
import { RoomCall, RoomMember } from '@/lib/room-call'
import { GenderJoinModal } from '@/components/student/GenderJoinModal'

interface RoomInfo {
  id: string; name: string; description: string | null
  maxCapacity: number; present: number; isFull: boolean
  speakers?: { userId: string; displayName: string }[]
}

interface MeInfo {
  userId: string; displayName: string; color: string; gender?: string
  role: string; onStage: boolean; stageRequested?: boolean; stageInvited?: boolean
}

function avatarColorStyle(color: string) {
  return { backgroundColor: color + '22', color, borderColor: color + '44' }
}

function computeLevel(analyser: AnalyserNode): number {
  try {
    const data = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    return Math.max(0, Math.min(1, (rms - 0.02) * 6))
  } catch { return 0 }
}

// Split the frequency spectrum into `bands` equal bins, each 0..1. This lets the
// wave reflect the pitch/timbre of the voice (an equalizer), not just volume.
function computeSpectrum(analyser: AnalyserNode, bands: number): number[] {
  try {
    const freq = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(freq)
    const out = new Array(bands).fill(0)
    const step = Math.max(1, Math.floor(freq.length / bands))
    for (let b = 0; b < bands; b++) {
      let sum = 0
      const start = b * step
      const end = Math.min(freq.length, start + step)
      for (let i = start; i < end; i++) sum += freq[i]
      out[b] = sum / Math.max(1, end - start) / 255
    }
    return out
  } catch { return new Array(bands).fill(0) }
}

const SPEAKING_THRESHOLD = 0.1
const BAND_COUNT = 7

interface VoiceMeter { lvl: number; bands: number[] }

const ZERO_METER: VoiceMeter = { lvl: 0, bands: new Array(BAND_COUNT).fill(0) }

// The wave appears ONLY on the user who is actually speaking. Silent
// participants get no effect at all (space is reserved so cards don't jump).
// When speaking, each bar's height follows its frequency band's energy so
// louder/pitchier speech raises taller bars, with a pulse animation.
function SpeakingWave({ meter, color }: { meter: VoiceMeter; color: string }) {
  const speaking = meter.lvl >= SPEAKING_THRESHOLD
  if (!speaking) return <div className="flex items-end justify-center gap-[2px] h-4" aria-hidden="true" />
  return (
    <div className="flex items-end justify-center gap-[2px] h-4" style={{ color }}>
      {meter.bands.map((b, i) => (
        <span
          key={i}
          className="speaking-bar"
          style={{
            animationDelay: `${i * 70}ms`,
            height: `${Math.max(4, Math.round(b * 26))}px`,
          }}
        />
      ))}
    </div>
  )
}

export function DiscussionRoomsPage() {
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<RoomInfo | null>(null)
  const [me, setMe] = useState<MeInfo | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [connecting, setConnecting] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [levels, setLevels] = useState<Record<string, VoiceMeter>>({})
  const [genderPickRoom, setGenderPickRoom] = useState<RoomInfo | null>(null)
  const [inactiveRemoved, setInactiveRemoved] = useState(false)
  const levelsRef = useRef<Record<string, VoiceMeter>>({})
  const userIdRef = useRef<string>('anon')
  const wasMemberRef = useRef(false)
  const callRef = useRef<RoomCall | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioNodesRef = useRef<Map<string, { source: MediaStreamAudioSourceNode; analyser: AnalyserNode }>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const localAnalyserRef = useRef<AnalyserNode | null>(null)

  // Only send heartbeats while the user is genuinely present: they interacted
  // with the page recently, or they're listening (visible tab + audio running).
  const isActive = useRoomActivity(useCallback(() => {
    return document.visibilityState === 'visible' && audioCtxRef.current?.state === 'running'
  }, []))

  const fetchRooms = useCallback(async () => {
    try {
      const data = await api.studentDiscussionRooms()
      setRooms(data.rooms || [])
      setCurrentRoom(data.currentRoom || null)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchRooms() }, [fetchRooms])

  // Keep the list's "X is speaking…" indicator fresh while browsing.
  useEffect(() => {
    if (active || loading) return
    const t = setInterval(fetchRooms, 15000)
    return () => clearInterval(t)
  }, [active, loading, fetchRooms])

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userIdRef.current = payload.id || 'anon'
      }
    } catch { /* ignore */ }
  }, [])

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        const Ctor = (window.AudioContext || (window as any).webkitAudioContext)
        const ctx = new Ctor()
        audioCtxRef.current = ctx
        ctx.resume?.().catch(() => {})
      } catch { /* ignore */ }
    }
    return audioCtxRef.current
  }, [])

  const attachRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
    if (audioNodesRef.current.has(userId)) return
    const ctx = ensureAudioCtx()
    if (!ctx) return
    try {
      const source = ctx.createMediaStreamSource(stream)
      // Route the remote stream straight to the speakers so it always plays,
      // and fan a copy out to the analyser for the speaking wave/meter.
      source.connect(ctx.destination)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      audioNodesRef.current.set(userId, { source, analyser })
    } catch (err) { console.error('[AudioMeter] attach failed', userId, err) }
  }, [ensureAudioCtx])

  const detachRemoteAudio = useCallback((userId: string) => {
    const node = audioNodesRef.current.get(userId)
    if (node) {
      try { node.source.disconnect(); node.analyser.disconnect() } catch { /* ignore */ }
      audioNodesRef.current.delete(userId)
    }
  }, [])

  const setupLocalAnalyser = useCallback(() => {
    const stream = localStreamRef.current
    const ctx = ensureAudioCtx()
    if (!stream || !ctx) return
    if (localAnalyserRef.current) {
      try { localAnalyserRef.current.disconnect() } catch { /* ignore */ }
      localAnalyserRef.current = null
    }
    try {
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      localAnalyserRef.current = analyser
    } catch { /* ignore */ }
  }, [ensureAudioCtx])

  const cleanupAudio = useCallback(() => {
    for (const userId of Array.from(audioNodesRef.current.keys())) detachRemoteAudio(userId)
    if (localAnalyserRef.current) {
      try { localAnalyserRef.current.disconnect() } catch { /* ignore */ }
      localAnalyserRef.current = null
    }
    try { audioCtxRef.current?.close?.() } catch { /* ignore */ }
    audioCtxRef.current = null
    localStreamRef.current = null
    levelsRef.current = {}
    setLevels({})
  }, [detachRemoteAudio])

  const { isConnected } = useSSE({
    channel: active ? `droom:${active.id}` : 'none',
    enabled: !!active,
    onEvent: useCallback((event: string, data: any) => {
      if (event === 'droom-state') {
        const present = (data.members || [])
        setMembers(present)
        if (data.room) setActive(prev => prev ? { ...prev, present: data.room.present, maxCapacity: data.room.maxCapacity } : prev)
        const sworn = (present as any[]).find((m: any) => m.userId === userIdRef.current)
        if (wasMemberRef.current && !sworn) setInactiveRemoved(true)
        if (sworn) wasMemberRef.current = true
        setMe(prev => sworn ? {
          ...prev,
          userId: sworn.userId, displayName: sworn.displayName, color: sworn.color,
          gender: sworn.gender, role: sworn.role, onStage: sworn.onStage, stageRequested: sworn.stageRequested,
          stageInvited: sworn.stageInvited,
        } : prev)
        callRef.current?.setPresence(present.filter((m: any) => m.userId !== userIdRef.current))
      } else if (event === 'signal') {
        callRef.current?.onSignal(data.from, data.to, data.data, data.id)
      }
    }, []),
  })

  // Manage RoomCall lifecycle for the active room
  useEffect(() => {
    if (!active) return
    const call = new RoomCall({
      userId: userIdRef.current,
      roomId: active.id,
      kind: 'audio',
      enabled: true,
      getMyIsSpeaker: () => !!me?.onStage,
      getPeerIsSpeaker: (m) => m.onStage === true,
      sendSignal: (to, data) => {
        api.realtimePublish({ action: 'discussion-signal', roomId: active.id, to, data }).catch(() => {})
      },
      onStreamAdded: (userId, stream) => {
        setRemoteStreams(prev => {
          const next = new Map(prev); next.set(userId, stream); return next
        })
      },
      onStreamRemoved: (userId) => {
        setRemoteStreams(prev => {
          const next = new Map(prev); next.delete(userId); return next
        })
      },
      onLocalMedia: (stream) => {
        localStreamRef.current = stream
        setupLocalAnalyser()
      },
    })
    callRef.current = call
    call.start()
    // Speaker is on by default — push the current UI state so the engine always
    // starts un-muted when a fresh call is created.
    call.setMicEnabled(micOn)
    return () => { call.dispose(); callRef.current = null; cleanupAudio() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id])

  // Heartbeat while in call — but only when genuinely active, so inactive
  // users age out and get pruned by the server.
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      if (inactiveRemoved || !isActive()) return
      api.realtimePublish({ action: 'discussion-heartbeat', roomId: active.id }).catch(() => {})
    }, 25000)
    return () => clearInterval(t)
  }, [active?.id, isActive, inactiveRemoved])

  // Keep speaker state in sync with my stage status
  useEffect(() => {
    callRef.current?.setSpeaker(!!me?.onStage)
  }, [me?.onStage])

  const join = async (room: RoomInfo, gender?: 'male' | 'female') => {
    setActionBusy(true)
    try {
      const data = await api.studentDiscussionRoomJoin(room.id, gender)
      const m = data.member
      if (m) setMe({ userId: m.userId, displayName: m.displayName, color: m.color, gender: m.gender, role: m.role, onStage: m.onStage, stageRequested: false, stageInvited: false })
      wasMemberRef.current = true
      setInactiveRemoved(false)
      setRemoteStreams(new Map())
      setActive(room)
      setCurrentRoom(room)
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isFull: true } : r))
      ensureAudioCtx()
    } catch (err: any) {
      alert(err?.message || 'Could not join room')
    } finally { setActionBusy(false) }
  }

  // Route incoming audio through Web Audio (analyser → speakers) and meter the
  // volume so we can show a "who is speaking" wave on each stage member.
  useEffect(() => {
    if (!active) return
    for (const [userId, stream] of remoteStreams) attachRemoteAudio(userId, stream)
    for (const userId of Array.from(audioNodesRef.current.keys())) {
      if (!remoteStreams.has(userId)) detachRemoteAudio(userId)
    }
  }, [active, remoteStreams, attachRemoteAudio, detachRemoteAudio])

  // Sample the analysers ~11x/sec and update only when a bucket changes.
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      const next: Record<string, VoiceMeter> = { ...levelsRef.current }
      let changed = false
      const sample = (analyser: AnalyserNode, key: string) => {
        const meter: VoiceMeter = {
          lvl: Math.round(computeLevel(analyser) * 20) / 20,
          bands: computeSpectrum(analyser, BAND_COUNT),
        }
        const prev = levelsRef.current[key]
        const bandsDiff = prev
          ? Math.max(...prev.bands.map((b, i) => Math.abs(b - meter.bands[i])))
          : 1
        if (!prev || Math.abs(prev.lvl - meter.lvl) > 0.05 || bandsDiff > 0.05) changed = true
        next[key] = meter
      }
      for (const [userId, { analyser }] of audioNodesRef.current) sample(analyser, userId)
      if (localAnalyserRef.current) sample(localAnalyserRef.current, 'me')
      if (changed) {
        levelsRef.current = next
        setLevels(next)
      }
    }, 90)
    return () => clearInterval(t)
  }, [active])

  // Browsers suspend the AudioContext when autoplay policy can't be satisfied
  // (context created outside a gesture, after tab switch, etc.). If it's ever
  // suspended, incoming remote audio is routed but silent — so keep nudging it
  // back to "running" so stage voices actually play.
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      const ctx = audioCtxRef.current
      if (ctx && ctx.state === 'suspended') ctx.resume?.().catch(() => {})
    }, 1000)
    return () => clearInterval(t)
  }, [active])

  const leaveRoom = async () => {
    if (!active) return
    try { await api.studentDiscussionRoomLeave(active.id) } catch { /* ignore */ }
    wasMemberRef.current = false
    setInactiveRemoved(false)
    setActive(null); setMe(null); setMembers([]); setRemoteStreams(new Map())
    setCurrentRoom(null); setMicOn(true)
    fetchRooms()
  }

  const stageAction = async (target: string, stageAction: string) => {
    if (!active) return
    setActionBusy(true)
    try { await api.realtimePublish({ action: 'discussion-stage', roomId: active.id, target, stageAction }) }
    catch (err: any) { alert(err?.message || 'Action failed') }
    finally { setActionBusy(false) }
  }

  // ── List view ───────────────────────────────────────────────────
  if (!active && !loading) {
    return (
      <>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md">
            <Volume2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Discussion Rooms</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Voice chat with the community. Join a room to speak with peers anonymously.</p>
          </div>
        </div>

        {currentRoom && (
          <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-orange-200 dark:bg-orange-900/40 flex items-center justify-center">
                <Mic className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{currentRoom.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">You are currently in this voice room</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setGenderPickRoom(currentRoom)} className="bg-orange-600 hover:bg-orange-700">
              <Mic className="w-4 h-4 mr-1" /> Join Voice
            </Button>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">
            <Volume2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No discussion rooms available yet</p>
            <p className="text-xs">Check back soon!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {rooms.map(r => {
              const full = r.present >= r.maxCapacity
              return (
                <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${full ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.name}</p>
                        {r.speakers && r.speakers.length > 0 ? (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="truncate">{r.speakers.map(s => s.displayName).join(', ')} {r.speakers.length > 1 ? 'are' : 'is'} speaking...</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{r.description || 'Voice discussion room'}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={full ? 'secondary' : 'outline'} className={`shrink-0 text-[10px] ${full ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      <Users className="w-3 h-3 mr-1" /> {r.present}/{r.maxCapacity}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      {r.isCurrentUserMember ? (
                        <Button size="sm" onClick={() => setGenderPickRoom(r)} className="text-xs">Rejoin Voice</Button>
                      ) : (
                        <Button size="sm" onClick={() => setGenderPickRoom(r)} disabled={full || actionBusy} className="bg-rose-600 hover:bg-rose-700 text-xs">
                          {full ? 'Room Full' : 'Join Voice'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <GenderJoinModal
        open={!!genderPickRoom}
        title="Join Discussion Room"
        subtitle="Select your identity — a random anonymous name will be assigned for this room."
        confirmLabel="Join Audio"
        onClose={() => setGenderPickRoom(null)}
        onConfirm={(g) => { const room = genderPickRoom; setGenderPickRoom(null); if (room) join(room, g) }}
      />
      </>
    )
  }

  // ── Call view ───────────────────────────────────────────────────
  const onStage = members.filter(m => m.onStage)
  const audience = members.filter(m => !m.onStage)
  const stageCountdown = (onStageSince?: number | null) => {
    if (!onStageSince) return null
    const left = (onStageSince + 5 * 60 * 1000) - Date.now()
    if (left <= 0) return null
    const secs = Math.max(0, Math.floor(left / 1000))
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 dark:from-rose-600 dark:to-pink-700 text-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={leaveRoom} className="p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm truncate">{active?.name}</h2>
              <p className="text-[10px] text-white/80 flex items-center gap-1">
                <Users className="w-3 h-3" /> {active?.present}/{active?.maxCapacity}
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-300" />
                <span>{isConnected ? 'Connected' : 'Connecting...'} · Anonymous Voice</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1 mr-1">
              {onStage.slice(0, 4).map(m => (
                <div key={m.userId} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white/30" title={m.displayName} style={{ backgroundColor: m.color }}>
                  {m.displayName.charAt(0)}
                </div>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={leaveRoom} className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Removed for inactivity */}
      {inactiveRemoved && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
          <WifiOff className="w-7 h-7 mx-auto mb-2 text-amber-500" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">You were removed for inactivity</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">You were away from this voice room for more than 5 minutes.</p>
          <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 dark:border-amber-800" onClick={leaveRoom}>Leave Room</Button>
        </div>
      )}

      {/* Me card */}
      {!inactiveRemoved && me && (() => {
        const meSpeaking = (levels['me']?.lvl ?? 0) >= SPEAKING_THRESHOLD
        return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className={`h-9 w-9 ring-2 ${meSpeaking ? 'speaking-pulse' : ''}`} style={avatarColorStyle(me.color)}>
              <AvatarFallback className="text-sm font-bold" style={{ backgroundColor: me.color + '22', color: me.color }}>
                {me.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{me.displayName}</p>
                <Badge variant="secondary" className="text-[9px] h-4 capitalize">
                  {me.role === 'moderator'
                    ? <><ShieldCheck className="w-3 h-3 mr-0.5 text-amber-500" /> Moderator</>
                    : me.onStage ? 'On Stage' : 'Audience'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {me.onStage
                  ? (micOn
                      ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Mic className="w-3 h-3" /> Speaking · your voice is live</span>
                      : <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1"><MicOff className="w-3 h-3" /> Mic muted</span>)
                  : me.stageInvited
                    ? <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Check className="w-3 h-3" /> Invited to the stage — accept or decline</span>
                    : me.stageRequested
                      ? 'Request pending · waiting for a moderator'
                      : 'You are muted · listeners only'}
              </p>
              {me.onStage && (
                <div className="mt-1"><SpeakingWave meter={levels['me'] || ZERO_METER} color={me.color} /></div>
              )}
              {me.onStage && me.role === 'stage' && stageCountdown(members.find(m => m.userId === me.userId)?.onStageSince) && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Auto-promote to moderator in {stageCountdown(members.find(m => m.userId === me.userId)?.onStageSince)}
                </p>
              )}
            </div>
          </div>
          {me.onStage ? (
            <Button
              size="sm"
              variant={micOn ? 'default' : 'destructive'}
              onClick={() => { const next = !micOn; setMicOn(next); callRef.current?.setMicEnabled(next); audioCtxRef.current?.resume?.().catch(() => {}) }}
              className="shrink-0"
            >
              {micOn ? <><Mic className="w-3 h-3 mr-1" /> Mute</> : <><MicOff className="w-3 h-3 mr-1" /> Unmute</>}
            </Button>
          ) : me.stageInvited ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => stageAction(me.userId, 'decline-invite')} disabled={actionBusy} className="text-rose-600 border-rose-200 dark:border-rose-900">
                <X className="w-3 h-3 mr-1" /> Decline
              </Button>
              <Button size="sm" onClick={() => stageAction(me.userId, 'accept-invite')} disabled={actionBusy} className="bg-emerald-600 hover:bg-emerald-700">
                <Check className="w-3 h-3 mr-1" /> Accept
              </Button>
            </div>
          ) : me.stageRequested ? (
            <Button size="sm" variant="outline" onClick={() => stageAction(me.userId, 'cancel-request')} disabled={actionBusy} className="shrink-0 text-slate-500 border-slate-300 dark:border-slate-600">
              <X className="w-3 h-3 mr-1" /> Cancel Request
            </Button>
          ) : (
            <Button size="sm" onClick={() => stageAction(me.userId, 'request')} disabled={actionBusy} className="shrink-0">
              Request to Go on Stage
            </Button>
          )}
        </div>
        )
      })()}

      {/* Stage participants */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">On Stage ({onStage.length})</h3>
          {me?.role === 'moderator' && <Badge variant="outline" className="text-[9px] text-amber-600 dark:text-amber-400"><ShieldCheck className="w-3 h-3 mr-1" /> You can manage the stage</Badge>}
        </div>
        {onStage.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-400 dark:text-slate-500">
            <Volume2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No one is on the stage yet. First two joiners become moderators and go on stage.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {onStage.map(m => {
              const isMe = m.userId === userIdRef.current
              const speaking = (levels[m.userId]?.lvl ?? 0) >= SPEAKING_THRESHOLD
              return (
                <div key={m.userId} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex flex-col items-center gap-1.5 shadow-sm text-center">
                  <div className="relative">
                    <Avatar className={`h-12 w-12 ring-2 ${speaking ? 'speaking-pulse' : ''}`} style={avatarColorStyle(m.color)}>
                      <AvatarFallback className="text-base font-bold" style={{ backgroundColor: m.color + '22', color: m.color }}>
                        {m.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-slate-900 ${speaking ? 'animate-pulse' : ''}`}>
                      <Mic className="w-2.5 h-2.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[90px]">{m.displayName}{isMe ? ' (you)' : ''}</p>
                    <Badge variant="secondary" className="text-[8px] h-3.5 mt-0.5 capitalize">
                      {m.role === 'moderator' ? <><ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-amber-500" />Moderator</> : 'On Stage'}
                    </Badge>
                  </div>
                  <div className="-mt-1"><SpeakingWave meter={levels[m.userId] || ZERO_METER} color={m.color} /></div>
                  {!isMe && m.role !== 'moderator' && me?.role === 'moderator' && (
                    <Button size="sm" variant="outline" className="text-[10px] h-7 text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900" onClick={() => stageAction(m.userId, 'remove')} disabled={actionBusy}>
                      <UserX className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Audience */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Audience ({audience.filter(m => m.userId !== userIdRef.current).length})</h3>
        {audience.filter(m => m.userId !== userIdRef.current).length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No one in the audience.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {audience.map(m => {
              if (m.userId === userIdRef.current) return null
              const requested = m.stageRequested
              const invited = m.stageInvited
              return (
                <div key={m.userId} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8" style={avatarColorStyle(m.color)}>
                      <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: m.color + '22', color: m.color }}>{m.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{m.displayName}</p>
                      {requested && <p className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><Mic className="w-2.5 h-2.5" /> Wants to speak</p>}
                      {!requested && invited && <p className="text-[9px] text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> Invited to stage</p>}
                    </div>
                  </div>
                  {me?.role === 'moderator' && (
                    <div className="flex items-center gap-1 shrink-0">
                      {requested ? (
                        <>
                          <button onClick={() => stageAction(m.userId, 'approve')} disabled={actionBusy} title="Approve request" className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 hover:bg-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => stageAction(m.userId, 'deny')} disabled={actionBusy} title="Deny request" className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 hover:bg-rose-200">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : invited ? (
                        <button onClick={() => stageAction(m.userId, 'uninvite')} disabled={actionBusy} title="Cancel invitation" className="px-2 py-1 rounded-lg text-[9px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200">
                          <X className="w-3 h-3 inline mr-0.5 -mt-0.5" /> Invited
                        </button>
                      ) : (
                        <button onClick={() => stageAction(m.userId, 'invite')} disabled={actionBusy} title="Invite to stage" className="px-2 py-1 rounded-lg text-[9px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200">
                          <UserPlus className="w-3 h-3 inline mr-0.5 -mt-0.5" /> Invite
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Connection note */}
      <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        {isConnected ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
        {isConnected ? 'Connected' : 'Connecting to the room…'}
        <span className="ml-auto flex items-center gap-1"><Volume2 className="w-3 h-3" /> Discussion Room</span>
      </div>
    </div>
  )
}