'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  BookMarked, FileText, PlayCircle, Link as LinkIcon, File, Search,
  ExternalLink, Download, FolderTree, LayoutGrid, Library, Clock, HardDrive, ChevronRight,
  Plus, Pencil, Trash2, Loader2, Share2, User,
} from 'lucide-react'
import { api } from '@/lib/api-client'

// ─── Types ───────────────────────────────────────────────────────────────

interface MaterialItem {
  id: string
  title: string
  description: string | null
  type: string // pdf, video, link, document
  url: string
  fileSize: string | null
  duration: string | null
  isActive: boolean
  createdAt: string
  course: { id: string; title: string; slug?: string } | null
  subject: { id: string; name: string } | null
  chapter: { id: string; name: string } | null
  sharedBy: { id: string; fullName: string } | null
  mine?: boolean
}

interface GroupedChapter {
  chapter: { id: string; name: string } | null
  materials: MaterialItem[]
}

interface GroupedSubject {
  subject: { id: string; name: string } | null
  materials: MaterialItem[]
  chapters: GroupedChapter[]
}

interface GroupedCourse {
  course: { id: string; title: string; slug?: string } | null
  materials: MaterialItem[]
  subjects: GroupedSubject[]
}

interface MaterialsResponse {
  materials: MaterialItem[]
  grouped: GroupedCourse[]
  total: number
}

interface CourseOption {
  id: string
  title: string
  slug: string
}

interface SubjectOption {
  id: string
  name: string
  courseId: string
  chapters: { id: string; name: string }[]
}

// ─── Type Meta ───────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: typeof FileText; label: string; color: string; bg: string; border: string }> = {
  pdf: {
    icon: FileText,
    label: 'PDF',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-200 dark:border-rose-900/50',
  },
  video: {
    icon: PlayCircle,
    label: 'Video',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    border: 'border-violet-200 dark:border-violet-900/50',
  },
  link: {
    icon: LinkIcon,
    label: 'Link',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    border: 'border-sky-200 dark:border-sky-900/50',
  },
  document: {
    icon: File,
    label: 'Document',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-200 dark:border-amber-900/50',
  },
}

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'Video' },
  { value: 'link', label: 'Link' },
  { value: 'document', label: 'Document' },
]

// ─── Component ───────────────────────────────────────────────────────────

export function MaterialsPage() {
  const [data, setData] = useState<MaterialsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [subjectTree, setSubjectTree] = useState<SubjectOption[]>([])

  // Filters
  const [courseFilter, setCourseFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  // View mode: 'flat' | 'grouped'
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped')

  // Share/edit/delete form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState('link')
  const [formUrl, setFormUrl] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formSubjectId, setFormSubjectId] = useState('')
  const [formChapterId, setFormChapterId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MaterialItem | null>(null)

  // Fetch available courses for filter (uses public endpoint)
  useEffect(() => {
    async function fetchCourses() {
      try {
        const result = await api.publicCourses()
        const list = result.courses || result || []
        const arr = Array.isArray(list) ? list : []
        setCourses(arr.map((c: any) => ({ id: c.id, title: c.title, slug: c.slug })))
        const subjects: SubjectOption[] = []
        for (const c of arr) {
          for (const s of c.subjects || []) {
            subjects.push({
              id: s.id,
              name: s.name,
              courseId: c.id,
              chapters: (s.chapters || []).map((ch: any) => ({ id: ch.id, name: ch.name })),
            })
          }
        }
        setSubjectTree(subjects)
      } catch (err) {
        console.error('Failed to fetch courses for filter:', err)
      }
    }
    fetchCourses()
  }, [])

  // Resolve selected course filter to a courseId (only when not "all")
  const selectedCourseId = useMemo(() => {
    if (courseFilter === 'all') return undefined
    const c = courses.find((c) => c.slug === courseFilter)
    return c?.id
  }, [courseFilter, courses])

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.studentMaterials({
        courseId: selectedCourseId,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      })
      setData(result as MaterialsResponse)
    } catch (err) {
      console.error('Materials fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedCourseId, typeFilter])

  useEffect(() => {
    // Only fetch after courses have been resolved OR filter is 'all'
    if (courseFilter === 'all' || courses.length > 0) {
      fetchMaterials()
    }
  }, [fetchMaterials, courses, courseFilter])

  // Apply client-side search filter (in addition to server filters)
  const filteredMaterials = useMemo(() => {
    if (!data?.materials) return []
    if (!search.trim()) return data.materials
    const q = search.toLowerCase()
    return data.materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q) ?? false) ||
        (m.course?.title.toLowerCase().includes(q) ?? false) ||
        (m.subject?.name.toLowerCase().includes(q) ?? false) ||
        (m.chapter?.name.toLowerCase().includes(q) ?? false)
    )
  }, [data, search])

  // Re-build grouped view from filtered materials (client-side)
  const filteredGrouped = useMemo<GroupedCourse[]>(() => {
    if (!filteredMaterials.length) return []

    const courseMap = new Map<string, GroupedCourse>()

    const getOrCreateCourse = (m: MaterialItem): GroupedCourse => {
      const key = m.course?.id || '__general__'
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          course: m.course,
          materials: [],
          subjects: [],
        })
      }
      return courseMap.get(key)!
    }

    for (const m of filteredMaterials) {
      const g = getOrCreateCourse(m)

      if (!m.subject) {
        g.materials.push(m)
        continue
      }

      let s = g.subjects.find((s) => s.subject?.id === m.subject!.id)
      if (!s) {
        s = { subject: m.subject, materials: [], chapters: [] }
        g.subjects.push(s)
      }

      if (!m.chapter) {
        s.materials.push(m)
        continue
      }

      let ch = s.chapters.find((c) => c.chapter?.id === m.chapter!.id)
      if (!ch) {
        ch = { chapter: m.chapter, materials: [] }
        s.chapters.push(ch)
      }
      ch.materials.push(m)
    }

    return Array.from(courseMap.values())
  }, [filteredMaterials])

  // Filtered subjects/chapters for the share form
  const formSubjects = useMemo(
    () => (formCourseId ? subjectTree.filter((s) => s.courseId === formCourseId) : []),
    [formCourseId, subjectTree]
  )
  const formChapters = useMemo(
    () => (formSubjectId ? formSubjects.find((s) => s.id === formSubjectId)?.chapters || [] : []),
    [formSubjectId, formSubjects]
  )

  // Share form handlers
  const resetShareForm = () => {
    setFormTitle(''); setFormDescription(''); setFormType('link'); setFormUrl('')
    setFormCourseId(''); setFormSubjectId(''); setFormChapterId('')
    setEditingId(null); setShowForm(false)
  }

  const openShare = () => {
    resetShareForm()
    setShowForm(true)
  }

  const openEdit = (m: MaterialItem) => {
    setFormTitle(m.title); setFormDescription(m.description || ''); setFormType(m.type); setFormUrl(m.url)
    setFormCourseId(m.course?.id || ''); setFormSubjectId(m.subject?.id || ''); setFormChapterId(m.chapter?.id || '')
    setEditingId(m.id); setShowForm(true)
  }

  const handleShareSubmit = async () => {
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
      }
      if (editingId) {
        await api.studentUpdateMaterial(editingId, payload)
        toast.success('Note updated')
      } else {
        await api.studentCreateMaterial(payload)
        toast.success('Note shared with everyone')
      }
      resetShareForm()
      fetchMaterials()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save note')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.studentDeleteMaterial(deleteTarget.id)
      toast.success('Note removed')
      setDeleteTarget(null)
      fetchMaterials()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete note')
    }
  }

  // Stats
  const stats = useMemo(() => {
    const total = filteredMaterials.length
    const byType: Record<string, number> = { pdf: 0, video: 0, link: 0, document: 0 }
    filteredMaterials.forEach((m) => {
      if (byType[m.type] !== undefined) byType[m.type]++
    })
    return { total, byType }
  }, [filteredMaterials])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Study Materials</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse and access resources across your courses
            </p>
          </div>
        </div>

        {/* View mode toggle + Share button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={openShare}
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Share Note
          </Button>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Grouped view"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grouped</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'flat'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <Card className="overflow-hidden relative">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center">
                  <Library className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Total</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {(['pdf', 'video', 'link', 'document'] as const).map((t) => {
            const meta = TYPE_META[t]
            const Icon = meta.icon
            return (
              <Card key={t} className="overflow-hidden relative">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{meta.label}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">{stats.byType[t]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search materials, courses, subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.length > 0 && <SelectItem value="all">All Courses</SelectItem>}
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredMaterials.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4">
              <BookMarked className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">No materials found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {search || typeFilter !== 'all' || courseFilter !== 'all'
                ? 'Try adjusting your filters or search query to find what you are looking for.'
                : 'Study materials will appear here once your instructor publishes them.'}
            </p>
            {(search || typeFilter !== 'all' || courseFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('all')
                  setCourseFilter('all')
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'flat' ? (
        /* Flat Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((m, i) => (
            <MaterialCard key={m.id} material={m} index={i} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      ) : (
        /* Grouped View */
        <div className="space-y-6">
          {filteredGrouped.map((group, gi) => (
            <div key={group.course?.id || '__general__'} className="space-y-4 slide-up" style={{ animationDelay: `${gi * 50}ms` }}>
              {/* Course Header */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                  <BookMarked className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {group.course?.title || 'General Materials'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {countMaterialsInGroup(group)} material{countMaterialsInGroup(group) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700 ml-2" />
              </div>

              {/* Course-level materials (no subject) */}
              {group.materials.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                  {group.materials.map((m, i) => (
                    <MaterialCard key={m.id} material={m} index={i} onEdit={openEdit} onDelete={setDeleteTarget} />
                  ))}
                </div>
              )}

              {/* Subjects */}
              <div className="space-y-4 pl-4 sm:pl-6 border-l border-slate-200 dark:border-slate-800 ml-4">
                {group.subjects.map((subj, si) => (
                  <div key={subj.subject?.id || `s-${si}`} className="space-y-3">
                    {/* Subject Header */}
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                        <File className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {subj.subject?.name || 'Unknown Subject'}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {countMaterialsInSubject(subj)} material{countMaterialsInSubject(subj) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Subject-level materials */}
                    {subj.materials.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10">
                        {subj.materials.map((m, i) => (
                          <MaterialCard key={m.id} material={m} index={i} compact onEdit={openEdit} onDelete={setDeleteTarget} />
                        ))}
                      </div>
                    )}

                    {/* Chapters */}
                    {subj.chapters.length > 0 && (
                      <div className="space-y-2 pl-8 sm:pl-10">
                        {subj.chapters.map((ch, ci) => (
                          <div key={ch.chapter?.id || `c-${ci}`} className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {ch.chapter?.name || 'Unknown Chapter'}
                              </span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                {ch.materials.length}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                              {ch.materials.map((m, i) => (
                                <MaterialCard key={m.id} material={m} index={i} compact onEdit={openEdit} onDelete={setDeleteTarget} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share / Edit Note Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetShareForm(); setShowForm(o) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600">
                <Share2 className="size-4" />
              </div>
              {editingId ? 'Edit Your Note' : 'Share a Note'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update your shared note below. It stays visible to everyone until you remove it.'
                : 'Share a study resource with all students. You can edit or remove it anytime.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">Title *</Label>
                <Input
                  placeholder="e.g., Company Law - Important Sections Summary"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_FILTERS.filter((f) => f.value !== 'all').map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL *</Label>
              <Input
                placeholder="https://example.com/notes/..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                placeholder="What does this note cover?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Course</Label>
                <Select value={formCourseId || '__none__'} onValueChange={(v) => { setFormCourseId(v === '__none__' ? '' : v); setFormSubjectId(''); setFormChapterId('') }}>
                  <SelectTrigger className="w-full">
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
                <Select value={formSubjectId || '__none__'} onValueChange={(v) => { setFormSubjectId(v === '__none__' ? '' : v); setFormChapterId('') }} disabled={!formCourseId}>
                  <SelectTrigger className="w-full">
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
                <Select value={formChapterId || '__none__'} onValueChange={(v) => setFormChapterId(v === '__none__' ? '' : v)} disabled={!formSubjectId}>
                  <SelectTrigger className="w-full">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetShareForm}>Cancel</Button>
            <Button
              onClick={handleShareSubmit}
              disabled={formLoading}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Update Note' : 'Share Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Shared Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{deleteTarget?.title}</span>?
              Other students will no longer see it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function countMaterialsInGroup(g: GroupedCourse): number {
  let n = g.materials.length
  for (const s of g.subjects) {
    n += countMaterialsInSubject(s)
  }
  return n
}

function countMaterialsInSubject(s: GroupedSubject): number {
  let n = s.materials.length
  for (const c of s.chapters) {
    n += c.materials.length
  }
  return n
}

// ─── Material Card Component ─────────────────────────────────────────────

function MaterialCard({ material, index = 0, compact = false, onEdit, onDelete }: {
  material: MaterialItem; index?: number; compact?: boolean;
  onEdit?: (m: MaterialItem) => void; onDelete?: (m: MaterialItem) => void;
}) {
  const meta = TYPE_META[material.type] || TYPE_META.pdf
  const Icon = meta.icon
  const isLink = material.type === 'link'
  const isVideo = material.type === 'video'
  const isMine = !!material.mine

  // Build breadcrumb
  const breadcrumb = [material.course?.title, material.subject?.name, material.chapter?.name]
    .filter(Boolean)
    .join(' / ')

  return (
    <Card
      className="overflow-hidden card-hover hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 slide-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        {/* Type Icon + Badge */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}>
              {material.title}
            </h3>
            {breadcrumb && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 flex items-center gap-1">
                <Library className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{breadcrumb}</span>
              </p>
            )}
          </div>
          {isMine && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit?.(material)}
                className="hover:bg-sky-500/10 hover:text-sky-600 transition-colors p-1.5 h-auto"
                title="Edit your note"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete?.(material)}
                className="hover:bg-destructive/10 transition-colors p-1.5 h-auto"
                title="Remove your note"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </Button>
            </div>
          )}
        </div>

        {/* Shared by badge */}
        {material.sharedBy && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/60 gap-1">
              <User className="w-2.5 h-2.5" />
              Shared by {material.sharedBy.fullName || 'Student'}
              {isMine && ' (You)'}
            </Badge>
          </div>
        )}

        {/* Description */}
        {material.description && (
          <p className={`text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 ${compact ? 'min-h-0' : 'min-h-[2.5rem]'}`}>
            {material.description}
          </p>
        )}

        {/* Meta badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-medium ${meta.color} ${meta.border}`}>
            {meta.label}
          </Badge>
          {material.fileSize && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 gap-0.5">
              <HardDrive className="w-2.5 h-2.5" />
              {material.fileSize}
            </Badge>
          )}
          {material.duration && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {material.duration}
            </Badge>
          )}
        </div>

        {/* Action Button */}
        <Button
          asChild
          size="sm"
          className={`w-full gap-1.5 text-xs font-medium transition-all active:scale-[0.98] ${
            isVideo
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
              : isLink
              ? 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
          }`}
        >
          <a href={material.url} target="_blank" rel="noopener noreferrer">
            {isLink ? (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                Open Link
              </>
            ) : isVideo ? (
              <>
                <PlayCircle className="w-3.5 h-3.5" />
                Watch Video
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Download
              </>
            )}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
