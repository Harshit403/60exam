'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mic, MicOff, Users, Wifi, WifiOff, ArrowLeft, Loader2, ShieldCheck,
  UserX, Check, X, Clock, Volume2, MessageCircle,
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
  role: string; onStage: boolean; stageRequested?: boolean
}

function avatarColorStyle(color: string) {
  return { backgroundColor: color + '22', color, borderColor: color + '44' }
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
  const userIdRef = useRef<string>('anon')
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map)
  const callRef = useRef<RoomCall | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      const data = await api.studentDiscussionRooms()
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

  const setActiveAudioStreams = useCallback((map: Map<string, MediaStream>) => {
    audioRefs.current.forEach((el, id) => {
      if (map.has(id)) {
        if (el.srcObject !== map.get(id)) el.srcObject = map.get(id)
      }
    })
  }, [])

  const { isConnected } = useSSE({
    channel: active ? `droom:${active.id}` : 'none',
    enabled: !!active,
    onEvent: useCallback((event: string, data: any) => {
      if (event === 'droom-state') {
        setMembers(data.members || [])
        if (data.room) setActive(prev => prev ? { ...prev, present: data.room.present, maxCapacity: data.room.maxCapacity } : prev)
        const sworn = (data.members || []).find((m: any) => m.userId === userIdRef.current)
        setMe(prev => sworn ? {
          ...prev,
          userId: sworn.userId, displayName: sworn.displayName, color: sworn.color,
          gender: sworn.gender, role: sworn.role, onStage: sworn.onStage, stageRequested: sworn.stageRequested,
        } : prev)
        callRef.current?.setPresence((data.members || []).filter((m: any) => m.userId !== userIdRef.current))
      } else if (event === 'signal') {
        callRef.current?.onSignal(data.from, data.to, data.data)
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
      onLocalMedia: () => { /* no-op for audio */ },
    })
    callRef.current = call
    call.start()
    return () => { call.dispose(); callRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id])

  // Heartbeat while in call
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      api.realtimePublish({ action: 'discussion-heartbeat', roomId: active.id }).catch(() => {})
    }, 25000)
    return () => clearInterval(t)
  }, [active?.id])

  // Keep speaker state in sync with my stage status
  useEffect(() => {
    callRef.current?.setSpeaker(!!me?.onStage)
  }, [me?.onStage])

  const join = async (room: RoomInfo) => {
    setActionBusy(true)
    try {
      const data = await api.studentDiscussionRoomJoin(room.id)
      const m = data.member
      if (m) setMe({ userId: m.userId, displayName: m.displayName, color: m.color, gender: m.gender, role: m.role, onStage: m.onStage, stageRequested: false })
      setRemoteStreams(new Map())
      setActive(room)
      setCurrentRoom(room)
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isFull: true } : r))
    } catch (err: any) {
      alert(err?.message || 'Could not join room')
    } finally { setActionBusy(false) }
  }

  const leaveRoom = async () => {
    if (!active) return
    try { await api.studentDiscussionRoomLeave(active.id) } catch { /* ignore */ }
    setActive(null); setMe(null); setMembers([]); setRemoteStreams(new Map())
    setCurrentRoom(null)
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
            <Button size="sm" onClick={() => join(currentRoom)} className="bg-orange-600 hover:bg-orange-700">
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
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{r.description || 'Voice discussion room'}</p>
                      </div>
                    </div>
                    <Badge variant={full ? 'secondary' : 'outline'} className={`shrink-0 text-[10px] ${full ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      <Users className="w-3 h-3 mr-1" /> {r.present}/{r.maxCapacity}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      {r.isCurrentUserMember ? (
                        <Button size="sm" onClick={() => join(r)} className="text-xs">Rejoin Voice</Button>
                      ) : (
                        <Button size="sm" onClick={() => join(r)} disabled={full || actionBusy} className="bg-rose-600 hover:bg-rose-700 text-xs">
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

      {/* Me card */}
      {me && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 ring-2" style={avatarColorStyle(me.color)}>
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
                  ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Mic className="w-3 h-3" /> Speaking · your voice is live</span>
                  : 'You are muted · listeners only'}
              </p>
              {me.onStage && me.role === 'stage' && stageCountdown(members.find(m => m.userId === me.userId)?.onStageSince) && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Auto-promote to moderator in {stageCountdown(members.find(m => m.userId === me.userId)?.onStageSince)}
                </p>
              )}
            </div>
          </div>
          {!me.onStage && (
            <Button size="sm" onClick={() => stageAction(me.userId, 'request')} disabled={actionBusy || me.stageRequested} className="shrink-0">
              {me.stageRequested ? 'Request Pending…' : 'Request to Go on Stage'}
            </Button>
          )}
        </div>
      )}

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
              return (
                <div key={m.userId} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col items-center gap-2 shadow-sm text-center">
                  <div className="relative">
                    <Avatar className="h-14 w-14 ring-2" style={avatarColorStyle(m.color)}>
                      <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: m.color + '22', color: m.color }}>
                        {m.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-slate-900">
                      <Mic className="w-2.5 h-2.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[90px]">{m.displayName}{isMe ? ' (you)' : ''}</p>
                    <Badge variant="secondary" className="text-[8px] h-3.5 mt-0.5 capitalize">
                      {m.role === 'moderator' ? <><ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-amber-500" />Moderator</> : 'On Stage'}
                    </Badge>
                  </div>
                  {!isMe && m.role !== 'moderator' && me?.role === 'moderator' && (
                    <Button size="sm" variant="outline" className="text-[10px] h-7 text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900" onClick={() => stageAction(m.userId, 'remove')} disabled={actionBusy}>
                      <UserX className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  )}
                  <audio
                    ref={(el) => { if (el) { audioRefs.current.set(m.userId, el); const stream = remoteStreams.get(m.userId); if (el.srcObject !== stream && stream) el.srcObject = stream } }}
                    autoPlay
                    playsInline
                    hidden
                    onError={() => {}}
                  />
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
              return (
                <div key={m.userId} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8" style={avatarColorStyle(m.color)}>
                      <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: m.color + '22', color: m.color }}>{m.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{m.displayName}</p>
                      {requested && <p className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><Mic className="w-2.5 h-2.5" /> Wants to speak</p>}
                    </div>
                  </div>
                  {requested && me?.role === 'moderator' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => stageAction(m.userId, 'approve')} disabled={actionBusy} className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 hover:bg-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => stageAction(m.userId, 'deny')} disabled={actionBusy} className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 hover:bg-rose-200">
                        <X className="w-3.5 h-3.5" />
                      </button>
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
        {isConnected ? 'Live · Peer-to-peer audio via WebRTC' : 'Connecting to the room…'}
        <span className="ml-auto flex items-center gap-1"><Volume2 className="w-3 h-3" /> Discussion Room</span>
      </div>
    </div>
  )
}