'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Pencil, Trash2, Users, Mic, Video, Loader2, ShieldBan, ShieldCheck,
  UserMinus, Expand, ChevronsUp, AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api-client'

interface Room {
  id: string; name: string; description: string | null
  maxCapacity: number; isActive: boolean; present: number
  members: {
    id: string; studentId: string; studentName: string; studentEmail: string
    displayName: string; color: string; role?: string; onStage?: boolean
    joinedAt: string
  }[]
}

interface Blocker { id: string; studentId: string; studentName: string; studentEmail: string; reason: string | null; blockedAt: string }

export function AdminRoomManagerPage({ kind }: { kind: 'discussion' | 'library' }) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [blocked, setBlocked] = useState<Blocker[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ name: '', description: '', maxCapacity: 10, isActive: true })
  const [blockReason, setBlockReason] = useState('')
  const [error, setError] = useState('')

  const isVideo = kind === 'library'
  const listApi = isVideo ? api.adminVirtualLibraries : api.adminDiscussionRooms

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [r, b] = await Promise.all([listApi(), api.adminBlockedUsers()])
      setRooms(r.rooms || [])
      setBlocked(b.blockedUsers || [])
    } catch (e: any) { setError(e?.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [listApi])

  useEffect(() => { refresh() }, [refresh])

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
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Live members ({room.members.length})</p>
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
    </div>
  )
}