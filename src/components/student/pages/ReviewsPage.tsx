'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Star, Send, Loader2, MessageCircle, CheckCircle2, XCircle, Clock, BookOpen } from 'lucide-react'

interface Review {
  id: string; authorName: string; text: string; rating: number
  course?: { id: string; title: string } | null
  source: string; status: string; createdAt: string
}

interface Course { id: string; title: string }

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])

  // Submit form
  const [text, setText] = useState('')
  const [rating, setRating] = useState('5')
  const [courseId, setCourseId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentReviews()
      setReviews(data.reviews || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  useEffect(() => {
    api.publicCourses().then(r => setCourses(r.courses || r.data || [])).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await api.studentSubmitReview({ text: text.trim(), rating: parseInt(rating), courseId: courseId || undefined })
      setSubmitted(true)
      setText(''); setRating('5'); setCourseId('')
      setTimeout(() => setSubmitted(false), 4000)
      fetchReviews()
      toast.success('Review submitted for admin approval')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review')
    } finally { setSubmitting(false) }
  }

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20"><CheckCircle2 className="size-3 mr-1" />Approved</Badge>
    if (status === 'rejected') return <Badge variant="destructive"><XCircle className="size-3 mr-1" />Rejected</Badge>
    return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20"><Clock className="size-3 mr-1" />Pending</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Reviews</h1>
        <p className="text-sm text-muted-foreground">Share your feedback and track approval status</p>
      </div>

      {/* Submit Review */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="size-4 text-amber-500" /> Write a Review</CardTitle><CardDescription>Your review will be published after admin approval</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">Thank you! Your review has been submitted and is pending admin approval.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Rating</Label>
                  <Select value={rating} onValueChange={setRating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5,4,3,2,1].map(r => (
                        <SelectItem key={r} value={String(r)}>{'★'.repeat(r)}{'☆'.repeat(5-r)} ({r} Star{r>1?'s':''})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Course (Optional)</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Your Review</Label>
                <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your experience..." rows={3} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !text.trim()}>
                {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                Submit Review
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* My Reviews List */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="size-4 text-sky-500" /> My Submitted Reviews</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full shimmer-bg rounded-lg" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <MessageCircle className="size-8 mx-auto mb-2 opacity-30" />
              No reviews yet. Share your feedback above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-muted/60 to-muted/30">
                    <TableHead>Review</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="hidden sm:table-cell">Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r, i) => (
                    <TableRow key={r.id} className={`transition-all duration-150 hover:bg-rose-500/5 ${i%2===1?'bg-muted/8':''}`}>
                      <TableCell className="max-w-[250px]">
                        <p className="text-sm truncate">{r.text}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`size-3.5 ${s<=r.rating?'fill-amber-500 text-amber-500':'text-muted-foreground/20'}`} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{r.course?.title||'—'}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
