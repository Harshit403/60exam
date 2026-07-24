'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Star, GraduationCap, MessageCircle, ArrowRight,
  ChevronRight, Users, Quote,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { usePageMeta } from '@/lib/seo'

interface Review {
  id: string
  authorName: string
  text: string
  rating: number
  course?: { title: string } | null
  createdAt: string
}

interface ReviewsLandingPageProps {
  onNavigate: (view: string) => void
  isLoggedIn: boolean
  userRole: 'admin' | 'student' | null
}

export default function ReviewsLandingPage({ onNavigate, isLoggedIn, userRole }: ReviewsLandingPageProps) {
  usePageMeta('reviews')
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const perPage = 9

  useEffect(() => {
    setLoading(true)
    api.publicReviews().then(data => {
      setReviews(data.reviews || [])
    }).catch(() => {
      setReviews([])
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  const totalPages = Math.ceil(reviews.length / perPage)
  const paginated = reviews.slice(0, page * perPage)
  const hasMore = page < totalPages

  const loadMore = () => {
    setPage(p => p + 1)
  }

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
                <Quote className="w-3 h-3 mr-1" /> Student Testimonials
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Student <span className="bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">Reviews</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Read what our students have to say about their experience with Mission CS Test Series.
              </p>

              {/* Stats Row */}
              <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{reviews.length}</div>
                  <div className="text-xs text-muted-foreground">Total Reviews</div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {reviews.length > 0
                      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
                      : '0.0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Rating</div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{reviews.filter(r => r.rating === 5).length}</div>
                  <div className="text-xs text-muted-foreground">5-Star Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="rounded-xl"><CardContent className="pt-6">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent></Card>
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950/30 dark:to-amber-950/30 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Be the first to share your experience! Sign up to submit a review.
                </p>
                <Button onClick={() => onNavigate('student-signup')} className="bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 shadow-sm">
                  Sign Up to Review <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginated.map((review, idx) => (
                  <div key={review.id} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    <Card className="h-full hover:shadow-xl transition-all duration-300 backdrop-blur-md bg-white/70 dark:bg-slate-900/60 border-white/20 dark:border-white/10 group rounded-xl relative overflow-hidden hover:-translate-y-1">
                      <CardContent className="pt-6">
                        <div className="absolute top-3 right-4 text-6xl font-serif text-emerald-200/30 dark:text-emerald-800/20 leading-none select-none pointer-events-none">&ldquo;</div>
                        <div className="flex items-center gap-0.5 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 transition-colors duration-200 ${i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/20'}`} />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4 relative z-10 line-clamp-4">&ldquo;{review.text}&rdquo;</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-amber-400 flex items-center justify-center ring-2 ring-white/20 shadow-sm">
                              <span className="text-xs font-bold text-white">{(review.authorName || 'U').charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium text-foreground">{review.authorName}</span>
                          </div>
                          {review.course && <Badge variant="outline" className="text-[10px] border-emerald-200/50 dark:border-emerald-800/30">{review.course.title}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center mt-10">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-300 group px-8"
                  >
                    Load More Reviews
                    <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </Button>
                </div>
              )}

              {!hasMore && reviews.length > perPage && (
                <p className="text-center text-sm text-muted-foreground mt-8">
                  Showing all {reviews.length} reviews
                </p>
              )}
            </>
          )}
        </section>

        {/* CTA Banner */}
        {!isLoggedIn && (
          <section className="border-t bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/20 dark:to-amber-950/20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
              <Users className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Share Your Experience</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                Join thousands of CS aspirants and help others make informed decisions about their preparation journey.
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
