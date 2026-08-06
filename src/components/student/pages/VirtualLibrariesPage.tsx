'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, Wifi, WifiOff, ArrowLeft, ShieldCheck, Video, VideoOff,
  ThumbsDown, X, Camera, Mic, MicOff, Check, UserPlus, UserX, Clock,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSSE } from '@/hooks/useSSE'
import { useRoomActivity } from '@/hooks/useRoomActivity'
import { RoomCall, RoomMember } from '@/lib/room-call'
import { GenderJoinModal } from '@/components/student/GenderJoinModal'
import { getSavedAnonymousIdentity, saveAnonymousIdentity, getLastSavedIdentity } from '@/lib/identity-storage'

interface RoomInfo {
  id: string; name: string; description: string | null
  maxCapacity: number; present: number; isFull: boolean
}

interface MeInfo {
  userId: string; displayName: string; color: string; gender?: string
  role: string; onStage: boolean; stageRequested?: boolean; stageInvited?: boolean
}

interface VStateMember extends RoomMember {
  removalVotes?: string[]
  videoOff?: boolean
}

function avatarColorStyle(color: string) {
  return { backgroundColor: color + '22', color, borderColor: color + '44' }
}

// Time until an on-stage, non-moderator member is auto-promoted to moderator
// (mirrors Discussion Rooms so both rooms behave the same way).
const stageCountdown = (onStageSince?: number | null) => {
  if (!onStageSince) return null
  const left = (onStageSince + 5 * 60 * 1000) - Date.now()
  if (left <= 0) return null
  const m = Math.floor(left / 60000)
  const s = Math.floor((left % 60000) / 1000)
  return `${m}m ${s}s`
}

// RMS loudness of an analyser node, mapped to 0..1. Used to decide locally
// whether we're speaking so the sender can raise/lower video quality.
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

// Hysteresis thresholds so a borderline mic doesn't flicker the bitrate.
const SPEAKING_ON = 0.12
const SPEAKING_OFF = 0.06

export function VirtualLibrariesPage() {
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<RoomInfo | null>(null)
  const [me, setMe] = useState<MeInfo | null>(null)
  const [members, setMembers] = useState<VStateMember[]>([])
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [removed, setRemoved] = useState<string[]>([])
  const [inactiveRemoved, setInactiveRemoved] = useState(false)
  const [qualityLabel, setQualityLabel] = useState('144p')
  const [genderPickRoom, setGenderPickRoom] = useState<RoomInfo | null>(null)
  const userIdRef = useRef<string>('anon')
  const wasMemberRef = useRef(false)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const callRef = useRef<RoomCall | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const localAnalyserRef = useRef<AnalyserNode | null>(null)
  const speakingRef = useRef(false)

  // Only send heartbeats while genuinely present: recent interaction or
  // actively in the call (visible tab + local media running).
  const isActive = useRoomActivity(useCallback(() => {
    return document.visibilityState === 'visible' && !!localStream
  }, [localStream]))

  const fetchRooms = useCallback(async () => {
    try {
      const data = await api.studentVirtualLibraries()
      setRooms(data.rooms || [])
      setCurrentRoom(data.currentRoom || null)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchRooms() }, [fetchRooms])

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userIdRef.current = payload.id || 'anon'
      }
    } catch { /* ignore */ }
  }, [])

  const { isConnected } = useSSE({
    channel: active ? `vroom:${active.id}` : 'none',
    enabled: !!active,
    onEvent: useCallback((event: string, data: any) => {
      if (event === 'vroom-state') {
        const present = (data.members || [])
        setMembers(present)
        if (data.room) setActive(prev => prev ? { ...prev, present: data.room.present, maxCapacity: data.room.maxCapacity } : prev)
        const sworn = (present as any[]).find((m: any) => m.userId === userIdRef.current)
        if (wasMemberRef.current && !sworn) setInactiveRemoved(true)
        if (sworn) wasMemberRef.current = true
        if (sworn) setMe(prev => prev ? {
          ...prev,
          userId: sworn.userId, displayName: sworn.displayName, color: sworn.color, gender: sworn.gender,
          role: sworn.role, onStage: sworn.onStage, stageRequested: sworn.stageRequested, stageInvited: sworn.stageInvited,
        } : prev)
        callRef.current?.setPresence(present.filter((m: any) => m.userId !== userIdRef.current))
      } else if (event === 'signal') {
        callRef.current?.onSignal(data.from, data.to, data.data, data.id)
      } else if (event === 'user-removed') {
        if (data.userId === userIdRef.current) {
          setRemoved(r => r.includes('me') ? r : [...r, 'me'])
          callRef.current?.setSpeaker(false)
        }
      }
    }, []),
  })

  // Analyse the local mic so we can tell when this user is actually speaking
  // and nudge the sender's video quality accordingly (144p while silent,
  // climbing up to 480p while talking). Kept off the destination to avoid echo.
  const setupLocalAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (!audioCtxRef.current) {
        const Ctor = (window.AudioContext || (window as any).webkitAudioContext)
        audioCtxRef.current = new Ctor()
      }
      audioCtxRef.current.resume?.().catch(() => {})
      if (localAnalyserRef.current) {
        try { localAnalyserRef.current.disconnect() } catch { /* ignore */ }
        localAnalyserRef.current = null
      }
      const source = audioCtxRef.current.createMediaStreamSource(stream)
      const analyser = audioCtxRef.current.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      localAnalyserRef.current = analyser
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!active) return
    const call = new RoomCall({
      userId: userIdRef.current,
      roomId: active.id,
      kind: 'video',
      enabled: true,
      getMyIsSpeaker: () => me?.onStage === true,
      getPeerIsSpeaker: (m) => m.onStage === true,
      sendSignal: (to, data) => {
        api.realtimePublish({ action: 'library-signal', roomId: active.id, to, data }).catch(() => {})
      },
      onStreamAdded: (userId, stream) => {
        setRemoteStreams(prev => { const next = new Map(prev); next.set(userId, stream); return next })
      },
      onStreamRemoved: (userId) => {
        setRemoteStreams(prev => { const next = new Map(prev); next.delete(userId); return next })
      },
      onLocalMedia: (stream) => { setLocalStream(stream); setupLocalAnalyser(stream) },
      onQualityChange: (label) => setQualityLabel(label),
    })
    callRef.current = call
    call.start()
    // Mic/camera on by default — push the current UI state so a fresh call
    // always starts un-muted (also resets any stale camera-off/mic-off flags
    // from a previous visit to this room).
    call.setMicEnabled(micOn)
    call.setCamEnabled(camOn)
    api.realtimePublish({ action: 'library-state', roomId: active.id, videoOff: !camOn, micOff: !micOn }).catch(() => {})
    // Media is acquired lazily by reconcile() once this user is on stage
    return () => {
      call.dispose(); callRef.current = null; setLocalStream(null); setQualityLabel('144p')
      speakingRef.current = false
      if (localAnalyserRef.current) { try { localAnalyserRef.current.disconnect() } catch { /* ignore */ } localAnalyserRef.current = null }
      try { audioCtxRef.current?.close?.() } catch { /* ignore */ }
      audioCtxRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, setupLocalAnalyser])

  // Detect speech from the local mic with hysteresis and drive sender quality.
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      const lvl = localAnalyserRef.current ? computeLevel(localAnalyserRef.current) : 0
      const speaking = speakingRef.current ? lvl >= SPEAKING_OFF : lvl >= SPEAKING_ON
      if (speaking !== speakingRef.current) {
        speakingRef.current = speaking
        callRef.current?.setSpeaking(speaking)
      }
    }, 250)
    return () => { clearInterval(t); callRef.current?.setSpeaking(false) }
  }, [active?.id])

  // Browsers suspend a fresh AudioContext until a user gesture; keep resuming
  // so the mic analyser actually samples audio and speech is detected.
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => { audioCtxRef.current?.resume?.().catch(() => {}) }, 1000)
    return () => clearInterval(t)
  }, [active?.id])

  // Keep speaker (broadcast) state in sync with my stage status
  useEffect(() => {
    callRef.current?.setSpeaker(!!me?.onStage)
  }, [me?.onStage])

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      if (inactiveRemoved || !isActive()) return
      api.realtimePublish({ action: 'library-heartbeat', roomId: active.id }).catch(() => {})
    }, 25000)
    return () => clearInterval(t)
  }, [active?.id, isActive, inactiveRemoved])

  const join = async (room: RoomInfo, gender?: 'male' | 'female') => {
    setActionBusy(true)
    try {
      const saved = gender ? getSavedAnonymousIdentity(gender) : null
      const data = await api.studentVirtualLibraryJoin(room.id, gender, saved || undefined)
      const m = data.member
      if (m) {
        if (m.gender === 'male' || m.gender === 'female') saveAnonymousIdentity(m.gender, { name: m.displayName, color: m.color })
        setMe({ userId: m.userId, displayName: m.displayName, color: m.color, gender: m.gender, role: m.role, onStage: m.onStage, stageRequested: false, stageInvited: false })
      }
      wasMemberRef.current = true
      setInactiveRemoved(false)
      setRemoteStreams(new Map()); setRemoved([])
      setActive(room); setCurrentRoom(room)
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isFull: true } : r))
    } catch (err: any) {
      alert(err?.message || 'Could not join room')
    } finally { setActionBusy(false) }
  }

  // Attach streams to the actual <video> elements once they arrive. Setting
  // srcObject in the ref callback only runs at mount (before any stream exists),
  // which is why remote tiles stayed stuck on "Connecting…".
  useEffect(() => {
    videoRefs.current.forEach((el, userId) => {
      const stream = remoteStreams.get(userId)
      if (el && stream && el.srcObject !== stream) {
        el.srcObject = stream
        el.play?.().catch(() => {})
      }
    })
  }, [remoteStreams])

  useEffect(() => {
    if (localStream && localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play?.().catch(() => {})
    }
  }, [localStream])

  const leaveRoom = async () => {
    if (!active) return
    try { await api.studentVirtualLibraryLeave(active.id) } catch { /* ignore */ }
    wasMemberRef.current = false
    setInactiveRemoved(false)
    setActive(null); setMe(null); setMembers([]); setRemoteStreams(new Map())
    setCurrentRoom(null); setRemoved([])
    videoRefs.current.forEach(el => { el.srcObject = null })
    videoRefs.current.clear()
    fetchRooms()
  }

  const toggleMic = () => {
    const next = !micOn
    setMicOn(next)
    callRef.current?.setMicEnabled(next)
    localStream?.getAudioTracks().forEach(t => { t.enabled = next; void t })
    audioCtxRef.current?.resume?.().catch(() => {})
    // Broadcast the new mic state so every participant sees the muted icon.
    if (active) api.realtimePublish({ action: 'library-state', roomId: active.id, micOff: !next }).catch(() => {})
  }
  const toggleCam = () => {
    const next = !camOn
    setCamOn(next)
    callRef.current?.setCamEnabled(next)
    localStream?.getVideoTracks().forEach(t => { t.enabled = next; void t })
    audioCtxRef.current?.resume?.().catch(() => {})
    // Broadcast the new camera state so every participant sees "Camera off".
    if (active) api.realtimePublish({ action: 'library-state', roomId: active.id, videoOff: !next }).catch(() => {})
  }

  const vote = async (target: string, remove: boolean) => {
    if (!active) return
    setActionBusy(true)
    try { await api.realtimePublish({ action: 'library-vote', roomId: active.id, target, vote: remove }) }
    catch (err: any) { alert(err?.message || 'Vote failed') }
    finally { setActionBusy(false) }
  }

  const stageAction = async (target: string, stageAction: string) => {
    if (!active) return
    setActionBusy(true)
    try { await api.realtimePublish({ action: 'library-stage', roomId: active.id, target, stageAction }) }
    catch (err: any) { alert(err?.message || 'Action failed') }
    finally { setActionBusy(false) }
  }

  // ── List view ───────────────────────────────────────────────────
  if (!active && !loading) {
    return (
      <>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Virtual Library</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Video study rooms. The first joiner becomes the moderator and runs the stage.</p>
          </div>
        </div>

        {currentRoom && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-200 dark:bg-blue-900/40 flex items-center justify-center">
                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{currentRoom.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">You are currently in this video room</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setGenderPickRoom(currentRoom)} className="bg-blue-600 hover:bg-blue-700">
              <Video className="w-4 h-4 mr-1" /> Join Video
            </Button>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">
            <Camera className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No virtual libraries available yet</p>
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
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${full ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'}`}>
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{r.description || 'Video study room'}</p>
                      </div>
                    </div>
                    <Badge variant={full ? 'secondary' : 'outline'} className={`shrink-0 text-[10px] ${full ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      <Users className="w-3 h-3 mr-1" /> {r.present}/{r.maxCapacity}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button size="sm" onClick={() => setGenderPickRoom(r)} disabled={full || actionBusy} className="bg-blue-600 hover:bg-blue-700 text-xs">
                      {full ? 'Room Full' : 'Join Video'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <GenderJoinModal
        open={!!genderPickRoom}
        title="Join Virtual Library"
        subtitle="Select your identity — a random anonymous name will be assigned for this room."
        confirmLabel="Join Video"
        savedIdentity={getLastSavedIdentity()}
        onClose={() => setGenderPickRoom(null)}
        onConfirm={(g) => { const room = genderPickRoom; setGenderPickRoom(null); if (room) join(room, g) }}
      />
      </>
    )
  }

  // ── Call view ───────────────────────────────────────────────────
  const onStage = members.filter(m => m.onStage)
  const stageOthers = onStage.filter(m => m.userId !== userIdRef.current)
  const audience = members.filter(m => !m.onStage && m.userId !== userIdRef.current)
  const activeCount = members.length
  const needed = Math.max(2, Math.ceil((2 / 3) * activeCount))
  const removedMe = removed.includes('me')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 text-white p-3 shadow-sm">
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
                <span>{isConnected ? 'Connected' : 'Connecting...'} · Video Library</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={leaveRoom} className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">Leave</Button>
          </div>
        </div>
      </div>

      {/* Removed state */}
      {(removedMe || inactiveRemoved) && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 p-5 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          {inactiveRemoved ? (
            <>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">You were removed for inactivity</p>
              <p className="text-xs text-rose-500 dark:text-rose-400 mb-3">You were away from this study room for more than 5 minutes.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">You were removed from this room</p>
              <p className="text-xs text-rose-500 dark:text-rose-400 mb-3">A 2/3 majority of participants voted to remove you. Your camera and mic are off.</p>
            </>
          )}
          <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 dark:border-rose-900" onClick={leaveRoom}>Leave Room</Button>
        </div>
      )}

      {!removedMe && !inactiveRemoved && (
        <>
          {/* Me card */}
          {me && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-9 w-9 ring-2" style={avatarColorStyle(me.color)}>
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
                      ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Camera className="w-3 h-3" /> Camera & mic live</span>
                      : me.stageInvited
                        ? <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Check className="w-3 h-3" /> Invited to the stage — accept or decline</span>
                        : me.stageRequested
                          ? 'Request pending · waiting for the moderator'
                          : 'You are in the audience · camera is off'}
                  </p>
                  {me.onStage && me.role === 'stage' && stageCountdown(members.find(m => m.userId === me.userId)?.onStageSince) && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Auto-promote to moderator in {stageCountdown(members.find(m => m.userId === me.userId)?.onStageSince)}
                    </p>
                  )}
                </div>
              </div>
              {me.onStage ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={toggleMic} className={`p-2 rounded-lg transition-colors ${micOn ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700' : 'bg-red-500 text-white hover:bg-red-600'}`} title={micOn ? 'Mute mic' : 'Unmute mic'}>
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button onClick={toggleCam} className={`p-2 rounded-lg transition-colors ${camOn ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700' : 'bg-red-500 text-white hover:bg-red-600'}`} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
                    {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                </div>
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
          )}

          {/* On Stage video grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">On Stage ({onStage.length})</h3>
              {me?.role === 'moderator' && <Badge variant="outline" className="text-[9px] text-amber-600 dark:text-amber-400"><ShieldCheck className="w-3 h-3 mr-1" /> You can manage the stage</Badge>}
            </div>
            {onStage.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-slate-400 dark:text-slate-500">
                <Camera className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No one is on the stage yet. The first person to join becomes the moderator.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {me?.onStage && (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 aspect-video">
                    <video ref={localVideoRef} muted autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" onLoadedMetadata={() => { if (localVideoRef.current) localVideoRef.current.play?.() }} />
                    {!camOn && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 bg-slate-900">
                        <Camera className="w-7 h-7 mb-1.5" />
                        <span className="text-[10px]">{micOn ? 'Mic on' : 'Mic off'} · Camera off</span>
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium backdrop-blur flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {me?.displayName || 'You'} (you)
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-black/60 text-white/90 text-[9px] font-medium backdrop-blur" title="Auto video quality (climbs toward the best the network can sustain)">
                        {qualityLabel}
                      </span>
                    </div>
                  </div>
                )}

                {stageOthers.map(m => {
                  const myVote = m.removalVotes?.includes(userIdRef.current) || false
                  return (
                    <div key={m.userId} className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 aspect-video">
                      <video
                        ref={(el) => { if (el) { videoRefs.current.set(m.userId, el); const stream = remoteStreams.get(m.userId); if (el.srcObject !== stream && stream) el.srcObject = stream } }}
                        autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"
                        onLoadedMetadata={(e) => { try { (e.currentTarget as HTMLVideoElement).play?.() } catch { /* ignore */ } }}
                      />
                      {m.videoOff ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 bg-slate-800">
                          <VideoOff className="w-6 h-6 mb-1.5" />
                          <span className="text-[9px]">Camera off</span>
                        </div>
                      ) : !remoteStreams.has(m.userId) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 bg-slate-800">
                          <Avatar className="h-10 w-10 mb-1.5">
                            <AvatarFallback className="text-sm font-bold" style={{ backgroundColor: m.color + '33', color: '#fff' }}>{m.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-[9px]">Connecting…</span>
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex items-center gap-1 max-w-[70%]">
                        <span className="px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium backdrop-blur truncate flex items-center gap-1" style={{ borderLeft: `3px solid ${m.color}` }}>
                          {m.displayName}
                        </span>
                      </div>
                      {/* Muted mic indicator for everyone else in the room */}
                      {m.micOff && (
                        <div className="absolute left-2 bottom-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/90 text-white text-[9px] font-medium backdrop-blur">
                          <MicOff className="w-3 h-3" /> Muted
                        </div>
                      )}
                      {/* Moderator: remove from stage */}
                      {me?.role === 'moderator' && m.role !== 'moderator' && (
                        <button
                          onClick={() => stageAction(m.userId, 'remove')}
                          title="Remove from stage"
                          disabled={actionBusy}
                          className="absolute right-2 top-2 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-black/60 text-white/80 hover:bg-rose-500 hover:text-white transition-colors">
                          <UserX className="w-3 h-3 inline mr-0.5" /> Remove
                        </button>
                      )}
                      {/* Vote to remove */}
                      <div className="absolute right-2 bottom-2 flex flex-col items-end gap-1">
                        <button
                          onClick={() => vote(m.userId, !myVote)}
                          title={myVote ? 'Undo vote' : 'Vote to remove'}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-colors ${
                            myVote ? 'bg-rose-500 text-white' : 'bg-black/60 text-white/70 hover:bg-rose-500/80 hover:text-white'
                          }`}>
                          <ThumbsDown className="w-3 h-3 inline mr-0.5" />
                          {myVote ? 'Voted' : 'Vote'}
                        </button>
                        {(m.removalVotes?.length || 0) > 0 && (
                          <button onClick={() => vote(m.userId, !myVote)} className="px-1.5 py-0.5 rounded-md bg-black/60 text-white/80 text-[9px]">
                            {(m.removalVotes?.length || 0)}/{needed}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Audience */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Audience ({audience.length})</h3>
            {audience.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">No one in the audience.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {audience.map(m => {
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
                          {requested && <p className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><Video className="w-2.5 h-2.5" /> Wants to go on stage</p>}
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
            <span className="ml-auto flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {needed} of {activeCount} votes needed to remove a participant</span>
          </div>
        </>
      )}
    </div>
  )
}
