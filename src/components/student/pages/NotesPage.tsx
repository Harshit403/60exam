'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StickyNote, Plus, Pin, Trash2, Edit3, X, Loader2, Search } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Note, Subject } from '../types'

const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', class: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800', dot: 'bg-slate-400', accent: '' },
  { value: 'yellow', label: 'Yellow', class: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900', dot: 'bg-amber-400', accent: 'border-t-amber-400' },
  { value: 'green', label: 'Green', class: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900', dot: 'bg-emerald-400', accent: 'border-t-emerald-400' },
  { value: 'blue', label: 'Blue', class: 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900', dot: 'bg-sky-400', accent: 'border-t-sky-400' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900', dot: 'bg-pink-400', accent: 'border-t-pink-400' },
  { value: 'purple', label: 'Purple', class: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900', dot: 'bg-violet-400', accent: 'border-t-violet-400' },
]

const getColorClass = (color: string) => COLOR_OPTIONS.find(c => c.value === color)?.class || COLOR_OPTIONS[0].class
const getColorAccent = (color: string) => COLOR_OPTIONS.find(c => c.value === color)?.accent || ''

export function NotesPage({ subjects = [] }: { subjects?: Subject[] }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterColor, setFilterColor] = useState('all')

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [color, setColor] = useState('default')

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentNotes()
      setNotes(data.notes || [])
    } catch (err) { console.error('Notes fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const resetForm = () => {
    setTitle(''); setContent(''); setChapterId(''); setColor('default')
    setEditingId(null); setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!title || !content) return
    setFormLoading(true)
    try {
      if (editingId) {
        await api.studentUpdateNote(editingId, { title, content, chapterId: chapterId || null, color })
      } else {
        await api.studentCreateNote({ title, content, chapterId: chapterId || null, color })
      }
      resetForm(); fetchNotes()
    } catch (err) { console.error('Note save error:', err) }
    finally { setFormLoading(false) }
  }

  const handleEdit = (note: Note) => {
    setTitle(note.title); setContent(note.content); setChapterId(note.chapterId || '')
    setColor(note.color); setEditingId(note.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return
    try {
      await api.studentDeleteNote(id)
      fetchNotes()
    } catch (err) { console.error('Note delete error:', err) }
  }

  const togglePin = async (note: Note) => {
    try {
      await api.studentUpdateNote(note.id, { pinned: !note.pinned })
      fetchNotes()
    } catch (err) { console.error('Pin error:', err) }
  }

  // Flatten chapters for select dropdown
  const allChapters = subjects.flatMap(s => s.chapters.map(c => ({ ...c, subjectName: s.name })))

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (filterColor !== 'all' && n.color !== filterColor) return false
    if (search) {
      const q = search.toLowerCase()
      if (!n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q)) return false
    }
    return true
  })

  const pinnedNotes = filteredNotes.filter(n => n.pinned)
  const regularNotes = filteredNotes.filter(n => !n.pinned)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <StickyNote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">My Notes</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Capture & organize your learnings</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900">
          <Plus className="w-4 h-4 mr-2" /> New Note
        </Button>
      </div>

      {/* Stats row - Enhanced */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 sm:p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-200/20 dark:bg-amber-800/20 rounded-full -translate-y-1/3 translate-x-1/3 blur-md" />
          <p className="text-xs text-slate-500 relative">Total Notes</p>
          <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 relative">{notes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 sm:p-3 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-rose-200/20 dark:bg-rose-800/20 rounded-full -translate-y-1/3 translate-x-1/3 blur-md" />
          <p className="text-xs text-slate-500 relative">Pinned</p>
          <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 relative">{notes.filter(n => n.pinned).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 sm:p-3 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-violet-200/20 dark:bg-violet-800/20 rounded-full -translate-y-1/3 translate-x-1/3 blur-md" />
          <p className="text-xs text-slate-500 relative">Subjects</p>
          <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 relative">
            {new Set(notes.map(n => n.chapter?.subject?.name).filter(Boolean)).size}
          </p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9" />
        </div>
        <Select value={filterColor} onValueChange={setFilterColor}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filter by color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All colors</SelectItem>
            {COLOR_OPTIONS.map(c => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} /> {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card className="grow-in">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {editingId ? 'Edit Note' : 'New Note'}
              </h3>
              <Button size="sm" variant="ghost" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input placeholder="Note title..." value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content</Label>
              <Textarea placeholder="Write your notes here..." value={content}
                onChange={(e) => setContent(e.target.value)} rows={5} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Linked Chapter (optional)</Label>
                <Select value={chapterId} onValueChange={setChapterId}>
                  <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                  <SelectContent>
                    {allChapters.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.subjectName} → {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Color</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.value} onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''}`}
                      title={c.label}>
                      <span className={`block w-4 h-4 rounded-full ${c.dot}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={!title || !content || formLoading}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900">
                {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingId ? 'Update Note' : 'Save Note'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <StickyNote className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              {search || filterColor !== 'all' ? 'No notes match your filters' : 'No notes yet'}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {search || filterColor !== 'all' ? 'Try changing filters' : 'Click "New Note" to start writing'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Pinned
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map(note => <NoteCard key={note.id} note={note} onEdit={handleEdit} onDelete={handleDelete} onPin={togglePin} />)}
              </div>
            </div>
          )}
          {regularNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">All Notes</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularNotes.map(note => <NoteCard key={note.id} note={note} onEdit={handleEdit} onDelete={handleDelete} onPin={togglePin} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NoteCard({ note, onEdit, onDelete, onPin }: {
  note: Note
  onEdit: (n: Note) => void
  onDelete: (id: string) => void
  onPin: (n: Note) => void
}) {
  const colorClass = getColorClass(note.color)
  const colorAccent = getColorAccent(note.color)
  return (
    <div className={`rounded-xl border-2 p-4 flex flex-col gap-2 card-hover ${colorClass} ${colorAccent ? 'border-t-4 ' + colorAccent : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">{note.title}</h4>
        <button onClick={() => onPin(note)} className={`flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-all ${note.pinned ? 'text-amber-500 pin-bounce' : 'text-slate-400 hover:text-slate-500'}`}>
          <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
        </button>
      </div>
      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-6 flex-1">{note.content}</p>
      {note.chapter && (
        <div className="text-[10px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800/60">
            {note.chapter.subject.name} → {note.chapter.name}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
        <span className="text-[10px] text-slate-400">
          {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <div className="flex gap-1">
          <button onClick={() => onEdit(note)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(note.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
