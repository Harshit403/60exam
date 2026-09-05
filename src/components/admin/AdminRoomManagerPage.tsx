'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Pencil, Trash2, Users, Mic, Video, Loader2, ShieldBan, ShieldCheck,
  UserMinus, Expand, ChevronsUp, AlertCircle, Activity, Clock, Globe, ArrowDownRight, ArrowUpRight,
  History, X,
} from 'lucide-react'
import { api } from '@/lib/api-client'

interface Room {
  id: string; name: string; description: string | null
  maxCapacity: number; isActive: boolean; present: number
  members: {
    id: string; studentId: string; studentName: string; studentEmail: string
    displayName: string; color: string; role?: string; onStage?: boolean
    joinedAt: string; ipAddress?: string | null; bandwidthMb?: number | null
  }[]
}

interface ActivityLog {
  id: string
  roomId: string
  roomName: string
  studentName: string | null
  studentEmail: string | null
  displayName: string
  color: string
  action: 'join' | 'leave'
  ipAddress: string | null
  bandwidthMb: number | null
  createdAt: string
}

interface Visit {
  studentId: string
  studentName: string | null
  studentEmail: string | null
  displayName: string
  color: string
  joinedAt: string
  exitedAt: string | null
  bandwidthMb: number | null
}

interface Blocker { id: string; studentId: string; studentName: string; studentEmail: string; reason: string | null; blockedAt: string }

export function AdminRoomManagerPage({ kind }: { kind: 'discussion' | 'library' }) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [blocked, setBlocked] = useState<Blocker[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [historyRoom, setHistoryRoom] = useState<Room | null>(null)
  const [form, setForm] = useState({ name: '', description: '', maxCapacity: 10, isActive: true })
  const [blockReason, setBlockReason] = useState('')
  const [error, setError] = useState('')

  const isVideo = kind === 'library'
  const listApi = isVideo ? api.adminVirtualLibraries : api.adminDiscussionRooms

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [r, b, a] = await Promise.all([
        listApi(),
        api.adminBlockedUsers(),
        api.adminRoomActivity(kind, { limit: 500 }).catch(() => ({ logs: [] as ActivityLog[] })),
      ])
      setRooms(r.rooms || [])
      setBlocked(b.blockedUsers || [])
      setActivity(a.logs || [])
    } catch (e: any) { setError(e?.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [listApi, kind])

  useEffect(() => { refresh() }, [refresh])

  const activityByRoom = useMemo(() => {
    const map: Record<string, ActivityLog[]> = {}
    for (const log of activity) {
      if (!map[log.roomId]) map[log.roomId] = []
      map[log.roomId].push(log)
    }
    return map
  }, [activity])

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = Date.now()
    const diffMin = Math.floor((now - d.getTime()) / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const formatBandwidth = (mb: number | null | undefined) => {
    if (!mb || mb <= 0) return '—'
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
    return `${mb.toFixed(2)} MB`
  }

  // Pair the flat join/leave events into per-visit rows (join -> leave). A
  // visit with no matching leave yet means the user is still present.
  const buildVisits = useCallback((logs: ActivityLog[], live: Room['members']) => {
    const byStudent = new Map<string, ActivityLog[]>()
    for (const log of logs) {
      if (!log.studentId) continue
      if (!byStudent.has(log.studentId)) byStudent.set(log.studentId, [])
      byStudent.get(log.studentId)!.push(log)
    }
    const liveByStudent = new Map(live.map(m => [m.studentId, m]))
    const visits: Visit[] = []
    for (const [studentId, list] of byStudent) {
      const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      let openJoin: ActivityLog | null = null
      for (const log of sorted) {
        if (log.action === 'join') {
          openJoin = log
        } else if (log.action === 'leave' && openJoin) {
          visits.push({
            studentId,
            studentName: openJoin.studentName,
            studentEmail: openJoin.studentEmail,
            displayName: openJoin.displayName,
            color: openJoin.color,
            joinedAt: openJoin.createdAt,
            exitedAt: log.createdAt,
            bandwidthMb: log.bandwidthMb,
          })
          openJoin = null
        }
      }
      if (openJoin) {
        const live = liveByStudent.get(studentId)
        visits.push({
          studentId,
          studentName: openJoin.studentName,
          studentEmail: openJoin.studentEmail,
          displayName: openJoin.displayName,
          color: openJoin.color,
          joinedAt: openJoin.createdAt,
          exitedAt: null,
          bandwidthMb: live?.bandwidthMb ?? openJoin.bandwidthMb,
        })
      }
    }
    visits.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    return visits
  }, [])

  const historyVisits = useMemo(
    () => historyRoom ? buildVisits(activityByRoom[historyRoom.id] || [], historyRoom.members) : [],
    [historyRoom, activityByRoom, buildVisits],
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', maxCapacity: 10, isActive: true })
    setDialogOpen(true)
  }
  const openEdit = (room: Room) => {
    setEditing(room)
    setForm({ name: room.name, description: room.description || '', maxCapacity: room.maxCapacity, isActive: room.isActive })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) return setError('Room name is required')
    setBusy(true); setError('')
    try {
      if (editing) {
        await (isVideo ? api.adminUpdateVirtualLibrary : api.adminUpdateDiscussionRoom)(editing.id, form)
      } else {
        await (isVideo ? api.adminCreateVirtualLibrary : api.adminCreateDiscussionRoom)(form)
      }
      setDialogOpen(false)
      refresh()
    } catch (e: any) { setError(e?.message || 'Save failed') }
    finally { setBusy(false) }
  }

  const removeRoom = async (room: Room) => {
    if (!window.confirm(`Delete room "${room.name}"? This removes all members.`)) return
    setBusy(true)
    try {
      await (isVideo ? api.adminDeleteVirtualLibrary : api.adminDeleteDiscussionRoom)(room.id)
      refresh()
    } catch (e: any) { alert(e?.message || 'Delete failed') }
    finally { setBusy(false) }
  }

  const kick = async (room: Room, memberId: string) => {
    if (!window.confirm('Kick this member from the room?')) return
    setBusy(true)
    try {
      await (isVideo ? api.adminKickVirtualMember : api.adminKickDiscussionMember)(room.id, memberId)
      refresh()
    } catch (e: any) { alert(e?.message || 'Kick failed') }
    finally { setBusy(false) }
  }

  const block = async (studentId: string, name: string) => {
    const reason = prompt(`Block "${name}" from all discussion & video rooms. Reason (optional)?`, '') ?? undefined
    if (reason === undefined) return
    setBusy(true)
    try {
      await api.adminBlockFromRooms(studentId, reason || undefined)
      setBlockReason('')
      refresh()
    } catch (e: any) { alert(e?.message || 'Block failed') }
    finally { setBusy(false) }
  }

  const unblock = async (studentId: string) => {
    setBusy(true)
    try {
      await api.adminUnblockFromRooms(studentId)
      refresh()
    } catch (e: any) { alert(e?.message || 'Unblock failed') }
    finally { setBusy(false) }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${isVideo ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-rose-500 to-pink-600'}`}>
            {isVideo ? <Video className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h2 className="text-lg font-bold">{isVideo ? 'Virtual Libraries' : 'Discussion Rooms'}</h2>
            <p className="text-xs text-muted-foreground">Create, edit & moderate {isVideo ? 'video' : 'audio'} meeting rooms</p>
          </div>
        </div>
        <Button onClick={openCreate} className={isVideo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}>
          <Plus className="w-4 h-4 mr-1" /> New Room
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No rooms yet</p>
          <p className="text-xs">Create your first {isVideo ? 'video' : 'audio'} room above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => (
            <div key={room.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${room.isActive ? (isVideo ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400') : 'bg-slate-200 text-slate-400'}`}>
                  {isVideo ? <Video className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{room.name}</p>
                    {!room.isActive && <Badge variant="secondary" className="text-[9px]">Archived</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{room.description || 'No description'}</p>
                </div>
                <Badge variant="outline" className="shrink-0"><Users className="w-3 h-3 mr-1" /> {room.present}/{room.maxCapacity}</Badge>
                <button onClick={() => toggleExpand(room.id)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
                  {expanded.has(room.id) ? <ChevronsUp className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                </button>
                <Button size="sm" variant="outline" onClick={() => openEdit(room)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => removeRoom(room)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>

              {expanded.has(room.id) && (
                <div className="border-t px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">Live members ({room.members.length})</p>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] text-indigo-600 dark:text-indigo-400" onClick={() => setHistoryRoom(room)}>
                      <History className="w-3 h-3 mr-1" /> Room History
                    </Button>
                  </div>
                  {room.members.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No one in this room right now.</p>
                  ) : (
                    <div className="space-y-2">
                      {room.members.map(m => (
                        <div key={m.id} className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: m.color + '22', color: m.color }}>
                            {m.displayName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{m.studentName} <span className="text-xs text-muted-foreground">({m.displayName})</span></p>
                              {m.role && (
                                <Badge variant="secondary" className="text-[8px] h-3.5 capitalize">
                                  {m.role === 'moderator' ? <><ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-amber-500" />Mod</> : m.role}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{m.studentEmail}</p>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => kick(room, m.id)} disabled={busy}>
                            <UserMinus className="w-3 h-3 mr-1" /> Kick
                          </Button>
                          <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => block(m.studentId, m.studentName)} disabled={busy}>
                            <ShieldBan className="w-3 h-3 mr-1" /> Block
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(activityByRoom[room.id] || []).length > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground">Join / leave history ({activityByRoom[room.id].length})</p>
                      </div>
                      <div className="space-y-1.5">
                        {activityByRoom[room.id].map(log => (
                          <div key={log.id} className="flex items-center gap-3 rounded-lg border bg-background/60 px-2.5 py-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: log.color + '22', color: log.color }}>
                              {log.displayName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium truncate">{log.displayName}</span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {log.studentName || 'Unknown'} {log.studentEmail ? `· ${log.studentEmail}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {log.ipAddress && (
                                  <span className="inline-flex items-center gap-1 font-mono">
                                    <Globe className="w-2.5 h-2.5" />{log.ipAddress}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />{formatDateTime(log.createdAt)}
                                </span>
                              </div>
                            </div>
                            {log.action === 'join' ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 text-[10px]">
                                <ArrowDownRight className="w-3 h-3 mr-1" /> Joined
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border-0 text-[10px]">
                                <ArrowUpRight className="w-3 h-3 mr-1" /> Left
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Blocked users */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ShieldBan className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-semibold">Blocked from rooms</h3>
        </div>
        {blocked.length === 0 ? (
          <p className="text-xs text-muted-foreground">No users blocked.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map(b => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
                <ShieldBan className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.studentName} <span className="text-xs text-muted-foreground">· {b.studentEmail}</span></p>
                  {b.reason && <p className="text-[11px] text-muted-foreground truncate">Reason: {b.reason}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => unblock(b.studentId)} disabled={busy}>
                  <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialogOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border bg-background p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold">{editing ? 'Edit Room' : 'Create Room'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Discussion" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this room about?" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Max capacity</label>
                <Input type="number" min={1} max={50} value={form.maxCapacity} onChange={e => setForm(f => ({ ...f, maxCapacity: Number(e.target.value) || 10 }))} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-emerald-500" />
                Active (visible to students)
              </label>
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Save' : 'Create')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Room history modal */}
      {historyRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistoryRoom(null)} />
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border bg-background shadow-xl flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isVideo ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                  {isVideo ? <Video className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{historyRoom.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    <History className="w-3 h-3 inline mr-1 align-[-2px]" />
                    {historyVisits.length} visit{historyVisits.length === 1 ? '' : 's'} recorded
                  </p>
                </div>
              </div>
              <button onClick={() => setHistoryRoom(null)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {historyVisits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No activity recorded yet</p>
                  <p className="text-xs">Join/leave history starts from when this feature was deployed.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-semibold">Student</th>
                      <th className="py-2 pr-3 font-semibold">Anonymous name</th>
                      <th className="py-2 pr-3 font-semibold">Joined</th>
                      <th className="py-2 pr-3 font-semibold">Exited</th>
                      <th className="py-2 pr-3 font-semibold">Duration</th>
                      <th className="py-2 font-semibold text-right">Bandwidth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyVisits.map((v, i) => {
                      const durMs = (v.exitedAt ? new Date(v.exitedAt).getTime() : Date.now()) - new Date(v.joinedAt).getTime()
                      const durH = Math.floor(durMs / 3600000)
                      const durM = Math.floor((durMs % 3600000) / 60000)
                      return (
                        <tr key={i} className="border-b border-muted/60 align-top">
                          <td className="py-2.5 pr-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{v.studentName || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{v.studentEmail}</p>
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: v.color + '22', color: v.color }}>
                                {v.displayName.charAt(0)}
                              </span>
                              <span>{v.displayName}</span>
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDateTime(v.joinedAt)}</td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {v.exitedAt ? (
                              <span className="text-muted-foreground">{formatDateTime(v.exitedAt)}</span>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 text-[10px]">
                                <span className="relative flex h-1.5 w-1.5 mr-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                </span>
                                Present
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                            {durH > 0 ? `${durH}h ${durM}m` : `${durM}m`}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap font-mono text-[11px]">
                            <span className={v.bandwidthMb && v.bandwidthMb > 0 ? 'text-sky-600 dark:text-sky-400 font-medium' : 'text-muted-foreground'}>
                              {formatBandwidth(v.bandwidthMb)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}