'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, Plus, Pencil, Trash2, Shield, ShieldOff, Search, Loader2, UserX, CheckCircle2, XCircle, MessageSquare, Hash, Eye, UserMinus, Ban, Mail, Trash,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
interface Group {
  id: string
  name: string
  description: string | null
  maxCapacity: number
  isActive: boolean
  subjectId: string | null
  subjectName: string | null
  totalMembers: number
  activeMembers: number
  totalMessages: number
  members: { id: string; studentId: string; studentName: string; studentEmail: string; joinedAt: string }[]
  createdAt: string
  updatedAt: string
}

interface Subject { id: string; name: string; courseId: string; course?: { title: string } }

interface BlockedUser {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  studentMobile: string
  courseTitle: string | null
  reason: string | null
  blockedAt: string
}

interface Student { id: string; name: string; email: string; mobile: string; course?: { title: string } }

type TabKey = 'groups' | 'blocked'

// ─── Component ───────────────────────────────────────────────────
export function GroupsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('groups')

  // Groups data
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Meta
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formMaxCapacity, setFormMaxCapacity] = useState('10')
  const [formSubjectId, setFormSubjectId] = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [blockedSearch, setBlockedSearch] = useState('')

  // Block user dialog
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [blockStudentId, setBlockStudentId] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  // View members dialog
  const [viewGroup, setViewGroup] = useState<Group | null>(null)
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null)

  // View messages dialog
  const [viewMessagesGroup, setViewMessagesGroup] = useState<Group | null>(null)
  const [groupMessages, setGroupMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)

  // ─── Fetch Groups ────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const data = await api.adminGroups()
      setGroups(data.groups || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load groups')
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  const fetchSubjects = useCallback(async () => {
    try {
      const data = await api.adminSubjects()
      setSubjects(data.subjects || [])
    } catch (err: any) {
      console.error('Subjects fetch error:', err)
    }
  }, [])

  const fetchBlockedUsers = useCallback(async () => {
    setBlockedLoading(true)
    try {
      const data = await api.adminBlockedUsers()
      setBlockedUsers(data.blockedUsers || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load blocked users')
    } finally {
      setBlockedLoading(false)
    }
  }, [])

  const fetchStudents = useCallback(async (q?: string) => {
    setStudentsLoading(true)
    try {
      const data = await api.adminStudents(q)
      setStudents(data.students || [])
    } catch (err: any) {
      console.error('Students fetch error:', err)
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
    fetchSubjects()
  }, [fetchGroups, fetchSubjects])

  useEffect(() => {
    if (activeTab === 'blocked' && blockedUsers.length === 0) {
      fetchBlockedUsers()
    }
  }, [activeTab, blockedUsers.length, fetchBlockedUsers])

  // ─── Filtered groups ─────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups.filter(
      (g) =>
        (g.name||'').toLowerCase().includes(q) ||
        (g.description||'').toLowerCase().includes(q) ||
        (g.subjectName||'').toLowerCase().includes(q)
    )
  }, [groups, search])

  const filteredBlocked = useMemo(() => {
    if (!blockedSearch.trim()) return blockedUsers
    const q = blockedSearch.toLowerCase()
    return blockedUsers.filter(
      (b) =>
        (b.studentName||'').toLowerCase().includes(q) ||
        (b.studentEmail||'').toLowerCase().includes(q) ||
        (b.reason||'').toLowerCase().includes(q) ||
        (b.courseTitle||'').toLowerCase().includes(q)
    )
  }, [blockedUsers, blockedSearch])

  // Filtered students for block dialog (exclude already blocked)
  const blockedStudentIds = useMemo(() => new Set(blockedUsers.map(b => b.studentId)), [blockedUsers])
  const filteredStudents = useMemo(() => {
    let list = students.filter(s => !blockedStudentIds.has(s.id))
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase()
      list = list.filter(s =>
        (s.name||'').toLowerCase().includes(q) ||
        (s.email||'').toLowerCase().includes(q) ||
        (s.mobile||'').toLowerCase().includes(q)
      )
    }
    return list
  }, [students, studentSearch, blockedStudentIds])

  // ─── Form helpers ────────────────────────────────────────────
  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormMaxCapacity('10')
    setFormSubjectId(''); setEditingId(null); setShowForm(false)
  }

  const openAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (g: Group) => {
    setFormName(g.name); setFormDescription(g.description || '')
    setFormMaxCapacity(String(g.maxCapacity)); setFormSubjectId(g.subjectId || '')
    setEditingId(g.id); setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('Group name is required')
      return
    }
    const capacity = parseInt(formMaxCapacity)
    if (isNaN(capacity) || capacity < 1) {
      toast.error('Capacity must be a positive number')
      return
    }
    setFormLoading(true)
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        maxCapacity: capacity,
        subjectId: formSubjectId || null,
      }
      if (editingId) {
        await api.adminUpdateGroup(editingId, payload)
        toast.success('Group updated successfully')
      } else {
        await api.adminCreateGroup(payload)
        toast.success('Group created successfully')
      }
      resetForm()
      fetchGroups()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save group')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.adminDeleteGroup(deleteTarget.id)
      toast.success('Group deleted successfully')
      setDeleteTarget(null)
      fetchGroups()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete group')
    }
  }

  const handleToggleActive = async (g: Group) => {
    try {
      await api.adminUpdateGroup(g.id, { isActive: !g.isActive })
      toast.success(g.isActive ? 'Group deactivated' : 'Group activated')
      fetchGroups()
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle group status')
    }
  }

  // ─── Block/Unblock helpers ───────────────────────────────────
  const openBlockDialog = async () => {
    setBlockStudentId(''); setBlockReason(''); setStudentSearch('')
    setShowBlockDialog(true)
    fetchStudents()
  }

  const handleBlock = async () => {
    if (!blockStudentId) {
      toast.error('Please select a student')
      return
    }
    setBlockLoading(true)
    try {
      await api.adminBlockUser('__global__', blockStudentId, blockReason.trim() || undefined)
      toast.success('Student blocked from group study')
      setShowBlockDialog(false)
      fetchBlockedUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to block student')
    } finally {
      setBlockLoading(false)
    }
  }

  const handleUnblock = async (b: BlockedUser) => {
    try {
      await api.adminUnblockUser('__global__', b.studentId)
      toast.success(`${b.studentName} has been unblocked`)
      fetchBlockedUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to unblock student')
    }
  }

  // ─── Member actions ─────────────────────────────────────────
  const handleRemoveMember = async (memberId: string, studentName: string) => {
    if (!viewGroup) return
    setMemberActionLoading(memberId)
    try {
      await api.adminRemoveGroupMember(viewGroup.id, memberId)
      toast.success(`${studentName} removed from group`)
      setViewGroup(null)
      fetchGroups()
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member')
    } finally {
      setMemberActionLoading(null)
    }
  }

  const handleBlockMember = async (studentId: string, studentName: string) => {
    if (!viewGroup) return
    setMemberActionLoading(studentId)
    try {
      await api.adminBlockUser('__global__', studentId, `Removed from group "${viewGroup.name}"`)
      toast.success(`${studentName} blocked from group study`)
      setViewGroup(null)
      fetchGroups()
      fetchBlockedUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to block student')
    } finally {
      setMemberActionLoading(null)
    }
  }

  // ─── Messages helpers ──────────────────────────────────────────
  const fetchGroupMessages = async (groupId: string) => {
    setMessagesLoading(true)
    try {
      const data = await api.adminGroupMessages(groupId)
      setGroupMessages(data.messages || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!viewMessagesGroup) return
    setDeletingMessageId(messageId)
    try {
      await api.adminDeleteGroupMessage(viewMessagesGroup.id, messageId)
      setGroupMessages(prev => prev.filter(m => m.id !== messageId))
      toast.success('Message deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete message')
    } finally {
      setDeletingMessageId(null)
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDateTime(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // ─── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: groups.length,
    active: groups.filter(g => g.isActive).length,
    inactive: groups.filter(g => !g.isActive).length,
    totalMembers: groups.reduce((sum, g) => sum + g.activeMembers, 0),
    totalMessages: groups.reduce((sum, g) => sum + g.totalMessages, 0),
  }), [groups])

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Groups</h1>
          <p className="text-sm text-muted-foreground">Manage study groups and blocked users</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'groups' && (
            <Button onClick={openAdd} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm">
              <Plus className="size-4 mr-1.5" />
              Create Group
            </Button>
          )}
          {activeTab === 'blocked' && (
            <Button onClick={openBlockDialog} className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-sm">
              <Shield className="size-4 mr-1.5" />
              Block User
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="card-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Users className="size-4 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Total Groups</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="card-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
                  <CheckCircle2 className="size-4 text-green-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Active</span>
              </div>
              <p className="text-2xl font-bold">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="card-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex size-8 items-center justify-center rounded-lg bg-slate-500/10">
                  <XCircle className="size-4 text-slate-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Inactive</span>
              </div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </CardContent>
          </Card>
          <Card className="card-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10">
                  <Users className="size-4 text-sky-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Members</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalMembers}</p>
            </CardContent>
          </Card>
          <Card className="card-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <MessageSquare className="size-4 text-violet-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Messages</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalMessages}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b pb-px">
        <button
          onClick={() => setActiveTab('groups')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === 'groups'
              ? 'text-emerald-600 bg-emerald-500/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-4 inline mr-1.5 -mt-0.5" />
          Groups
          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">{stats.total}</Badge>
          {activeTab === 'groups' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
            activeTab === 'blocked'
              ? 'text-rose-600 bg-rose-500/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="size-4 inline mr-1.5 -mt-0.5" />
          Blocked Users
          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">{blockedUsers.length}</Badge>
          {activeTab === 'blocked' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
          )}
        </button>
      </div>

      {/* ─── Groups Tab ────────────────────────────────────────── */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
            <Input
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 input-focus-ring rounded-lg bg-muted/30 border-transparent focus:bg-background focus:border-emerald-500/30 transition-all duration-200"
            />
          </div>

          {/* Loading */}
          {groupsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="size-10 rounded-lg shimmer-bg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 shimmer-bg" />
                      <Skeleton className="h-3 w-64 shimmer-bg" />
                    </div>
                    <Skeleton className="h-8 w-20 shimmer-bg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                  <Users className="size-7 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-muted-foreground mb-1">
                  {search ? 'No groups match your search' : 'No study groups yet'}
                </h3>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  {search ? 'Try a different search term' : 'Create your first study group to get started'}
                </p>
                {!search && (
                  <Button onClick={openAdd} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                    <Plus className="size-4 mr-1.5" />
                    Create Group
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Group</TableHead>
                    <TableHead className="font-semibold">Subject</TableHead>
                    <TableHead className="font-semibold text-center">Members</TableHead>
                    <TableHead className="font-semibold text-center">Messages</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-center">Created</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((g, idx) => (
                    <TableRow key={g.id} className="anim-fade-up" style={{ animationDelay: `${idx * 30}ms` }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex size-9 items-center justify-center rounded-lg ${g.isActive ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}>
                            <Users className={`size-4 ${g.isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{g.name}</p>
                            {g.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{g.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {g.subjectName ? (
                          <Badge variant="outline" className="text-xs font-normal">
                            {g.subjectName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">General</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={()=>setViewGroup(g)} className="flex items-center justify-center gap-1 mx-auto hover:text-emerald-600 transition-colors cursor-pointer">
                          <Users className="size-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{g.activeMembers}</span>
                          <span className="text-xs text-muted-foreground">/ {g.maxCapacity}</span>
                        </button>
                        {g.activeMembers >= g.maxCapacity && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 mt-0.5">Full</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="size-3.5 text-muted-foreground" />
                          <span className="text-sm">{g.totalMessages}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={g.isActive}
                            onCheckedChange={() => handleToggleActive(g)}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">{formatDate(g.createdAt)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setViewMessagesGroup(g); fetchGroupMessages(g.id) }} title="View messages" className="h-8 w-8 hover:bg-violet-500/10 hover:text-violet-600">
                            <MessageSquare className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setViewGroup(g)} title="View members" className="h-8 w-8 hover:bg-sky-500/10 hover:text-sky-600">
                            <Eye className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(g)} title="Edit group" className="h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-600">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(g)} title="Delete group" className="h-8 w-8 hover:bg-rose-500/10 hover:text-rose-600">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ─── Blocked Users Tab ─────────────────────────────────── */}
      {activeTab === 'blocked' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
            <Input
              placeholder="Search blocked users..."
              value={blockedSearch}
              onChange={(e) => setBlockedSearch(e.target.value)}
              className="pl-9 input-focus-ring rounded-lg bg-muted/30 border-transparent focus:bg-background focus:border-rose-500/30 transition-all duration-200"
            />
          </div>

          {/* Loading */}
          {blockedLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="size-10 rounded-full shimmer-bg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36 shimmer-bg" />
                      <Skeleton className="h-3 w-52 shimmer-bg" />
                    </div>
                    <Skeleton className="h-8 w-20 shimmer-bg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBlocked.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                  <ShieldOff className="size-7 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-muted-foreground mb-1">
                  {blockedSearch ? 'No blocked users match your search' : 'No blocked users'}
                </h3>
                <p className="text-sm text-muted-foreground/70">
                  {blockedSearch ? 'Try a different search term' : 'All students currently have access to group study'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Student</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Course</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold text-center">Blocked On</TableHead>
                    <TableHead className="font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlocked.map((b, idx) => (
                    <TableRow key={b.id} className="anim-fade-up" style={{ animationDelay: `${idx * 30}ms` }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-rose-500/10">
                            <UserX className="size-4 text-rose-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{b.studentName}</p>
                            <p className="text-xs text-muted-foreground">{b.studentMobile}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{b.studentEmail}</span>
                      </TableCell>
                      <TableCell>
                        {b.courseTitle ? (
                          <Badge variant="outline" className="text-xs font-normal">{b.courseTitle}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{b.reason || 'No reason provided'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs text-muted-foreground">{formatDateTime(b.blockedAt)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblock(b)}
                          className="h-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                        >
                          <ShieldOff className="size-3.5 mr-1.5" />
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ─── Create / Edit Group Dialog ────────────────────────── */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="dialog-gradient-header -m-6 mb-0 p-6 pb-4 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Pencil className="size-5 text-emerald-600" /> : <Plus className="size-5 text-emerald-600" />}
              {editingId ? 'Edit Study Group' : 'Create Study Group'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the group details below.' : 'Fill in the details to create a new study group.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="group-name" className="text-sm font-medium">
                Group Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="group-name"
                placeholder="e.g. Data Structures Study Circle"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="input-focus-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-desc" className="text-sm font-medium">Description</Label>
              <Textarea
                id="group-desc"
                placeholder="Brief description of the group's focus..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="input-focus-ring min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group-capacity" className="text-sm font-medium">
                  Max Capacity <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="group-capacity"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="10"
                  value={formMaxCapacity}
                  onChange={(e) => setFormMaxCapacity(e.target.value)}
                  className="input-focus-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-subject" className="text-sm font-medium">Subject (Optional)</Label>
                <Select value={formSubjectId} onValueChange={(v) => setFormSubjectId(v === '__none__' ? '' : v)}>
                  <SelectTrigger id="group-subject" className="input-focus-ring">
                    <SelectValue placeholder="No specific subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No specific subject</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.course ? ` (${s.course.title})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={resetForm} disabled={formLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={formLoading || !formName.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {formLoading && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editingId ? 'Update Group' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-600" />
              Delete Group
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all
              {deleteTarget?.activeMembers ? ` ${deleteTarget.activeMembers} member(s) and` : ''} all messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Block User Dialog ─────────────────────────────────── */}
      <Dialog open={showBlockDialog} onOpenChange={(open) => { if (!open) setShowBlockDialog(false) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-rose-500/8 to-red-500/5 border-b border-rose-500/10 -m-6 mb-0 p-6 pb-4 rounded-t-lg dark:from-rose-500/12 dark:to-red-500/6 dark:border-rose-500/15">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-rose-600" />
              Block User from Group Study
            </DialogTitle>
            <DialogDescription>
              Select a student to block from participating in all study groups.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Student Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Select Student <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search students by name or email..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value)
                    if (e.target.value.length > 0 || students.length === 0) {
                      fetchStudents(e.target.value)
                    }
                  }}
                  className="pl-9 input-focus-ring"
                />
              </div>

              {studentsLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full shimmer-bg rounded" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {studentSearch ? 'No students found' : 'All students are already blocked or none exist'}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto admin-scroll border rounded-lg">
                  {filteredStudents.slice(0, 20).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setBlockStudentId(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                        blockStudentId === s.id ? 'bg-rose-500/5 border-l-2 border-rose-500' : ''
                      }`}
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                        <span className="text-xs font-medium">{(s.name || 'U').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      </div>
                      {blockStudentId === s.id && (
                        <CheckCircle2 className="size-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="block-reason" className="text-sm font-medium">Reason (Optional)</Label>
              <Textarea
                id="block-reason"
                placeholder="Why is this student being blocked?"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="input-focus-ring min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} disabled={blockLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleBlock}
              disabled={blockLoading || !blockStudentId}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {blockLoading && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              <Shield className="size-4 mr-1.5" />
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Members Dialog ────────────────────────────────── */}
      <Dialog open={!!viewGroup} onOpenChange={(open) => { if (!open) setViewGroup(null) }}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="dialog-gradient-header -m-6 mb-0 p-6 pb-4 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-emerald-600" />
              {viewGroup?.name}
            </DialogTitle>
            <DialogDescription>
              {viewGroup?.activeMembers} member{viewGroup?.activeMembers !== 1 ? 's' : ''} &middot; Capacity {viewGroup?.activeMembers}/{viewGroup?.maxCapacity}
            </DialogDescription>
          </DialogHeader>

          {viewGroup && viewGroup.members.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-30" />
              No members in this group
            </div>
          ) : (
            <div className="space-y-1.5 pt-4">
              {viewGroup?.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs shrink-0">
                    {(m.studentName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.studentName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="size-3" />{m.studentEmail}</span>
                      <span>&middot;</span>
                      <span>Joined {formatDate(m.joinedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleRemoveMember(m.id, m.studentName)}
                      disabled={memberActionLoading === m.id}
                      className="h-8 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                    >
                      {memberActionLoading === m.id ? <Loader2 className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
                      <span className="hidden sm:inline ml-1">Remove</span>
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleBlockMember(m.studentId, m.studentName)}
                      disabled={memberActionLoading === m.studentId}
                      className="h-8 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                    >
                      {memberActionLoading === m.studentId ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                      <span className="hidden sm:inline ml-1">Block</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── View Messages Dialog ──────────────────────────────── */}
      <Dialog open={!!viewMessagesGroup} onOpenChange={(open) => { if (!open) { setViewMessagesGroup(null); setGroupMessages([]) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="dialog-gradient-header -m-6 mb-0 p-6 pb-4 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-violet-600" />
              Messages &mdash; {viewMessagesGroup?.name}
            </DialogTitle>
            <DialogDescription>
              {groupMessages.length} message{groupMessages.length !== 1 ? 's' : ''} &middot; Click trash to delete a message
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4">
            {messagesLoading ? (
              <div className="space-y-3 py-4">
                {[1,2,3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg shimmer-bg" />
                ))}
              </div>
            ) : groupMessages.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
                No messages in this group
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto admin-scroll">
                {groupMessages.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-700 dark:text-violet-300 font-semibold text-xs shrink-0 mt-0.5">
                      {(m.studentName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">{m.studentName}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                      </div>
                      <p className="text-sm mt-0.5 text-foreground break-words">{m.content}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleDeleteMessage(m.id)}
                      disabled={deletingMessageId === m.id}
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                      title="Delete message"
                    >
                      {deletingMessageId === m.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash className="size-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
