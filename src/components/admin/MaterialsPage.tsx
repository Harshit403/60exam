'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  BookMarked, Plus, Pencil, Trash2, Loader2, FileText, PlayCircle, Link as LinkIcon, File,
  Search, ExternalLink, Library, HardDrive, Clock, CheckCircle2, User,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

interface Material {
  id: string
  title: string
  description: string | null
  type: string
  url: string
  fileSize: string | null
  duration: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  course: { id: string; title: string } | null
  subject: { id: string; name: string } | null
  chapter: { id: string; name: string } | null
  sharedBy: { id: string; fullName: string } | null
}

interface Course { id: string; title: string }
interface Subject { id: string; name: string; courseId: string }
interface Chapter { id: string; name: string; subjectId: string }

const TYPE_META: Record<string, { icon: typeof FileText; label: string; color: string; bg: string }> = {
  pdf: { icon: FileText, label: 'PDF', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 dark:bg-rose-500/15' },
  video: { icon: PlayCircle, label: 'Video', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10 dark:bg-violet-500/15' },
  link: { icon: LinkIcon, label: 'Link', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10 dark:bg-sky-500/15' },
  document: { icon: File, label: 'Document', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/15' },
}

const TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'Video' },
  { value: 'link', label: 'Link' },
  { value: 'document', label: 'Document' },
]

const PAGE_SIZE = 10

export function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Meta
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formCourseId, setFormCourseId] = useState('')
  const [formSubjectId, setFormSubjectId] = useState('')
  const [formChapterId, setFormChapterId] = useState('')
  const [formType, setFormType] = useState('pdf')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formFileSize, setFormFileSize] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.adminMaterials()
      setMaterials(data.materials || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMeta = useCallback(async () => {
    try {
      const [cData, sData, chData] = await Promise.all([
        api.adminCourses(),
        api.adminSubjects(),
        api.adminChapters(),
      ])
      setCourses(cData.courses || [])
      setSubjects(sData.subjects || [])
      setChapters(chData.chapters || [])
    } catch (err: any) {
      console.error('Meta fetch error:', err)
    }
  }, [])

  useEffect(() => {
    fetchMaterials()
    fetchMeta()
  }, [fetchMaterials, fetchMeta])

  // Filter + search + pagination
  const filtered = useMemo(() => {
    if (!search.trim()) return materials
    const q = search.toLowerCase()
    return materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q) ?? false) ||
        (m.course?.title.toLowerCase().includes(q) ?? false) ||
        (m.subject?.name.toLowerCase().includes(q) ?? false) ||
        (m.chapter?.name.toLowerCase().includes(q) ?? false) ||
        m.type.toLowerCase().includes(q)
    )
  }, [materials, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset form
  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormUrl('')
    setFormCourseId(''); setFormSubjectId(''); setFormChapterId('')
    setFormType('pdf'); setFormFileSize(''); setFormDuration(''); setFormIsActive(true)
    setEditingId(null); setShowForm(false)
  }

  // Open add form
  const openAdd = () => {
    resetForm()
    setShowForm(true)
  }

  // Open edit form
  const openEdit = (m: Material) => {
    setFormTitle(m.title); setFormDescription(m.description || ''); setFormUrl(m.url)
    setFormCourseId(m.course?.id || ''); setFormSubjectId(m.subject?.id || ''); setFormChapterId(m.chapter?.id || '')
    setFormType(m.type); setFormFileSize(m.fileSize || ''); setFormDuration(m.duration || ''); setFormIsActive(m.isActive)
    setEditingId(m.id); setShowForm(true)
  }

  // Filtered subjects/chapters for form
  const formSubjects = useMemo(
    () => (formCourseId ? subjects.filter((s) => s.courseId === formCourseId) : subjects),
    [formCourseId, subjects]
  )
  const formChapters = useMemo(
    () => (formSubjectId ? chapters.filter((c) => c.subjectId === formSubjectId) : []),
    [formSubjectId, chapters]
  )

  const handleCourseChange = (v: string) => {
    setFormCourseId(v === '__none__' ? '' : v)
    setFormSubjectId(''); setFormChapterId('')
  }
  const handleSubjectChange = (v: string) => {
    setFormSubjectId(v === '__none__' ? '' : v)
    setFormChapterId('')
  }
  const handleChapterChange = (v: string) => {
    setFormChapterId(v === '__none__' ? '' : v)
  }

  // Submit form
  const handleSubmit = async () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      toast.error('Title and URL are required')
      return
    }
    setFormLoading(true)
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        type: formType,
        url: formUrl.trim(),
        courseId: formCourseId || null,
        subjectId: formSubjectId || null,
        chapterId: formChapterId || null,
        fileSize: formFileSize.trim() || null,
        duration: formDuration.trim() || null,
        isActive: formIsActive,
      }
      if (editingId) {
        await api.adminUpdateMaterial(editingId, payload)
        toast.success('Material updated')
      } else {
        await api.adminCreateMaterial(payload)
        toast.success('Material created')
      }
      resetForm()
      fetchMaterials()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save material')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.adminDeleteMaterial(deleteTarget.id)
      toast.success('Material deleted')
      setDeleteTarget(null)
      fetchMaterials()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete material')
    }
  }

  const toggleActive = async (m: Material) => {
    try {
      await api.adminUpdateMaterial(m.id, { isActive: !m.isActive })
      fetchMaterials()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Stats
  const stats = useMemo(() => {
    return {
      total: materials.length,
      active: materials.filter((m) => m.isActive).length,
      pdf: materials.filter((m) => m.type === 'pdf').length,
      video: materials.filter((m) => m.type === 'video').length,
    }
  }, [materials])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Study Materials</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage study resources for students</p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Material
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={Library} gradient="from-slate-500 to-slate-600" iconBg="bg-slate-500/15 text-slate-600 dark:text-slate-400" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} gradient="from-emerald-500 to-teal-500" iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
        <StatCard label="PDFs" value={stats.pdf} icon={FileText} gradient="from-rose-500 to-pink-500" iconBg="bg-rose-500/15 text-rose-600 dark:text-rose-400" />
        <StatCard label="Videos" value={stats.video} icon={PlayCircle} gradient="from-violet-500 to-purple-500" iconBg="bg-violet-500/15 text-violet-600 dark:text-violet-400" />
      </div>

      {/* Search + Form trigger */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search materials by title, course, subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); setShowForm(o) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600">
                <BookMarked className="size-4" />
              </div>
              {editingId ? 'Edit Material' : 'Add Study Material'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the material details below' : 'Fill in the details for the new study material'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title + Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">Title *</Label>
                <Input
                  placeholder="e.g., Company Law Chapter 1 Video Lecture"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="input-focus-ring rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="w-full input-focus-ring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL *</Label>
              <Input
                placeholder="https://example.com/materials/..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="input-focus-ring rounded-lg"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                placeholder="Brief description of what this material covers..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="input-focus-ring rounded-lg min-h-[80px]"
              />
            </div>

            {/* Course / Subject / Chapter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Course</Label>
                <Select value={formCourseId || '__none__'} onValueChange={handleCourseChange}>
                  <SelectTrigger className="w-full input-focus-ring">
                    <SelectValue placeholder="No specific course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No specific course —</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Subject</Label>
                <Select
                  value={formSubjectId || '__none__'}
                  onValueChange={handleSubjectChange}
                  disabled={!formCourseId && formSubjects.length === 0}
                >
                  <SelectTrigger className="w-full input-focus-ring">
                    <SelectValue placeholder="No specific subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No specific subject —</SelectItem>
                    {formSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Chapter</Label>
                <Select
                  value={formChapterId || '__none__'}
                  onValueChange={handleChapterChange}
                  disabled={!formSubjectId}
                >
                  <SelectTrigger className="w-full input-focus-ring">
                    <SelectValue placeholder="No specific chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No specific chapter —</SelectItem>
                    {formChapters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Size + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> File Size (optional)
                </Label>
                <Input
                  placeholder="e.g., 4.2 MB"
                  value={formFileSize}
                  onChange={(e) => setFormFileSize(e.target.value)}
                  className="input-focus-ring rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duration (optional)
                </Label>
                <Input
                  placeholder="e.g., 1h 45m (for videos)"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  className="input-focus-ring rounded-lg"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Label className="text-sm font-medium">Active (visible to students)</Label>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                className="data-[state=checked]:bg-emerald-500 transition-colors"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={formLoading}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Update Material' : 'Create Material'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card className="card-lift">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 flex-1 rounded-lg shimmer-bg" />)}
              </div>
              {Array.from({ length: 5 }).map((_, r) => (
                <div key={r} className="flex gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 flex-1 rounded-lg shimmer-bg" />
                  ))}
                </div>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 mx-auto mb-4">
                <BookMarked className="size-7 text-violet-400" />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {search ? 'No materials match your search' : 'No materials yet'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {search ? 'Try adjusting your search query' : 'Click "Add Material" to create the first one'}
              </p>
              {!search && (
                <Button
                  onClick={openAdd}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Material
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-muted/60 to-muted/30">
                      <TableHead className="min-w-[220px]">Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Course / Subject</TableHead>
                      <TableHead className="hidden lg:table-cell">Size / Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((m, i) => {
                      const meta = TYPE_META[m.type] || TYPE_META.pdf
                      const TypeIcon = meta.icon
                      return (
                        <TableRow
                          key={m.id}
                          className={`transition-all duration-150 hover:bg-violet-500/5 ${i % 2 === 1 ? 'bg-muted/8' : ''}`}
                        >
                          <TableCell>
                            <div className="flex items-start gap-2.5">
                              <div className={`flex-shrink-0 flex size-8 items-center justify-center rounded-lg ${meta.bg}`}>
                                <TypeIcon className={`size-4 ${meta.color}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm line-clamp-1 flex items-center gap-1.5 flex-wrap">
                                  {m.title}
                                  {m.sharedBy && (
                                    <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-medium text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/60 gap-1 shrink-0">
                                      <User className="w-2 h-2" />
                                      {m.sharedBy.fullName}
                                    </Badge>
                                  )}
                                </p>
                                {m.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{m.description}</p>
                                )}
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400 hover:underline mt-0.5"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[180px]">{m.url}</span>
                                </a>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-medium ${meta.color}`}>
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-xs space-y-0.5">
                              {m.course ? (
                                <p className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{m.course.title}</p>
                              ) : (
                                <p className="text-muted-foreground italic">General</p>
                              )}
                              {m.subject && (
                                <p className="text-muted-foreground line-clamp-1">{m.subject.name}</p>
                              )}
                              {m.chapter && (
                                <p className="text-muted-foreground/70 line-clamp-1">› {m.chapter.name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-xs space-y-0.5">
                              {m.fileSize && (
                                <p className="flex items-center gap-1 text-muted-foreground">
                                  <HardDrive className="w-2.5 h-2.5" />
                                  {m.fileSize}
                                </p>
                              )}
                              {m.duration && (
                                <p className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="w-2.5 h-2.5" />
                                  {m.duration}
                                </p>
                              )}
                              {!m.fileSize && !m.duration && (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => toggleActive(m)}
                              className="inline-flex items-center gap-1.5"
                              title={m.isActive ? 'Click to deactivate' : 'Click to activate'}
                            >
                              <Switch
                                checked={m.isActive}
                                onCheckedChange={() => toggleActive(m)}
                                className="data-[state=checked]:bg-emerald-500 transition-colors scale-90"
                              />
                              <span className={`text-[10px] font-medium ${m.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {m.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(m)}
                                className="hover:bg-sky-500/10 hover:text-sky-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(m)}
                                className="hover:bg-destructive/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground font-medium">
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(safePage - 1)}
                      disabled={safePage <= 1}
                      className="text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(safePage + 1)}
                      disabled={safePage >= totalPages}
                      className="text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.title}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── StatCard helper ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  iconBg,
}: {
  label: string
  value: number
  icon: typeof Library
  gradient: string
  iconBg: string
}) {
  return (
    <Card className="overflow-hidden relative card-lift">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg} mb-2`}>
              <Icon className="size-4" />
            </div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
