'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, Wifi, WifiOff, ArrowLeft, Loader2, ShieldCheck, Video, VideoOff,
  ThumbsDown, X, Camera, Mic, MicOff,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useSSE } from '@/hooks/useSSE'
import { RoomCall, RoomMember } from '@/lib/room-call'

interface RoomInfo {
  id: string; name: string; description: string | null
  maxCapacity: number; present: number; isFull: boolean
}

interface MeInfo {
  userId: string; displayName: string; color: string; gender?: string
  onStage: boolean
}

interface VStateMember extends RoomMember {
  removalVotes?: string[]
}

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
  const userIdRef = useRef<string>('anon')
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const callRef = useRef<RoomCall | null>(null)

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
        setMembers(data.members || [])
        if (data.room) setActive(prev => prev ? { ...prev, present: data.room.present, maxCapacity: data.room.maxCapacity } : prev)
        const sworn = (data.members || []).find((m: any) => m.userId === userIdRef.current)
        if (sworn) setMe(prev => prev ? { ...prev, userId: sworn.userId, displayName: sworn.displayName, color: sworn.color, onStage: sworn.onStage } : prev)
        callRef.current?.setPresence((data.members || []).filter((m: any) => m.userId !== userIdRef.current))
      } else if (event === 'signal') {
        callRef.current?.onSignal(data.from, data.to, data.data)
      } else if (event === 'user-removed') {
        if (data.userId === userIdRef.current) {
          setRemoved(r => r.includes('me') ? r : [...r, 'me'])
          callRef.current?.setSpeaker(false)
        }
      }
    }, []),
  })

  useEffect(() => {
    if (!active) return
    const call = new RoomCall({
      userId: userIdRef.current,
      roomId: active.id,
      kind: 'video',
      enabled: true,
      getMyIsSpeaker: () => me?.onStage !== false,
      getPeerIsSpeaker: () => true,
      sendSignal: (to, data) => {
        api.realtimePublish({ action: 'library-signal', roomId: active.id, to, data }).catch(() => {})
      },
      onStreamAdded: (userId, stream) => {
        setRemoteStreams(prev => { const next = new Map(prev); next.set(userId, stream); return next })
      },
      onStreamRemoved: (userId) => {
        setRemoteStreams(prev => { const next = new Map(prev); next.delete(userId); return next })
      },
      onLocalMedia: (stream) => { setLocalStream(stream) },
    })
    callRef.current = call
    call.start()
    call.ensureMedia()
    return () => { call.dispose(); callRef.current = null; setLocalStream(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id])

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      api.realtimePublish({ action: 'library-heartbeat', roomId: active.id }).catch(() => {})
    }, 25000)
    return () => clearInterval(t)
  }, [active?.id])

  const join = async (room: RoomInfo) => {
    setActionBusy(true)
    try {
      const data = await api.studentVirtualLibraryJoin(room.id)
      const m = data.member
      if (m) setMe({ userId: m.userId, displayName: m.displayName, color: m.color, gender: m.gender, onStage: true })
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
    setActive(null); setMe(null); setMembers([]); setRemoteStreams(new Map())
    setCurrentRoom(null); setRemoved([])
    videoRefs.current.forEach(el => { el.srcObject = null })
    videoRefs.current.clear()
    fetchRooms()
  }

  const toggleMic = () => {
    const next = !micOn; setMicOn(next)
    localStream?.getAudioTracks().forEach(t => { t.enabled = next; void t })
  }
  const toggleCam = () => {
    const next = !camOn; setCamOn(next)
    localStream?.getVideoTracks().forEach(t => { t.enabled = next; void t })
  }

  const vote = async (target: string, remove: boolean) => {
    if (!active) return
    setActionBusy(true)
    try { await api.realtimePublish({ action: 'library-vote', roomId: active.id, target, vote: remove }) }
    catch (err: any) { alert(err?.message || 'Vote failed') }
    finally { setActionBusy(false) }
  }

  // ── List view ───────────────────────────────────────────────────
  if (!active && !loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Virtual Library</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Video study rooms. Cameras on, but a 2/3 majority of peers can vote someone off.</p>
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
            <Button size="sm" onClick={() => join(currentRoom)} className="bg-blue-600 hover:bg-blue-700">
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
                    <Button size="sm" onClick={() => join(r)} disabled={full || actionBusy} className="bg-blue-600 hover:bg-blue-700 text-xs">
                      {full ? 'Room Full' : 'Join Video'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Call view ───────────────────────────────────────────────────
  const activeCount = members.length
  const needed = Math.max(2, Math.ceil((2 / 3) * activeCount))
  const others = members.filter(m => m.userId !== userIdRef.current)
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
            <button onClick={toggleMic} className={`p-2 rounded-lg transition-colors ${micOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-500'}`} title={micOn ? 'Mute mic' : 'Unmute mic'}>
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <Button size="sm" variant="secondary" onClick={leaveRoom} className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">Leave</Button>
          </div>
        </div>
      </div>

      {/* Removed state */}
      {removedMe && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 p-5 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">You were removed from this room</p>
          <p className="text-xs text-rose-500 dark:text-rose-400 mb-3">A 2/3 majority of participants voted to remove you. Your camera and mic are off.</p>
          <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 dark:border-rose-900" onClick={leaveRoom}>Leave Room</Button>
        </div>
      )}

      {!removedMe && (
        <>
          {/* Video grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {/* Local */}
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 aspect-video">
              <video ref={localVideoRef} muted autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" onLoadedMetadata={() => { if (localVideoRef.current) localVideoRef.current.play?.() }} />
              {!camOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 bg-slate-900">
                  <Camera className="w-7 h-7 mb-1.5" />
                  <span className="text-[10px]">{micOn ? 'Mic on' : 'Mic off'} · Camera off</span>
                </div>
              )}
              {localStream && (
                <div className="absolute left-2 top-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium backdrop-blur flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {me?.displayName || 'You'} (you)
                  </span>
                </div>
              )}
            </div>

            {/* Remote */}
            {others.map(m => {
              const myVote = m.removalVotes?.includes(userIdRef.current) || false
              return (
                <div key={m.userId} className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 aspect-video">
                  <video
                    ref={(el) => { if (el) { videoRefs.current.set(m.userId, el); const stream = remoteStreams.get(m.userId); if (el.srcObject !== stream && stream) el.srcObject = stream } }}
                    autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"
                    onLoadedMetadata={(e) => { try { (e.currentTarget as HTMLVideoElement).play?.() } catch { /* ignore */ } }}
                  />
                  {!remoteStreams.has(m.userId) && (
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
                  {/* Vote to remove */}
                  <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
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

          {/* Members strip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mr-1">{activeCount} in room</span>
            {members.map(m => (
              <span key={m.userId} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] text-slate-600 dark:text-slate-300" style={{ borderColor: m.color + '55', color: m.color }}>
                {m.displayName}{m.userId === userIdRef.current ? ' (you)' : ''}
              </span>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button onClick={toggleMic} className={`p-2.5 rounded-full transition-colors ${micOn ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300' : 'bg-red-500 text-white hover:bg-red-600'}`} title={micOn ? 'Mute mic' : 'Unmute mic'}>
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button onClick={toggleCam} className={`p-2.5 rounded-full transition-colors ${camOn ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300' : 'bg-red-500 text-white hover:bg-red-600'}`} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
              {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
            {isConnected ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
            {isConnected ? 'Live · Peer-to-peer video via WebRTC' : 'Connecting to the room…'}
            <span className="ml-auto flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {needed} of {activeCount} votes needed to remove a participant</span>
          </div>
        </>
      )}
    </div>
  )
}