'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard, CalendarDays, CalendarCheck, MessageCircle, MessageSquare, ListChecks,
  UserCog, LogOut, CheckCircle2, BookOpen, Menu, Moon, Sun, Brain, StickyNote, BarChart3, Trophy, History, BookMarked, Users, Star, Download, Clock, Play, Pause,
  Mic, Video,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { api } from '@/lib/api-client'
import { usePWAInstall } from '@/hooks/use-pwa-install'

import { StudentPanelProps, Page, DashboardData } from './types'
import { CSS_ANIMATIONS, LoadingSkeleton, formatTimer } from './utils'
import { TimerProvider, useTimer } from './TimerContext'
import {
  DashboardPage, TrackStudyPage, StudyPlannerPage, DiscussionPage, LiveChatPage, SyllabusPage, EditProfilePage,
  QuizPage, QuizHistoryPage, NotesPage, AnalyticsPage, LeaderboardPage, MaterialsPage, GroupStudyPage, ReviewsPage,
  DiscussionRoomsPage, VirtualLibrariesPage,
} from './pages'
import { NotificationBell } from './NotificationBell'
import { PwaInstallDialog } from '@/components/pwa-install-dialog'

// Every student panel page that can be deep-linked via ?page= so a refresh
// restores the exact section instead of resetting to the dashboard.
const STUDENT_PAGES: Page[] = ['dashboard', 'track', 'planner', 'discussion', 'live-chat', 'syllabus', 'profile', 'quiz', 'quiz-history', 'notes', 'analytics', 'leaderboard', 'materials', 'group-study', 'reviews', 'discussion-rooms', 'virtual-libraries']

const MOTIVATIONAL_QUOTES = [
  { text: 'The secret of success is to do the common things uncommonly well.', author: 'John D. Rockefeller' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
  { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Your limitation—it\'s only your imagination.', author: 'Unknown' },
  { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
  { text: 'Great things never come from comfort zones.', author: 'Unknown' },
  { text: 'Dream it. Wish it. Do it.', author: 'Unknown' },
  { text: 'Success doesn\'t just find you. You have to go out and get it.', author: 'Unknown' },
  { text: 'The harder you work for something, the greater you\'ll feel when you achieve it.', author: 'Unknown' },
  { text: 'Dream bigger. Do bigger.', author: 'Unknown' },
  { text: 'Don\'t stop when you\'re tired. Stop when you\'re done.', author: 'Unknown' },
  { text: 'Wake up with determination. Go to bed with satisfaction.', author: 'Unknown' },
  { text: 'Do something today that your future self will thank you for.', author: 'Unknown' },
  { text: 'Little things make big days.', author: 'Unknown' },
  { text: 'It\'s going to be hard, but hard does not mean impossible.', author: 'Unknown' },
  { text: 'Success is what happens after you\'ve survived all your mistakes.', author: 'Anora Idha' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Strive for progress, not perfection.', author: 'Unknown' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { text: 'The beautiful thing about learning is that nobody can take it away from you.', author: 'B.B. King' },
  { text: 'Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.', author: 'Richard Feynman' },
  { text: 'The more that you read, the more things you will know. The more that you learn, the more places you\'ll go.', author: 'Dr. Seuss' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'If you fell down yesterday, stand up today.', author: 'H.G. Wells' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
  { text: 'The mind is not a vessel to be filled, but a fire to be kindled.', author: 'Plutarch' },
  { text: 'Don\'t let what you cannot do interfere with what you can do.', author: 'John Wooden' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
]

// ═══════════════════════════════════════════════════════════════════════
// FLOATING MINI TIMER
// ═══════════════════════════════════════════════════════════════════════

function FloatingTimer({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const { timerRunning, timerPaused, timerSeconds, timerTotalSeconds, chapterName, screenLocked, setTimerPaused } = useTimer()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null
  const showOnPages: Page[] = ['dashboard', 'group-study', 'discussion', 'quiz', 'quiz-history', 'track', 'planner', 'notes', 'analytics', 'leaderboard', 'materials', 'reviews', 'syllabus', 'profile', 'discussion-rooms', 'virtual-libraries']
  if (!timerRunning && !timerPaused) return null
  if (currentPage === 'dashboard') return null

  const progress = timerTotalSeconds > 0 ? (timerSeconds / timerTotalSeconds) * 100 : 0
  const barColor = progress < 25 ? 'bg-red-500' : progress < 50 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <button onClick={() => onNavigate('dashboard')}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
      <div className="relative">
        <Clock className={`w-4 h-4 ${timerPaused ? 'text-amber-500' : 'text-emerald-500'} ${timerRunning && !timerPaused ? 'animate-pulse' : ''}`} />
        {screenLocked && timerRunning && !timerPaused && (
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
        )}
      </div>
      <div className="text-right">
        <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
          {formatTimer(timerSeconds)}
        </div>
        <div className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
          {timerPaused ? 'Paused' : chapterName || 'Studying'}
        </div>
      </div>
      <div className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden hidden sm:block">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
      <div onClick={(e) => { e.stopPropagation(); setTimerPaused(prev => !prev) }}
        className="ml-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors opacity-0 group-hover:opacity-100">
        {timerPaused ? <Play className="w-3 h-3 text-emerald-500" /> : <Pause className="w-3 h-3 text-amber-500" />}
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function StudentPanel({ onLogout }: StudentPanelProps) {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // Restore the section the user was on from ?page= (the panel shares one
    // URL, so without this a refresh always jumps back to the dashboard).
    if (typeof window === 'undefined') return 'dashboard'
    const p = new URLSearchParams(window.location.search).get('page')
    return p && (STUDENT_PAGES as string[]).includes(p) ? p as Page : 'dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme, setTheme } = useTheme()
  const { canInstall, install, deferredPrompt } = usePWAInstall()
  const [showInstallDialog, setShowInstallDialog] = useState(false)

  // Daily quote seeded by date (changes daily)
  const dailyQuote = useMemo(() => {
    const today = new Date()
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.studentDashboard()
      setDashboardData(data as DashboardData)
    } catch (err) { console.error('Dashboard fetch error:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Self-heal the URL on first render: after logging in from /?view=signin the
  // address still points at the login view, which would bounce the user there
  // on refresh. Normalize it to view=student&page=<current>.
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const view = url.searchParams.get('view')
      const page = url.searchParams.get('page')
      if (view !== 'student' || !page) {
        url.searchParams.set('view', 'student')
        url.searchParams.set('page', currentPage)
        window.history.replaceState({}, '', url.toString())
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard; section: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Learning' },
    { id: 'quiz', label: 'Quizzes', icon: Brain, section: 'Learning' },
    { id: 'quiz-history', label: 'Quiz History', icon: History, section: 'Learning' },
    { id: 'track', label: 'Track Study', icon: CalendarDays, section: 'Learning' },
    { id: 'planner', label: 'Study Planner', icon: CalendarCheck, section: 'Learning' },
    { id: 'notes', label: 'My Notes', icon: StickyNote, section: 'Learning' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'Learning' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, section: 'Learning' },
    { id: 'materials', label: 'Study Materials', icon: BookMarked, section: 'Learning' },
    { id: 'live-chat', label: 'Live Chat', icon: MessageSquare, section: 'Social' },
    { id: 'group-study', label: 'Group Study', icon: Users, section: 'Social' },
    { id: 'discussion', label: 'Discussion', icon: MessageCircle, section: 'Social' },
    { id: 'discussion-rooms', label: 'Discussion Room', icon: Mic, section: 'Social' },
    { id: 'virtual-libraries', label: 'Virtual Library', icon: Video, section: 'Social' },
    { id: 'reviews', label: 'Reviews', icon: Star, section: 'Social' },
    { id: 'syllabus', label: 'Syllabus', icon: ListChecks, section: 'Social' },
    { id: 'profile', label: 'Edit Profile', icon: UserCog, section: 'Account' },
  ]

  const handleNavClick = (page: Page) => {
    setCurrentPage(page); setSidebarOpen(false)
    try {
      // Keep the active section in the URL so a refresh stays on this page.
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'student')
      url.searchParams.set('page', page)
      window.history.replaceState({}, '', url.toString())
    } catch { /* ignore */ }
  }

  const SidebarContent = () => {
    const { resetTimer } = useTimer()
    // Group nav items by section
    const sections = navItems.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = []
      acc[item.section].push(item)
      return acc
    }, {} as Record<string, typeof navItems>)

    // Compute level badge from score
    const level = dashboardData ? (
      dashboardData.student.score >= 2000 ? 'Elite' :
      dashboardData.student.score >= 1000 ? 'Pro' :
      dashboardData.student.score >= 500 ? 'Rising' : 'Starter'
    ) : 'Starter'
    const levelColor = level === 'Elite' ? 'from-amber-400 to-orange-500' :
      level === 'Pro' ? 'from-violet-400 to-purple-500' :
      level === 'Rising' ? 'from-emerald-400 to-teal-500' : 'from-slate-400 to-slate-500'

    return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 dark:from-slate-100 dark:to-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/5 dark:from-slate-900/20 dark:to-slate-800/5 flex items-center justify-center flex-shrink-0 shadow-md">
            <BookOpen className="w-5 h-5 text-white dark:text-slate-900" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white dark:text-slate-900 tracking-tight">MISSION CS</h2>
            <p className="text-[10px] text-white/60 dark:text-slate-500 tracking-[0.2em]">TEST SERIES</p>
          </div>
        </div>
      </div>

      {dashboardData && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-slate-200 dark:ring-slate-700">
                <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                  {(dashboardData.student.fullName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {dashboardData.student.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{dashboardData.student.fullName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center text-[10px] font-bold text-white bg-gradient-to-r ${levelColor} px-2 py-0.5 rounded-full`}>
                  {level}
                </span>
                {dashboardData.student.currentStreak > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">
                    🔥 {dashboardData.student.currentStreak}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1.5">{section}</p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <button key={item.id} onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative active:scale-[0.98] group ${
                      isActive
                        ? 'text-white dark:text-slate-900 bg-gradient-to-r from-slate-800 to-slate-950 dark:from-slate-200 dark:to-slate-100 shadow-sm border-l-[3px] border-l-amber-400 dark:border-l-amber-500'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-0.5'
                    }`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 relative z-10 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                    <span className="relative z-10">{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 relative z-10" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-[0.98]">
          {theme === 'dark' ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button onClick={() => { resetTimer(); onLogout() }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-[0.98]">
          <LogOut className="w-4 h-4 flex-shrink-0" /> Logout
        </button>
      </div>
    </div>
    )
  }

  const renderPage = () => {
    if (loading) return <LoadingSkeleton />
    switch (currentPage) {
      case 'dashboard': return <DashboardPage data={dashboardData} onRefresh={fetchDashboard} onNavigate={handleNavClick} />
      case 'quiz': return <QuizPage />
      case 'quiz-history': return <QuizHistoryPage />
      case 'track': return <TrackStudyPage subjects={dashboardData?.subjects || []} />
      case 'planner': return <StudyPlannerPage subjects={dashboardData?.subjects || []} />
      case 'notes': return <NotesPage subjects={dashboardData?.subjects || []} />
      case 'analytics': return <AnalyticsPage />
      case 'leaderboard': return <LeaderboardPage />
      case 'materials': return <MaterialsPage />
      case 'group-study': return <GroupStudyPage />
      case 'live-chat': return <LiveChatPage />
      case 'discussion': return <DiscussionPage />
      case 'discussion-rooms': return <DiscussionRoomsPage />
      case 'virtual-libraries': return <VirtualLibrariesPage />
      case 'reviews': return <ReviewsPage />
      case 'syllabus': return <SyllabusPage />
      case 'profile': return <EditProfilePage data={dashboardData} onRefresh={fetchDashboard} />
    }
  }

  // Log student IP on mount
  useEffect(() => {
    fetch('/api/ip-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname, action: 'visit' }),
    }).catch(() => {})
  }, [])

  return (
    <TimerProvider>
      <style>{CSS_ANIMATIONS}</style>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col fixed inset-y-0 z-40">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-50 md:hidden bg-black/50 fade-in"
              onClick={() => setSidebarOpen(false)} />
            <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sidebar-slide-in">
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 md:ml-64 min-w-0">
          <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {(() => {
                  const navItem = navItems.find(n => n.id === currentPage)
                  const Icon = navItem?.icon || LayoutDashboard
                  return (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-200 dark:to-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-white dark:text-slate-900" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                          {navItem?.label || 'Dashboard'}
                        </h1>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {canInstall && (
                  <button onClick={async () => { const ok = await install(); if (!ok) setShowInstallDialog(true) }}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-medium transition-colors"
                  >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Download App</span>
                    <span className="sm:hidden">App</span>
                  </button>
                )}
                <FloatingTimer currentPage={currentPage} onNavigate={handleNavClick} />
                <NotificationBell onNavigate={(p) => handleNavClick(p as Page)} />
              </div>
            </div>
            {/* Daily motivational quote */}
            <div className="hidden sm:flex items-center gap-2 mt-1.5 px-0.5">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight italic line-clamp-1">
                &ldquo;{dailyQuote.text}&rdquo;
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">&mdash; {dailyQuote.author}</span>
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            <div key={currentPage} className="page-transition">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
      <PwaInstallDialog open={showInstallDialog} onClose={() => setShowInstallDialog(false)} deferredPrompt={deferredPrompt} />
    </TimerProvider>
  )
}

