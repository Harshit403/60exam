'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageCircle, Plus, Send, Loader2, Reply, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Discussion } from '../types'

export function DiscussionPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

  const fetchDiscussions = useCallback(async () => {
    setLoading(true)
    try { const data = await api.studentDiscussions(); setDiscussions(data.discussions || []) }
    catch (err) { console.error('Discussions fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDiscussions() }, [fetchDiscussions])

  const handleReply = async (discussionId: string) => {
    if (!replyText.trim()) return
    setReplyLoading(true)
    try {
      await api.studentCreateDiscussion({ title: '', content: replyText, parentReplyId: discussionId })
      setReplyText(''); setReplyId(null); fetchDiscussions()
    } catch (err) { console.error('Reply error:', err) }
    finally { setReplyLoading(false) }
  }

  const handleSubmit = async () => {
    if (!title || !content) return
    setFormLoading(true)
    try {
      await api.studentCreateDiscussion({ title, content })
      setTitle(''); setContent(''); setShowForm(false); fetchDiscussions()
    } catch (err) { console.error('Discussion create error:', err) }
    finally { setFormLoading(false) }
  }

  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHrs / 24)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center shadow-sm shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Discussion</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ask doubts and help your peers</p>
          </div>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setExpandedId(null) }}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 h-9 text-xs sm:text-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Ask a Doubt
        </Button>
      </div>

      {/* New Discussion Form */}
      {showForm && (
        <div className="grow-in bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Title</label>
            <input
              placeholder="What&apos;s your doubt about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-400/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Details</label>
            <textarea
              placeholder="Describe your doubt in detail..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full resize-none px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-400/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSubmit} disabled={!title || !content || formLoading}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 h-9 text-xs">
              {formLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />} Post Doubt
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="h-9 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                  <Skeleton className="h-3 w-1/3 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      // Empty state
      ) : discussions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-full bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-cyan-400 dark:text-cyan-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">No doubts posted yet</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">Click &quot;Ask a Doubt&quot; to get help from your peers</p>
        </div>
      // Discussion list
      ) : (
        <div className="space-y-2">
          {discussions.map(d => {
            const isExpanded = expandedId === d.id
            return (
              <div key={d.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-shadow hover:shadow-sm">
                {/* Main discussion */}
                <div
                  className="p-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                          {(d.student?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{d.student?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-400">{timeAgo(d.createdAt)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">{d.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{d.content}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                      {d.replies && d.replies.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 border-0 px-2 py-0.5 rounded-full">
                          {d.replies.length} {d.replies.length === 1 ? 'reply' : 'replies'}
                        </Badge>
                      )}
                      <div className="text-slate-300 dark:text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded: replies + reply input */}
                {isExpanded && (
                  <div className="grow-in border-t border-slate-100 dark:border-slate-800">
                    {/* Replies */}
                    {d.replies && d.replies.length > 0 && (
                      <div className="px-4 py-3 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30">
                        {d.replies.map(r => (
                          <div key={r.id} className="flex gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5">
                              {(r.student?.name || 'R').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{r.student?.name || 'Student'}</span>
                                <span className="text-[10px] text-slate-400">{timeAgo(r.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                      {replyId === d.id ? (
                        <div className="flex gap-2">
                          <input
                            placeholder="Write your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(d.id) } }}
                            className="flex-1 h-9 px-3 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-400/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleReply(d.id)} disabled={!replyText.trim() || replyLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3">
                            {replyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReplyId(null); setReplyText('') }} className="h-9 px-2">
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button onClick={() => setReplyId(d.id)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                          <Reply className="w-3.5 h-3.5" /> Reply
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
