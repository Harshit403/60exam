'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  GraduationCap, Menu, X, ChevronRight, Download,
  ChevronLeft,
} from 'lucide-react'
import { PwaInstallDialog } from '@/components/pwa-install-dialog'

interface SiteHeaderProps {
  view: string
  onNavigate: (view: string) => void
  isLoggedIn: boolean
  userRole: 'admin' | 'student' | null
}

export default function SiteHeader({ view, onNavigate, isLoggedIn, userRole }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallDialog, setShowInstallDialog] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallApp = () => {
    if (deferredPrompt) {
      setShowInstallDialog(true)
    } else {
      setShowInstallDialog(true)
    }
  }

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') setShowInstallDialog(false)
  }

  const handleNavClick = (target: string) => {
    setMobileMenuOpen(false)
    if (target === 'courses') {
      if (view === 'landing') {
        document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        onNavigate('landing')
      }
    } else {
      onNavigate(target)
    }
  }

  const pageTitle = (() => {
    switch (view) {
      case 'cs-executive': return 'CS Executive Test Series'
      case 'cs-professional': return 'CS Professional Test Series'
      case 'discussions': return 'Discussion Forum'
      case 'reviews': return 'Student Reviews'
      case 'privacy-policy': return 'Privacy Policy'
      case 'terms-conditions': return 'Terms & Conditions'
      case 'refund-policy': return 'Refund Policy'
      case 'student-login': return 'Sign In'
      case 'student-signup': return 'Sign Up'
      case 'forgot-password': return 'Forgot Password'
      default: return null
    }
  })()

  const isLanding = view === 'landing'

  const navLinks = [
    { label: 'Courses', target: 'courses' as const },
    { label: 'Reviews', target: 'reviews' as const },
    { label: 'Discussion', target: 'discussions' as const },
  ]

  return (
    <>
      <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-xl shadow-sm border-border/60' : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border'}`}>
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            {!isLanding && (
              <Button variant="ghost" size="icon" onClick={() => onNavigate('landing')} className="mr-1 hover:bg-muted/80 transition-colors duration-200">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('landing')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-foreground">MISSION CS</span>
              <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-1.5 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Test Series</Badge>
            </div>
            {pageTitle && (
              <>
                <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />
                <span className="hidden sm:inline text-sm font-medium text-muted-foreground">{pageTitle}</span>
              </>
            )}
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button key={link.label} onClick={() => handleNavClick(link.target)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-lg hover:bg-muted/80 relative">
                {link.label}
              </button>
            ))}
            <Separator orientation="vertical" className="h-5 mx-1" />
            <button onClick={() => onNavigate('cs-executive')}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-lg hover:bg-muted/80 relative">
              CS Executive
            </button>
            <button onClick={() => onNavigate('cs-professional')}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-lg hover:bg-muted/80 relative">
              CS Professional
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleInstallApp} className="hidden sm:flex hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors duration-200">
              <Download className="h-4 w-4 mr-1" />Download App
            </Button>
            {isLoggedIn ? (
              <Button size="sm" onClick={() => onNavigate(userRole === 'admin' ? 'admin' : 'student')} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-sm hover:shadow-md transition-all duration-200">
                Dashboard<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('student-login')} className="hover:bg-muted/80 transition-colors duration-200">Login</Button>
                <Button size="sm" onClick={() => onNavigate('student-signup')} className="bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 shadow-sm hover:shadow-md transition-all duration-200">Sign Up Free</Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="lg:hidden hover:bg-muted/80 transition-colors duration-200" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className={`lg:hidden border-t bg-background/95 backdrop-blur-xl overflow-hidden transition-all duration-300 ease-out ${mobileMenuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <button key={link.label} onClick={() => handleNavClick(link.target)}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-all duration-200">
                {link.label}
              </button>
            ))}
            <div className="my-2 border-t border-border/50" />
            <button onClick={() => { onNavigate('cs-executive'); setMobileMenuOpen(false) }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-foreground hover:bg-muted/60 rounded-lg transition-all duration-200">
              CS Executive Test Series
            </button>
            <button onClick={() => { onNavigate('cs-professional'); setMobileMenuOpen(false) }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-foreground hover:bg-muted/60 rounded-lg transition-all duration-200">
              CS Professional Test Series
            </button>
            <button onClick={handleInstallApp}
              className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-all duration-200">
              <Download className="h-4 w-4" />Download App
            </button>
            {!isLoggedIn && (
              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { onNavigate('student-login'); setMobileMenuOpen(false) }} className="flex-1 hover:bg-muted/80 transition-colors duration-200">
                  Sign In
                </Button>
                <Button size="sm" onClick={() => { onNavigate('student-signup'); setMobileMenuOpen(false) }} className="flex-1 bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 shadow-sm">
                  Sign Up Free
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <PwaInstallDialog open={showInstallDialog} onClose={() => setShowInstallDialog(false)} deferredPrompt={deferredPrompt} onInstall={handleNativeInstall} />
    </>
  )
}
