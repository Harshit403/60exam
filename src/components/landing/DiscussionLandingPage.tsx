'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  MessageCircle, Search, ChevronLeft, Shield, CheckCircle2,
  GraduationCap, ArrowRight, ChevronRight, Users, Clock,
  MessageSquare, TrendingUp, Filter, X,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { usePageMeta } from '@/lib/seo'

interface DiscussionReply {
  id: string
  content: string
  authorName: string
  authorVerified: boolean
  createdAt: string
}

interface DiscussionItem {
  id: string
  title: string
  content: string
  authorName: string
  authorVerified: boolean
  repliesCount: number
  hasAdminReply: boolean
  adminReply?: string | null
  replies: DiscussionReply[]
  createdAt: string
}

interface DiscussionLandingPageProps {
  onNavigate: (view: string) => void
  isLoggedIn: boolean
  userRole: 'admin' | 'student' | null
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

export default function DiscussionLandingPage({ onNavigate, isLoggedIn, userRole }: DiscussionLandingPageProps) {
  usePageMeta('discussions')
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'replied'>('recent')

  const fetchDiscussions = useCallback(async (searchTerm: string = '', pageNum: number = 1) => {
    setLoading(true)
    try {
      const data = await api.publicDiscussions({
        limit: 10,
        page: pageNum,
        search: searchTerm || undefined,
      })
      setDiscussions(data.discussions || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to fetch discussions:', err)
      setDiscussions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDiscussions(activeSearch, 1)
  }, [activeSearch, fetchDiscussions])

  const handleSearch = () => {
    setActiveSearch(search)
    setPage(1)
    setExpandedId(null)
  }

  const handleClearSearch = () => {
    setSearch('')
    setActiveSearch('')
    setPage(1)
    setExpandedId(null)
  }

  const handlePageChange = (newPage: number) => {
    fetchDiscussions(activeSearch, newPage)
    setExpandedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const sortedDiscussions = [...discussions].sort((a, b) => {
    if (sortBy === 'replied') {
      return b.repliesCount - a.repliesCount
    }
    return 0 // Already sorted by recent from API
  })

  return (
    <>
      <main className="flex-1">
        {/* Hero Banner */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50/40 dark:from-emerald-950/20 dark:via-background dark:to-amber-950/10 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative">
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">
                <MessageSquare className="w-3 h-3 mr-1" /> Community Forum
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Discussion <span className="bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">Forum</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Ask questions, share knowledge, and connect with fellow CS aspirants and experienced faculty members.
              </p>

              {/* Stats Row */}
              <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{total}</div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {discussions.filter(d => d.hasAdminReply).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Answered</div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {discussions.reduce((sum, d) => sum + d.repliesCount, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Replies</div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="max-w-xl mx-auto flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search discussions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                    className="pl-9 h-11 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border-border/60"
                  />
                  {search && (
                    <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button onClick={handleSearch} className="h-11 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-sm">
                  <Search className="h-4 w-4 mr-2" /> Search
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="border-b bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className={sortBy === 'recent' ? 'bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs' : 'h-8 text-xs'}
                >
                  <Clock className="h-3 w-3 mr-1" /> Most Recent
                </Button>
                <Button
                  variant={sortBy === 'replied' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortBy('replied')}
                  className={sortBy === 'replied' ? 'bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs' : 'h-8 text-xs'}
                >
                  <TrendingUp className="h-3 w-3 mr-1" /> Most Replied
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {activeSearch && (
                  <span className="flex items-center gap-1">
                    Results for &quot;{activeSearch}&quot;
                    <button onClick={handleClearSearch} className="text-emerald-600 hover:text-emerald-700 font-medium ml-1">Clear</button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Discussion List */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedDiscussions.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950/30 dark:to-amber-950/30 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {activeSearch ? 'No discussions found' : 'No discussions yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {activeSearch
                    ? `No results for "${activeSearch}". Try a different search term.`
                    : 'Be the first to start a discussion! Sign up to ask questions and share knowledge.'}
                </p>
                {activeSearch ? (
                  <Button variant="outline" onClick={handleClearSearch}>Clear Search</Button>
                ) : (
                  <Button onClick={() => onNavigate('student-signup')} className="bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 shadow-sm">
                    Sign Up to Discuss <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedDiscussions.map((d) => (
                <Card
                  key={d.id}
                  className="overflow-hidden hover:shadow-md transition-all duration-300 border-border/60 hover:border-emerald-200 dark:hover:border-emerald-800/50"
                >
                  <CardContent className="p-0">
                    {/* Question Section */}
                    <div className="p-5 sm:p-6">
                      <div className="flex gap-3 sm:gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-900/30 dark:to-amber-900/30 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400 ring-2 ring-background shadow-sm">
                            {(d.authorName || 'U').charAt(0).toUpperCase()}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3
                              className="text-base sm:text-lg font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors line-clamp-2"
                              onClick={() => toggleExpand(d.id)}
                            >
                              {d.title}
                            </h3>
                            {d.hasAdminReply && (
                              <Badge className="flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium border-0">
                                <Shield className="w-3 h-3 mr-1" /> Answered
                              </Badge>
                            )}
                          </div>

                          {/* Author info */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <span className="font-medium text-foreground/80">{d.authorName}</span>
                            {d.authorVerified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            <span className="text-border">•</span>
                            <Clock className="w-3 h-3" />
                            <span>{timeAgo(d.createdAt)}</span>
                          </div>

                          {/* Content preview */}
                          <p className={`text-sm text-muted-foreground leading-relaxed ${expandedId === d.id ? '' : 'line-clamp-3'}`}>
                            {d.content}
                          </p>

                          {/* Meta bar */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => toggleExpand(d.id)}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                                <span>{d.repliesCount + (d.hasAdminReply ? 1 : 0)} {(d.repliesCount + (d.hasAdminReply ? 1 : 0)) === 1 ? 'reply' : 'replies'}</span>
                              </button>
                              {(d.repliesCount > 0 || d.hasAdminReply) && (
                                <button
                                  onClick={() => toggleExpand(d.id)}
                                  className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                >
                                  {expandedId === d.id ? 'Hide replies' : 'View replies'}
                                  <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedId === d.id ? 'rotate-90' : ''}`} />
                                </button>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (isLoggedIn && userRole === 'student') {
                                  onNavigate('student')
                                } else {
                                  onNavigate('student-login')
                                }
                              }}
                              className="text-xs h-8 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            >
                              Reply <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Replies Section */}
                    {expandedId === d.id && (
                      <div className="border-t border-border/40 bg-muted/20">
                        <div className="p-5 sm:p-6 pt-4">
                          {/* Admin Reply (if exists) */}
                          {d.adminReply && (
                            <div className="mb-4 p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                                  A
                                </div>
                                <Badge className="bg-emerald-600 text-white text-[10px] h-5 border-0">
                                  <Shield className="w-2.5 h-2.5 mr-0.5" /> Admin
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">Official Reply</span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{d.adminReply}</p>
                            </div>
                          )}

                          {/* User Replies */}
                          {d.replies.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                All Replies ({d.replies.length})
                              </h4>
                              {d.replies.map((r, idx) => (
                                <div key={r.id} className="flex gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-900/40 border border-border/30">
                                  <div className="flex-shrink-0">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                      {(r.authorName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-foreground">{r.authorName}</span>
                                      {r.authorVerified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                      <span className="text-[10px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{r.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : !d.adminReply ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond!</p>
                            </div>
                          ) : null}

                          {/* Reply CTA */}
                          <div className="mt-4 pt-3 border-t border-border/30">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Have an answer or insight?</p>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (isLoggedIn && userRole === 'student') {
                                    onNavigate('student')
                                  } else {
                                    onNavigate('student-login')
                                  }
                                }}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-sm text-xs h-8"
                              >
                                {isLoggedIn ? 'Reply Now' : 'Sign In to Reply'} <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="h-9"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handlePageChange(p)}
                        className={`h-9 w-9 ${p === page ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="h-9"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* CTA Banner */}
        {!isLoggedIn && (
          <section className="border-t bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/20 dark:to-amber-950/20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
              <Users className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Join Our Community</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                Sign up to ask questions, share your knowledge, and connect with thousands of CS exam aspirants.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => onNavigate('student-signup')} className="bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 shadow-md">
                  Sign Up Free <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => onNavigate('student-login')}>
                  Sign In
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">Mission CS Test Series</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button onClick={() => onNavigate('privacy-policy')} className="hover:text-foreground transition-colors">Privacy Policy</button>
              <button onClick={() => onNavigate('terms-conditions')} className="hover:text-foreground transition-colors">Terms</button>
              <button onClick={() => onNavigate('refund-policy')} className="hover:text-foreground transition-colors">Refund Policy</button>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Mission CS. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
