'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  BookOpen, Trophy, Clock, Users, Star, ChevronRight, GraduationCap,
  Target, CheckCircle2, ArrowRight, Download, ExternalLink, MessageCircle,
  Shield, Award, TrendingUp, FileText, Menu, X, Send, Zap, BarChart3,
  BookMarked, Calculator, Briefcase, Gavel, Heart, Instagram, Youtube,
  Linkedin, Phone, Mail, MapPin, ChevronUp, CircleDot, XIcon, CheckIcon,
  Crown, Medal, Flame,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { usePageMeta } from '@/lib/seo'
import { toast } from 'sonner'

const SITE_URL = 'https://missioncstestseries.com'

interface LandingPageProps {
  onNavigate: (view: string) => void
  isLoggedIn: boolean
  userRole: 'admin' | 'student' | null
}

interface Review {
  id: string
  authorName: string
  text: string
  rating: number
  course?: { title: string } | null
  courseId?: string | null
  createdAt: string
}

interface Stats {
  totalStudents: number
  totalCourses: number
  totalSubjects: number
  totalChapters: number
  communitySize: string
  topRanks: string
  evaluationHours: string
}

interface CourseData {
  id: string
  title: string
  slug: string
  subjects: { name: string; chapters: { name: string }[] }[]
  _count: { students: number }
}

// Animated counter hook using IntersectionObserver (no framer-motion)
function useAnimatedCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !hasStarted) setHasStarted(true) },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(end)
    }
    requestAnimationFrame(step)
  }, [end, duration, hasStarted])

  return { count, ref }
}

// Fade-in on scroll hook using IntersectionObserver
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

export default function LandingPage({ onNavigate, isLoggedIn, userRole }: LandingPageProps) {
  usePageMeta('landing')
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [courses, setCourses] = useState<CourseData[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [reviewForm, setReviewForm] = useState({ text: '', rating: '5', courseId: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [discussions, setDiscussions] = useState<any[]>([])
  const [scrolled, setScrolled] = useState(false)

  const coursesRef = useRef<HTMLElement>(null)
  const reviewsRef = useRef<HTMLElement>(null)
  const discussionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [reviewsData, statsData, coursesData, leaderboardData, discussionsData] = await Promise.all([
          api.publicReviews(), api.publicStats(), api.publicCourses(),
          api.publicLeaderboard({ daily: true }).catch(() => ({ leaderboard: [] })),
          api.publicDiscussions({ limit: 4 }).catch(() => ({ discussions: [] })),
        ])
        setReviews(reviewsData.reviews || [])
        setStats(statsData)
        setCourses(coursesData.courses || [])
        setLeaderboard(leaderboardData.leaderboard || [])
        setLeaderboardLoading(false)
        setDiscussions(discussionsData.discussions || [])
      } catch (err) {
        console.error('Failed to fetch landing data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 400)
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleInstallApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null))
    } else {
      toast('Open this site in Chrome/Edge and use the address bar install button, or on iOS use Share → Add to Home Screen')
    }
  }

  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileMenuOpen(false)
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const handleSubmitReview = async () => {
    if (!isLoggedIn || userRole !== 'student' || !reviewForm.text.trim()) return
    setSubmittingReview(true)
    try {
      await api.studentSubmitReview({
        text: reviewForm.text, rating: parseInt(reviewForm.rating),
        courseId: reviewForm.courseId || undefined,
      })
      setReviewSubmitted(true)
      setReviewForm({ text: '', rating: '5', courseId: '' })
      setTimeout(() => setReviewSubmitted(false), 4000)
    } catch (err) {
      console.error('Failed to submit review:', err)
    } finally {
      setSubmittingReview(false)
    }
  }

  const navLinks = [
    { label: 'Courses', ref: coursesRef },
    { label: 'Reviews', page: 'reviews' as const },
    { label: 'Discussion', ref: discussionRef, page: 'discussions' as const },
  ]

  const marqueeReviews = reviews.length > 0 ? reviews : [
    { id: '1', authorName: 'Priya Sharma', text: 'Mission CS Test Series helped me secure AIR 12 in CS Executive. The evaluation quality is unmatched!', rating: 5, course: { title: 'CS Executive' }, createdAt: '' },
    { id: '2', authorName: 'Rahul Verma', text: 'Best test series for CSEET preparation. Detailed feedback on every answer helped me improve tremendously.', rating: 5, course: { title: 'CSEET' }, createdAt: '' },
    { id: '3', authorName: 'Anjali Gupta', text: 'The 24-hour evaluation turnaround is real! I always got my checked papers on time with constructive feedback.', rating: 5, course: { title: 'CS Professional' }, createdAt: '' },
    { id: '4', authorName: 'Vikram Singh', text: 'I cleared all three levels with Mission CS. Their structured approach to answer writing is exceptional.', rating: 5, course: { title: 'CS Executive' }, createdAt: '' },
    { id: '5', authorName: 'Neha Agarwal', text: 'The mock tests are very close to actual ICSI exam pattern. Highly recommended for every CS aspirant!', rating: 5, course: { title: 'CSEET' }, createdAt: '' },
    { id: '6', authorName: 'Karan Patel', text: 'Faculty feedback changed my writing style completely. Now I know exactly how to present answers in exams.', rating: 5, course: { title: 'CS Professional' }, createdAt: '' },
  ]

  const communityCounter = useAnimatedCounter(20, 2000)
  const ranksCounter = useAnimatedCounter(8, 1500)
  const hoursCounter = useAnimatedCounter(24, 1200)
  const studentsCounter = useAnimatedCounter(20000, 2500)

  const courseTabs = [
    {
      value: 'cseet', label: 'CSEET', icon: <BookOpen className="h-4 w-4" />, badge: 'CSEET',
      title: 'CSEET Test Series',
      description: 'The Company Secretary Executive Entrance Test (CSEET) is the gateway to the Company Secretary course. Our CSEET test series is meticulously designed to help you clear this entrance examination with confidence and a strong foundation.',
      features: [
        'Business Communication — Master professional correspondence, letter writing, and presentation skills',
        'Legal Aptitude & Logical Reasoning — Build strong analytical thinking and legal interpretation abilities',
        'Economic & Business Environment — Understand macroeconomics, financial markets, and business dynamics',
        'Current Affairs — Stay updated with the latest national and international developments',
      ],
      seoText: 'The CSEET examination tests your foundational understanding of business, law, and communication. Unlike traditional examinations, CSEET evaluates your analytical skills through objective-type questions and viva-voce components. Mission CS CSEET Test Series prepares you for both components with equal rigor. Our mock tests replicate the actual CSEET pattern, including the computer-based test format and the presentation and communication skills assessment. Each test is followed by comprehensive performance analysis that helps you identify your strengths and areas needing improvement.',
      examPattern: [
        { subject: 'Business Communication', marks: '50 Marks' },
        { subject: 'Legal Aptitude & Logical Reasoning', marks: '50 Marks' },
        { subject: 'Economic & Business Environment', marks: '50 Marks' },
        { subject: 'Current Affairs', marks: '20 Marks' },
        { subject: 'Presentation & Communication', marks: '30 Marks' },
        { subject: 'Total', marks: '200 Marks', bold: true },
      ],
      seriesFeatures: [
        '10+ Full-length mock tests per session', 'Subject-wise practice tests for targeted preparation',
        'Viva-voce practice sessions with feedback', 'Current affairs weekly updates and tests',
        'Detailed performance analytics and improvement tips',
      ],
      ctaText: 'Start CSEET Preparation',
    },
    {
      value: 'executive', label: 'CS Executive', icon: <Briefcase className="h-4 w-4" />, badge: 'CS Executive',
      title: 'CS Executive Test Series',
      description: 'The CS Executive programme is the second level of the Company Secretary course, consisting of seven papers that test your knowledge of corporate law, accounting, securities regulation, and strategic management. Our Executive test series is designed to help you master each paper with focused preparation.',
      features: [
        'Company Law & Practice — In-depth coverage of Companies Act 2013, rules, and landmark case laws',
        'Jurisprudence & General Laws — Constitutional law, administrative law, and interpretation of statutes',
        'Corporate & Management Accounting — From balance sheets to ratio analysis and cost accounting',
        'Securities Law & Capital Markets — SEBI regulations, stock exchange operations, and investor protection',
      ],
      seoText: 'The CS Executive examination demands a thorough understanding of legal provisions combined with the ability to present answers in a structured, logical manner. Unlike CSEET, the Executive level features descriptive questions where your answer-writing skills play a crucial role. Mission CS Executive Test Series trains you specifically for this challenge. Our mock tests are designed to replicate the exact ICSI examination pattern, including the three-hour time constraint and the marking scheme. Each evaluated paper comes with comprehensive feedback highlighting the legal provisions you cited correctly, the case laws you could have referenced, and the structural improvements your answers need.',
      examPattern: [
        { subject: 'Jurisprudence, Interpretation & General Laws', marks: '100 Marks' },
        { subject: 'Company Law', marks: '100 Marks' },
        { subject: 'Setting Up of Business Entities', marks: '100 Marks' },
        { subject: 'Corporate & Management Accounting', marks: '100 Marks' },
        { subject: 'Securities Law & Capital Markets', marks: '100 Marks' },
        { subject: 'Economic, Business & Commercial Laws', marks: '100 Marks' },
        { subject: 'Financial & Strategic Management', marks: '100 Marks' },
        { subject: 'Total (7 Papers)', marks: '700 Marks', bold: true },
      ],
      seriesFeatures: [
        'Paper-wise mock tests with ICSI pattern alignment', 'Descriptive answer evaluation with line-by-line feedback',
        'Model answers with case law references', 'Chapter-wise tests for granular preparation',
        'Comparative performance analysis with toppers',
      ],
      ctaText: 'Start Executive Preparation',
    },
    {
      value: 'professional', label: 'CS Professional', icon: <Gavel className="h-4 w-4" />, badge: 'CS Professional',
      title: 'CS Professional Test Series',
      description: 'The CS Professional programme is the final and most challenging level of the Company Secretary course. With nine papers covering advanced corporate law, governance, and practice, our Professional test series provides the rigorous preparation needed to clear this decisive examination.',
      features: [
        'Governance, Risk Management & Compliances — Master board dynamics, risk frameworks, and compliance management',
        'Advanced Company Law & Practice — Deep dive into corporate restructuring, insolvency, and cross-border mergers',
        'Secretarial Audit & Due Diligence — Learn the art of comprehensive audit and compliance verification',
        'Corporate Funding & Listings — Understand IPO processes, debt instruments, and listing obligations',
      ],
      seoText: 'The CS Professional examination tests your ability to handle complex, multi-faceted legal scenarios that a practicing Company Secretary encounters daily. Questions often require you to analyze a situation from multiple legal angles — combining provisions from the Companies Act, SEBI regulations, FEMA, and other statutes — and present a comprehensive, well-reasoned answer. Mission CS Professional Test Series is specifically designed to develop this multi-dimensional analytical thinking.',
      examPattern: [
        { subject: 'Governance, Risk Management & Compliances', marks: '100 Marks' },
        { subject: 'Advanced Company Law & Practice', marks: '100 Marks' },
        { subject: 'Secretarial Audit & Due Diligence', marks: '100 Marks' },
        { subject: 'Corporate Funding & Listings', marks: '100 Marks' },
        { subject: 'Multi-Disciplinary Case Studies', marks: '100 Marks' },
        { subject: 'Elective Paper (Choose 1)', marks: '100 Marks' },
        { subject: 'Total (9 Papers)', marks: '900 Marks', bold: true },
      ],
      seriesFeatures: [
        'Advanced scenario-based questions with multi-law coverage', 'Case study practice with professional evaluation',
        'Rank-oriented feedback with improvement strategies', 'Multi-disciplinary case study workshops',
        'Elective paper specialized tests',
      ],
      ctaText: 'Start Professional Preparation',
    },
  ]

  const faqItems = [
    { question: 'What is CSEET and who is eligible to appear for it?', answer: 'CSEET (Company Secretary Executive Entrance Test) is the entrance examination for the Company Secretary course conducted by ICSI. Candidates who have passed or are appearing in 10+2 (any stream) are eligible. It is held four times a year — January, May, July, and November — in computer-based mode.' },
    { question: 'How is the CS Executive examination structured?', answer: 'CS Executive consists of 7 papers divided into two modules. Module 1 includes Jurisprudence, Interpretation & General Laws; Company Law; and Setting Up of Business Entities & Closure. Module 2 includes Corporate & Management Accounting; Securities Law & Capital Markets; Economic, Business & Commercial Laws; and Financial & Strategic Management. Each paper carries 100 marks, totaling 700 marks. The qualifying marks are 40% in each paper and 50% aggregate per module.' },
    { question: 'What are the subjects in CS Professional programme?', answer: 'CS Professional has 9 papers across 3 modules. Module 1: Governance, Risk Management & Compliances; Advanced Company Law & Practice; and Secretarial Audit, Due Diligence & Compliance Management. Module 2: Corporate Funding & Listings; Corporate Restructuring, Insolvency & Liquidation; and Resolution of Corporate Disputes. Module 3: Multi-Disciplinary Case Studies plus two elective papers from 5 options.' },
    { question: 'How does Mission CS Test Series help in CS exam preparation?', answer: 'Mission CS provides ICSI-pattern aligned mock tests, expert faculty evaluation within 24 working hours, detailed feedback with model answers, performance analytics to track progress, and a community of 20,000+ aspirants. Our test series simulates real exam conditions and trains you specifically in answer-writing skills that ICSI examiners look for.' },
    { question: 'What makes Mission CS evaluation different from other test series?', answer: 'Our evaluation is conducted by qualified Company Secretaries and experienced educators, not automated systems. Each answer receives line-by-line annotations highlighting correct legal provisions, missed case laws, structural improvements, and alternative approaches. We provide model answers demonstrating ideal content and presentation.' },
    { question: 'Can I attempt the CS Executive exam without clearing CSEET?', answer: 'No, clearing CSEET is mandatory to register for CS Executive. However, certain categories are exempt — candidates who have passed CA Final or CMA Final can directly register. Additionally, those with a post-graduate degree in any discipline (other than Fine Arts) are also exempt.' },
    { question: 'How many times can I attempt CS Executive and Professional exams?', answer: 'There is no limit on attempts. However, your registration is valid for 5 years for both Executive and Professional, which can be renewed. Each registration period allows you to appear for multiple exam sessions held in June and December each year.' },
    { question: 'What is the passing criteria for CS examinations?', answer: 'For CSEET, you need 40% in each paper and 50% aggregate overall. For CS Executive and Professional, the qualifying marks are 40% in each individual paper and 50% aggregate in each module. Papers you have already cleared are credited for subsequent attempts.' },
    { question: 'Does Mission CS offer chapter-wise tests or only full mock tests?', answer: 'Mission CS offers both! Our test series includes chapter-wise tests for granular preparation, subject-wise tests for focused practice, and full-length mock tests that replicate the complete exam experience. This layered approach ensures comprehensive syllabus coverage.' },
    { question: 'How do I enroll in Mission CS Test Series?', answer: 'Enrolling is simple — create a free account, choose your course (CSEET, CS Executive, or CS Professional), and start attempting tests immediately. Visit missioncstestseries.com for additional enrollment options and the complete test schedule.' },
  ]

  const comparisonFeatures = [
    { feature: 'Expert Faculty Evaluation', missionCS: true, others: false },
    { feature: '24-Hour Evaluation Turnaround', missionCS: true, others: false },
    { feature: 'Line-by-Line Answer Feedback', missionCS: true, others: false },
    { feature: 'Model Answers with Case Laws', missionCS: true, others: false },
    { feature: 'ICSI Pattern-Aligned Tests', missionCS: true, others: 'partial' as const },
    { feature: 'Performance Analytics Dashboard', missionCS: true, others: 'partial' as const },
    { feature: 'Chapter-wise + Full Mock Tests', missionCS: true, others: 'partial' as const },
    { feature: 'Community of 20,000+ Aspirants', missionCS: true, others: false },
    { feature: 'Viva-Voce Practice (CSEET)', missionCS: true, others: false },
    { feature: 'Multi-Disciplinary Case Studies', missionCS: true, others: false },
    { feature: 'Affordable Pricing', missionCS: true, others: 'partial' as const },
    { feature: 'Proven AIR Results (AIR 8 & 9)', missionCS: true, others: false },
  ]

  const howItWorksSteps = [
    { step: 1, icon: <BookMarked className="h-6 w-6" />, title: 'Choose Your Course', desc: 'Select from CSEET, CS Executive, or CS Professional test series based on your current level.' },
    { step: 2, icon: <FileText className="h-6 w-6" />, title: 'Take Mock Tests', desc: 'Attempt professionally designed mock tests that mirror the actual ICSI examination pattern.' },
    { step: 3, icon: <BarChart3 className="h-6 w-6" />, title: 'Get Expert Feedback', desc: 'Receive detailed, personalized evaluations from experienced CS faculty within 24 working hours.' },
    { step: 4, icon: <TrendingUp className="h-6 w-6" />, title: 'Improve & Succeed', desc: 'Apply feedback, track progress, and systematically improve your answer writing skills to clear exams.' },
  ]

  const whyChooseFeatures = [
    { icon: <Shield className="h-6 w-6" />, title: 'ICSI-Aligned Curriculum', desc: 'Every test paper is meticulously aligned with the latest ICSI syllabus and examination pattern. We update our question bank regularly to reflect changes in laws, regulations, and examination trends.' },
    { icon: <Award className="h-6 w-6" />, title: 'Expert Faculty Evaluation', desc: 'Our evaluation team comprises qualified Company Secretaries and experienced educators who understand exactly what ICSI examiners look for. Each answer is evaluated for content accuracy, presentation style, and legal reasoning.' },
    { icon: <Zap className="h-6 w-6" />, title: '24-Hour Evaluation Turnaround', desc: 'We pride ourselves on the fastest evaluation turnaround in the industry. Receive your evaluated papers within 24 working hours, complete with detailed annotations, suggestions, and model answers.' },
    { icon: <Target className="h-6 w-6" />, title: 'Performance Analytics & Tracking', desc: 'Our advanced tracking system monitors your progress across subjects, chapters, and test attempts. Identify weak areas, track improvement trends, and optimize your preparation strategy.' },
    { icon: <Users className="h-6 w-6" />, title: 'Community of 20,000+ Aspirants', desc: 'Join a thriving community of CS aspirants across India. Engage in discussions, share strategies, and learn from peers who are on the same journey. Our forums are actively moderated by faculty.' },
    { icon: <Trophy className="h-6 w-6" />, title: 'Proven Track Record of Results', desc: 'Our students consistently achieve top ranks in CS examinations. With AIR 8 and AIR 9 achieved recently, Mission CS has established itself as the most result-oriented test series platform.' },
  ]

  // Fade-in wrapper component
  const FadeIn = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
    const { ref, visible } = useFadeIn()
    return (
      <div
        ref={ref}
        className={`${className} transition-all duration-500 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {children}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // JSON-LD structured data: 3 Courses, FAQPage, and a Service carrying an
  // AggregateRating plus Review items. Built from the page's own static
  // content and the live reviews (with a deterministic fallback) so the
  // markup is always populated and never causes hydration mismatches.
  // JSON-LD structured data is rendered server-side in layout.tsx for better SEO
  // and to reduce client-side bundle size.

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ============ HEADER ============ */}
      <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-xl shadow-sm border-border/60' : 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border'}`}>
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">MISSION CS</span>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-1.5 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Test Series</Badge>
          </div>
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button key={link.label} onClick={() => link.page ? onNavigate(link.page) : scrollToSection(link.ref)}
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
            <Button variant="outline" size="sm" onClick={handleInstallApp} className="hidden sm:flex hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors duration-200">
              <Download className="h-4 w-4 mr-1" />Download App
            </Button>
            {isLoggedIn ? (
              <Button size="sm" onClick={() => onNavigate(userRole === 'admin' ? 'admin' : 'student')} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-sm hover:shadow-md transition-all duration-200">
                Dashboard<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={() => onNavigate('student-login')} className="hidden sm:flex hover:bg-muted/80 transition-colors duration-200">Login</Button>
                <Button size="sm" onClick={() => onNavigate('student-signup')} className="bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 shadow-sm hover:shadow-md transition-all duration-200">Sign Up Free</Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="lg:hidden hover:bg-muted/80 transition-colors duration-200" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav - CSS transition */}
        <div className={`lg:hidden border-t bg-background/95 backdrop-blur-xl overflow-hidden transition-all duration-300 ease-out ${mobileMenuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <button key={link.label} onClick={() => link.page ? onNavigate(link.page) : scrollToSection(link.ref)}
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

      <main className="flex-1">
        {/* ============ HERO SECTION ============ */}
        <section className="relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-emerald-50/40 to-amber-50/30 dark:from-slate-950 dark:via-emerald-950/20 dark:to-amber-950/10 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none animate-gradient-shift" style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(217,119,6,0.05) 0%, transparent 50%)',
          }} />
          {/* Dot pattern overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

          {/* Floating decorative elements */}
          <div className="absolute top-16 left-[8%] w-20 h-20 rounded-full bg-emerald-200/25 dark:bg-emerald-800/15 blur-2xl pointer-events-none animate-float-slow" />
          <div className="absolute top-28 right-[12%] w-24 h-24 rounded-full bg-amber-200/25 dark:bg-amber-800/15 blur-2xl pointer-events-none animate-float-medium" />
          <div className="absolute bottom-24 left-[18%] w-16 h-16 rounded-full bg-rose-200/20 dark:bg-rose-800/10 blur-xl pointer-events-none animate-float-fast" />
          <div className="absolute bottom-40 right-[8%] w-14 h-14 rounded-lg bg-emerald-300/15 dark:bg-emerald-800/10 blur-xl pointer-events-none animate-float-medium rotate-45" />
          <div className="absolute top-1/2 left-[5%] w-3 h-3 rounded-full bg-emerald-400/30 dark:bg-emerald-600/30 pointer-events-none animate-pulse-dot" />
          <div className="absolute top-1/3 right-[6%] w-2 h-2 rounded-full bg-amber-400/30 dark:bg-amber-600/30 pointer-events-none animate-pulse-dot" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-[30%] w-2.5 h-2.5 rounded-full bg-rose-400/20 dark:bg-rose-600/20 pointer-events-none animate-pulse-dot" style={{ animationDelay: '2s' }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
            <div className="text-center max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <Badge variant="secondary" className="mb-6 text-xs font-medium px-4 py-1.5 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
                <Star className="h-3.5 w-3.5 mr-1.5 fill-amber-500 text-amber-500" />
                Trusted by 20,000+ CS Aspirants Across India
              </Badge>
            </div>
            <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Study Smarter. Stay Focused. Stay Ahead<br />
              <span className="bg-gradient-to-r from-slate-900 via-emerald-700 to-amber-600 dark:via-emerald-400 dark:to-amber-400 bg-clip-text text-transparent animate-gradient-text bg-[length:200%_auto]">
                with Mission CS
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              Exam60 Studio helps you plan smarter, build consistent study habits, track your progress, and stay focused with powerful productivity tools designed to keep you ahead of the competition.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Button size="lg" onClick={() => onNavigate('student-signup')} className="text-base px-8 py-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl shadow-emerald-900/20 hover:shadow-emerald-900/30 transition-all duration-300 hover:-translate-y-0.5 group">
                Start Preparing<ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('reviews')} className="text-base px-8 py-6 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-300 hover:-translate-y-0.5">
                View Reviews<Star className="h-4 w-4 ml-2 fill-amber-500 text-amber-500" />
              </Button>
            </div>

            {/* Animated stats counters under hero CTA */}
            <div className="mt-14 flex flex-wrap justify-center gap-8 sm:gap-12 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              {[
                { icon: <Users className="h-5 w-5" />, counter: communityCounter, suffix: 'K+', label: 'Students', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/50 dark:border-emerald-800/30' },
                { icon: <Trophy className="h-5 w-5" />, counter: ranksCounter, prefix: 'AIR ', suffix: '', label: 'Top Ranks', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/50 dark:border-amber-800/30' },
                { icon: <Clock className="h-5 w-5" />, counter: hoursCounter, suffix: 'hr', label: 'Evaluation', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200/50 dark:border-rose-800/30' },
              ].map((item, idx) => (
                <div key={item.label} className="flex flex-col items-center gap-2 animate-float-item" style={{ animationDelay: `${idx * 300}ms` }}>
                  <div className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl ${item.bg} border ${item.border} shadow-sm`}>
                    <span className={item.color}>{item.icon}</span>
                    <span className="text-2xl font-bold text-foreground">
                      {item.prefix || ''}<span ref={item.counter.ref}>{item.counter.count}</span>{item.suffix}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scrolling Marquee of Reviews */}
          <div className="relative border-y bg-muted/30 py-4 overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
              {[...marqueeReviews, ...marqueeReviews].map((review, idx) => (
                <div key={`${review.id}-${idx}`} className="inline-flex items-center gap-3 mx-6 shrink-0">
                  <div className="flex items-center gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xs truncate">&ldquo;{review.text}&rdquo;</p>
                  <span className="text-sm font-medium text-foreground">— {review.authorName}</span>
                  {review.course && <Badge variant="outline" className="text-[10px] shrink-0">{review.course.title}</Badge>}
                </div>
              ))}
            </div>
          </div>

          {/* Review Submission Form for Students */}
          {isLoggedIn && userRole === 'student' && (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />Share Your Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviewSubmitted ? (
                    <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">Thank you! Your review has been submitted and is pending admin approval.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Rating</label>
                          <Select value={reviewForm.rating} onValueChange={(v) => setReviewForm({ ...reviewForm, rating: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 Stars - Excellent</SelectItem>
                              <SelectItem value="4">4 Stars - Very Good</SelectItem>
                              <SelectItem value="3">3 Stars - Good</SelectItem>
                              <SelectItem value="2">2 Stars - Fair</SelectItem>
                              <SelectItem value="1">1 Star - Poor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Course (Optional)</label>
                          <Select value={reviewForm.courseId} onValueChange={(v) => setReviewForm({ ...reviewForm, courseId: v })}>
                            <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                            <SelectContent>
                              {courses.map((c) => (<SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Your Review</label>
                        <Textarea value={reviewForm.text} onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                          placeholder="Share your experience with Mission CS Test Series..." rows={3} />
                      </div>
                      <Button onClick={handleSubmitReview} disabled={submittingReview || !reviewForm.text.trim()}>
                        <Send className="h-4 w-4 mr-2" />{submittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* ============ FEATURE CARD ============ */}
        <section className="py-16 sm:py-20 bg-muted/30 relative overflow-hidden">
          {/* Subtle mesh gradient background */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(217,119,6,0.03) 0%, transparent 50%)',
          }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <FadeIn>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Your Complete CS Test Series Platform</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Mission CS Test Series is designed specifically for Company Secretary aspirants who demand excellence. Our platform provides structured mock tests, expert evaluations, and a community that drives results.
                </p>
              </FadeIn>
            </div>
            <FadeIn delay={200}>
              <Card className="max-w-3xl mx-auto relative overflow-hidden group hover:shadow-xl transition-all duration-500 rounded-2xl">
                {/* Gradient border effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-[1px] rounded-2xl bg-background" />
                <div className="relative">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="h-8 w-8 text-foreground" />
                    </div>
                    <CardTitle className="text-2xl">CS Test Series</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-6">
                    <p className="text-muted-foreground leading-relaxed">
                      Join thousands of successful Company Secretary professionals who started their journey with Mission CS. Our meticulously crafted test series covers every aspect of the ICSI curriculum — from CSEET to CS Professional. Each test is evaluated by experienced faculty members who understand the ICSI examination pattern inside out, providing you with actionable feedback that transforms your preparation strategy.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button size="lg" asChild className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg transition-all duration-300">
                        <a href="https://missioncstestseries.com" target="_blank" rel="noopener noreferrer">
                          Enroll Now<ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                      <Button size="lg" variant="outline" asChild className="hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-300">
                        <a href="https://missioncstestseries.com/cstestseriesschedule" target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />Download Schedule
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </FadeIn>
          </div>
        </section>

        {/* ============ STATS SECTION ============ */}
        <section className="py-16 sm:py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.02) 0%, transparent 70%)',
          }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                { icon: <Users className="h-7 w-7 text-emerald-600" />, counter: communityCounter, suffix: 'k+', label: 'Students Community', sublabel: 'Across all CS levels', bgClass: 'bg-emerald-100 dark:bg-emerald-950/30', gradientFrom: 'from-emerald-500/20', accentColor: 'emerald' },
                { icon: <Trophy className="h-7 w-7 text-amber-600" />, counter: ranksCounter, suffix: '', label: 'All India Ranks', sublabel: 'Recently Achieved', bgClass: 'bg-amber-100 dark:bg-amber-950/30', gradientFrom: 'from-amber-500/20', accentColor: 'amber', prefix: 'AIR ' },
                { icon: <Clock className="h-7 w-7 text-rose-600" />, counter: hoursCounter, suffix: '', label: 'Working Hours Evaluation', sublabel: 'Fastest in the industry', bgClass: 'bg-rose-100 dark:bg-rose-950/30', gradientFrom: 'from-rose-500/20', accentColor: 'rose' },
              ].map((stat, statIdx) => (
                <div key={stat.label} className="transition-transform hover:scale-[1.03] duration-300">
                  <Card className="text-center border-0 bg-gradient-to-b relative overflow-hidden group cursor-default rounded-2xl">
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradientFrom} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="absolute inset-[1px] rounded-2xl bg-background" />
                    <CardContent className="relative pt-8 pb-8">
                      <div className={`mx-auto w-14 h-14 rounded-2xl ${stat.bgClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 animate-icon-pulse`}>
                        {stat.icon}
                      </div>
                      <p className="text-4xl font-bold text-foreground">
                        {'prefix' in stat && stat.prefix ? stat.prefix : ''}
                        <span ref={stat.counter.ref}>{stat.counter.count}</span>{stat.suffix}
                      </p>
                      <p className="mt-2 text-muted-foreground font-medium">{stat.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{stat.sublabel}</p>
                      {/* Subtle separator */}
                      {statIdx < 2 && (
                        <div className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 w-px h-12 bg-gradient-to-b from-transparent via-border to-transparent" />
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="py-16 sm:py-20 bg-muted/30 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Simple Process</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How It Works</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Getting started with Mission CS Test Series is straightforward. Follow these simple steps and begin your transformation today.
                </p>
              </FadeIn>
            </div>
            <div className="relative">
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-300/30 dark:via-emerald-700/30 to-transparent -translate-y-1/2 z-0" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {howItWorksSteps.map((item, idx) => (
                  <FadeIn key={item.step} delay={idx * 150}>
                    <Card className="relative overflow-hidden h-full group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-xl border-transparent hover:border-emerald-200/50 dark:hover:border-emerald-800/30">
                      <CardContent className="pt-8 pb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center mb-4 text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform duration-300">{item.step}</div>
                        <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center mb-4 text-foreground group-hover:bg-foreground/10 transition-colors duration-300">{item.icon}</div>
                        <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                        {idx < 3 && (
                          <div className="sm:hidden flex justify-center mt-4">
                            <ArrowRight className="h-5 w-5 text-muted-foreground/40 rotate-90" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ WHY CHOOSE MISSION CS ============ */}
        <section className="py-16 sm:py-20 relative overflow-hidden">
          {/* Background mesh gradient */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 10% 20%, rgba(16,185,129,0.04) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(217,119,6,0.03) 0%, transparent 50%)',
          }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Our Advantages</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Why Choose Mission CS?</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Mission CS is not just another test series — it is a complete preparation ecosystem designed to transform CS aspirants into qualified Company Secretaries.
                </p>
              </FadeIn>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {whyChooseFeatures.map((feature, idx) => (
                <FadeIn key={feature.title} delay={idx * 100}>
                  <Card className="group hover:shadow-xl transition-all duration-300 h-full backdrop-blur-sm bg-white/60 dark:bg-white/5 border-white/20 dark:border-white/10 hover:-translate-y-2 rounded-xl relative overflow-hidden">
                    {/* Gradient border on hover */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[1px] rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm" />
                    <CardContent className="relative pt-8 pb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-foreground/5 to-foreground/10 flex items-center justify-center mb-4 text-foreground group-hover:bg-foreground group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-300">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>

            {/* Additional SEO Content */}
            <div className="mt-16 max-w-4xl mx-auto prose prose-slate">
              <h3 className="text-2xl font-bold mb-4">The Mission CS Methodology: A Comprehensive Approach to CS Exam Preparation</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Preparing for the Company Secretary examinations conducted by the Institute of Company Secretaries of India (ICSI) requires more than just reading textbooks. It demands a strategic approach that combines conceptual understanding with practical answer-writing skills. Mission CS Test Series bridges this critical gap by providing a structured testing framework that simulates real examination conditions.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our methodology is built on three pillars: Test, Evaluate, and Improve. When you take a Mission CS mock test, you are not merely answering questions — you are training your mind to think like a Company Secretary. Our questions are designed to test not just your knowledge of the Companies Act, 2013, or the SEBI regulations, but your ability to apply legal principles to practical scenarios.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The evaluation process at Mission CS goes far beyond simple right-or-wrong marking. Our faculty annotates every significant point in your answer, highlights what you missed, suggests alternative approaches, and provides model answers that demonstrate the ideal structure and content. This depth of feedback is what transforms average preparation into exceptional performance.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Furthermore, our platform integrates progress tracking, study planning tools, and a discussion community that collectively create an ecosystem where consistent improvement is not just encouraged — it is inevitable. Whether you are attempting CSEET for the first time or fighting for a rank in CS Professional, Mission CS adapts to your needs and pushes you toward excellence.
              </p>
            </div>
          </div>
        </section>

        {/* ============ COURSE TABS SECTION ============ */}
        <section ref={coursesRef} className="py-16 sm:py-20 bg-muted/30 scroll-mt-16 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Test Series</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Our CS Test Series</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Comprehensive, structured test series for every level of the Company Secretary course — from entrance to professional.
                </p>
              </FadeIn>
            </div>
            <Tabs defaultValue="cseet" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="bg-background shadow-sm border h-auto p-1.5 rounded-xl">
                  {courseTabs.map((tab, tabIdx) => (
                    <TabsTrigger key={tab.value} value={tab.value}
                      className="px-4 sm:px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-50 data-[state=active]:to-amber-50 dark:data-[state=active]:from-emerald-950/30 dark:data-[state=active]:to-amber-950/30 data-[state=active]:shadow-sm relative">
                      {tab.icon}<span className="ml-1.5 hidden sm:inline">{tab.label}</span>
                      {tabIdx === 1 && (
                        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">Popular</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {courseTabs.map((tab, tabIdx) => (
                <TabsContent key={tab.value} value={tab.value} className="animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-sm">{tab.badge}</Badge>
                        {tabIdx === 1 && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm text-[10px]">Most Popular</Badge>
                        )}
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{tab.title}</h3>
                      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{tab.description}</p>
                      <div className="space-y-3 mb-6">
                        {tab.features.map((item) => (
                          <div key={item} className="flex items-start gap-2 group/feature">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0 group-hover/feature:scale-110 transition-transform duration-200" />
                            <p className="text-sm text-muted-foreground">{item}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{tab.seoText}</p>
                      <div className="flex items-center gap-3 mb-6">
                        <Button onClick={() => onNavigate('student-signup')} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg transition-all duration-300 group">
                          {tab.ctaText}<ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
                        </Button>
                      </div>
                      {/* Student count indicator */}
                      {courses.find(c => c.slug === tab.value) && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-800/20">
                          <Users className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{courses.find(c => c.slug === tab.value)?._count?.students || 5000}+</span> students enrolled
                          </span>
                          <div className="flex-1 h-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(((courses.find(c => c.slug === tab.value)?._count?.students || 5000) / 20000) * 100, 90)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <Card className="backdrop-blur-sm bg-white/70 dark:bg-white/5 border-white/20 dark:border-white/10 rounded-xl hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-600" />Exam Pattern</CardTitle></CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {tab.examPattern.map((row) => (
                              <div key={row.subject} className={`flex justify-between py-1.5 ${row.bold ? 'font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg px-3 -mx-3' : 'border-b border-border/50'}`}>
                                <span className={row.bold ? 'text-foreground' : ''}>{row.subject}</span>
                                <span className="font-medium text-foreground">{row.marks}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="backdrop-blur-sm bg-white/70 dark:bg-white/5 border-white/20 dark:border-white/10 rounded-xl hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />What Our Series Covers</CardTitle></CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {tab.seriesFeatures.map((feature) => (
                              <div key={feature} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /><span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* ============ COMPARISON TABLE ============ */}
        <section className="py-16 sm:py-20 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Why Us</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Mission CS vs Others</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  See how Mission CS Test Series stands apart from the competition with features that truly make a difference.
                </p>
              </FadeIn>
            </div>
            <FadeIn delay={200}>
              <Card className="overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gradient-to-r from-emerald-50/50 to-amber-50/50 dark:from-emerald-950/20 dark:to-amber-950/20">
                        <th className="text-left py-4 px-4 sm:px-6 font-semibold text-foreground">Feature</th>
                        <th className="text-center py-4 px-3 sm:px-6 font-semibold">
                          <span className="bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent font-bold">Mission CS</span>
                        </th>
                        <th className="text-center py-4 px-3 sm:px-6 font-semibold text-muted-foreground">Others</th>
                      </tr>
                    </thead>
                  <tbody>
                    {comparisonFeatures.map((row, idx) => (
                      <tr key={row.feature} className={`border-b last:border-b-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                        <td className="py-3.5 px-4 sm:px-6 text-foreground font-medium">{row.feature}</td>
                        <td className="py-3.5 px-3 sm:px-6 text-center">
                          {row.missionCS ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                              <CheckIcon className="h-4 w-4 text-emerald-600" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/30">
                              <XIcon className="h-4 w-4 text-red-500" />
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 sm:px-6 text-center">
                          {row.others === true ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                              <CheckIcon className="h-4 w-4 text-emerald-600" />
                            </span>
                          ) : row.others === 'partial' ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/30">
                              <CircleDot className="h-4 w-4 text-amber-500" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/30">
                              <XIcon className="h-4 w-4 text-red-500" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            </FadeIn>
          </div>
        </section>

        {/* ============ REVIEWS ============ */}
        <section ref={reviewsRef} className="py-16 sm:py-20 bg-muted/30 scroll-mt-16 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-100/15 dark:bg-emerald-900/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-100/15 dark:bg-amber-900/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Student Success Stories</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Proven Results, Real Success</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Don&apos;t take our word for it — hear from students who have transformed their CS exam preparation with Mission CS Test Series.
                </p>
              </FadeIn>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="rounded-xl"><CardContent className="pt-6">
                    <Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" />
                  </CardContent></Card>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {reviews.slice(0, 4).map((review, idx) => (
                    <div key={review.id} className="animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
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
                {reviews.length > 4 && (
                  <div className="text-center mt-8">
                    <Button variant="outline" onClick={() => onNavigate('reviews')} className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-300 group">
                      View All Reviews ({reviews.length})
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
              </div>
            )}
          </div>
        </section>

        {/* ============ DISCUSSION ============ */}
        <section ref={discussionRef} className="py-16 sm:py-20 bg-muted/30 scroll-mt-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-100/15 dark:bg-emerald-900/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-100/15 dark:bg-amber-900/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-10">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Community</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Recent Discussions</h2>
                <p className="text-lg text-muted-foreground mb-2 max-w-2xl mx-auto">
                  Have questions about CS exams, preparation strategies, or specific topics? Our community connects you with fellow aspirants and experienced faculty.
                </p>
              </FadeIn>
            </div>

            {discussions.length > 0 ? (
              <FadeIn delay={200}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {discussions.slice(0, 4).map((d: any) => (
                    <Card key={d.id} className="backdrop-blur-md bg-white/80 dark:bg-slate-900/60 border-white/30 dark:border-slate-800/50 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer" onClick={() => onNavigate('discussions')}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-900/30 dark:to-amber-900/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            {(d.authorName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">{d.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{d.content}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/70">{d.authorName}</span>
                              {d.authorVerified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{d.repliesCount}</span>
                              {d.hasAdminReply && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
                                  <Shield className="w-2.5 h-2.5" /> Answered
                                </span>
                              )}
                              <span>{new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </FadeIn>
            ) : (
              <FadeIn delay={200}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950/30 dark:to-amber-950/30 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="text-muted-foreground">Be the first to start a discussion!</p>
                </div>
              </FadeIn>
            )}

            <div className="text-center flex flex-col sm:flex-row items-center justify-center gap-3">
              {discussions.length > 0 && (
                <Button variant="outline" onClick={() => onNavigate('discussions')} className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-300 group">
                  View All Discussions
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
                </Button>
              )}
              <Button onClick={() => onNavigate(isLoggedIn && userRole === 'student' ? 'student' : 'student-login')} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg transition-all duration-300 group">
                {isLoggedIn && userRole === 'student' ? 'Go to Discussions' : 'Sign In to Discuss'}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Button>
            </div>
          </div>
        </section>

        {/* ============ LEADERBOARD ============ */}
        <section className="py-16 sm:py-20 bg-muted/30 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber-100/20 dark:bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-100/20 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-10">
              <Badge variant="secondary" className="mb-3"><Trophy className="h-3 w-3 mr-1" /> Leaderboard</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Daily Top Performers</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Top 3 students with the most study time today. Stay consistent and climb the ranks!
              </p>
            </div>

            {/* Loading skeleton */}
            {leaderboardLoading ? (
              <div className="space-y-6">
                {/* Podium skeleton */}
                <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto items-end">
                  <div className="pt-6"><Skeleton className="h-36 rounded-2xl" /></div>
                  <div className="order-first"><Skeleton className="h-44 rounded-2xl" /></div>
                  <div className="order-last pt-6"><Skeleton className="h-36 rounded-2xl" /></div>
                </div>
              </div>
            ) : leaderboard.length === 0 ? (
              <Card className="max-w-md mx-auto">
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No study data today</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Start studying to appear on today's leaderboard!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Podium for top 3 */}
                {leaderboard.length >= 1 && (
                  <div className="grid grid-cols-3 gap-3 sm:gap-5 max-w-3xl mx-auto items-end">
                    {/* 2nd place */}
                    {leaderboard[1] && (
                      <div className="order-1 animate-leaderboard-in" style={{ animationDelay: '200ms' }}>
                        <div className="rounded-2xl bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 p-5 text-center shadow-lg relative ring-2 ring-slate-300/50 dark:ring-slate-600/50">
                          <Medal className="h-5 w-5 mx-auto text-slate-500 dark:text-slate-300 mb-1.5" />
                          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-slate-300 to-slate-500 dark:from-slate-500 dark:to-slate-700 text-white flex items-center justify-center font-bold text-xl mb-2 shadow-md ring-2 ring-white/20">2</div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{leaderboard[1].name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{leaderboard[1].studyMinutes || leaderboard[1].score} min</p>
                        </div>
                      </div>
                    )}
                    {/* 1st place */}
                    <div className="order-first animate-leaderboard-in" style={{ animationDelay: '0ms' }}>
                      <div className="rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 p-6 text-center shadow-xl ring-4 ring-amber-300/30 relative">
                        <Crown className="h-7 w-7 mx-auto text-white mb-1.5 drop-shadow" />
                        <div className="w-16 h-16 mx-auto rounded-full bg-white/30 backdrop-blur-sm text-white flex items-center justify-center font-bold text-2xl mb-2 shadow-lg ring-2 ring-white/30">1</div>
                        <p className="text-sm font-bold text-white truncate">{leaderboard[0].name}</p>
                        <p className="text-xs text-white/90 mt-0.5">{leaderboard[0].studyMinutes || leaderboard[0].score} min</p>
                      </div>
                    </div>
                    {/* 3rd place */}
                    {leaderboard[2] && (
                      <div className="order-last animate-leaderboard-in" style={{ animationDelay: '400ms' }}>
                        <div className="rounded-2xl bg-gradient-to-b from-orange-200 to-orange-400 dark:from-orange-800 dark:to-orange-900 p-5 text-center shadow-lg relative ring-2 ring-orange-300/50 dark:ring-orange-700/50">
                          <Award className="h-5 w-5 mx-auto text-orange-700 dark:text-orange-300 mb-1.5" />
                          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-700 dark:to-orange-900 text-white flex items-center justify-center font-bold text-xl mb-2 shadow-md ring-2 ring-white/20">3</div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{leaderboard[2].name}</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{leaderboard[2].studyMinutes || leaderboard[2].score} min</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!leaderboard[0] && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No study data today</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Start studying to appear on today's leaderboard!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ============ COMPLETE GUIDE ============ */}
        <section className="py-16 sm:py-20 bg-muted/30 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(16,185,129,0.03) 0%, transparent 50%)',
          }} />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-10">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Complete Guide</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Complete Guide to CS Examination</h2>
              </FadeIn>
            </div>
            <div className="space-y-8 text-muted-foreground">
              {[
                { icon: <BookOpen className="h-5 w-5" />, title: 'Understanding the CS Course Structure', text: 'The Company Secretary course, administered by the Institute of Company Secretaries of India (ICSI), is one of the most prestigious professional qualifications in India. The programme is structured in three progressive stages: CSEET (entrance), CS Executive (intermediate), and CS Professional (final). Each level builds upon the knowledge gained in the previous stage, creating a comprehensive understanding of corporate governance, company law, and business management.' },
                { icon: <Calculator className="h-5 w-5" />, title: 'Exam Pattern & Eligibility', text: 'CSEET is conducted four times a year (January, May, July, and November) in computer-based mode. Candidates who have passed or are appearing in 10+2 (any stream) are eligible. CS Executive and Professional examinations are held twice yearly (June and December) in descriptive pen-and-paper format. The qualifying marks are 40% in each paper and 50% aggregate across all papers in a module.' },
                { icon: <Target className="h-5 w-5" />, title: 'Preparation Strategy & Tips', text: 'Successful CS exam preparation requires a three-pronged approach: conceptual clarity through thorough reading of ICSI study material, regular practice through mock tests and past papers, and continuous improvement through expert feedback. Most importantly, practice answer writing — the ability to structure and present your knowledge effectively is often the difference between clearing and not clearing the examination.' },
              ].map((section, idx) => (
                <FadeIn key={section.title} delay={idx * 150}>
                  <Card className="hover:shadow-md transition-all duration-300 rounded-xl border-l-4 border-l-emerald-500/30 dark:border-l-emerald-700/30">
                    <CardContent className="py-6">
                      <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="text-emerald-600">{section.icon}</span>{section.title}
                      </h3>
                      <p className="leading-relaxed">{section.text}</p>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FAQ ACCORDION ============ */}
        <section className="py-16 sm:py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.03) 0%, transparent 50%)',
          }} />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <FadeIn>
                <Badge variant="secondary" className="mb-3 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">FAQ</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Got questions about CS exams or our test series? Find answers to the most commonly asked questions below.
                </p>
              </FadeIn>
            </div>
            <FadeIn delay={200}>
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faqItems.map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`} className="border rounded-xl px-4 hover:shadow-sm transition-all duration-200 data-[state=open]:border-l-emerald-500 data-[state=open]:border-l-4 data-[state=open]:shadow-sm bg-background">
                    <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-200 py-4 [&>svg]:transition-transform [&>svg]:duration-300">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeIn>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900 via-slate-900 to-amber-900" />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.05)_50%,transparent_70%)] bg-[length:200%_100%] animate-shimmer" />
          {/* Floating decorative elements */}
          <div className="absolute top-10 left-[10%] w-20 h-20 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none animate-float-slow" />
          <div className="absolute bottom-10 right-[10%] w-24 h-24 rounded-full bg-amber-400/10 blur-2xl pointer-events-none animate-float-medium" />
          <div className="absolute top-1/2 left-[5%] w-3 h-3 rounded-full bg-emerald-400/20 pointer-events-none animate-pulse-dot" />
          <div className="absolute top-1/3 right-[8%] w-2 h-2 rounded-full bg-amber-400/20 pointer-events-none animate-pulse-dot" style={{ animationDelay: '1.5s' }} />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">Ready to Ace Your CS Exams?</h2>
            <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
              Join 20,000+ successful CS aspirants who have transformed their preparation with Mission CS Test Series. Your journey from aspirant to Company Secretary starts with a single step.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="animate-pulse-cta">
                <Button size="lg" variant="secondary" onClick={() => onNavigate('student-signup')} className="text-base px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 group relative overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative">Start Free Today<ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200 inline" /></span>
                </Button>
              </div>
              <Button size="lg" variant="outline" asChild className="text-base px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-300 hover:-translate-y-0.5">
                <a href="https://missioncstestseries.com" target="_blank" rel="noopener noreferrer">
                  Visit Mission CS<ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="mt-auto relative">
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                    <GraduationCap className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-lg text-foreground">MISSION CS</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  India&apos;s most trusted CS test series platform. Helping Company Secretary aspirants achieve their dreams through structured testing and expert evaluation since 2018.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-4">Test Series</h4>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li><button onClick={() => { setActiveCarouselIndex(0); scrollToSection(coursesRef) }} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">CSEET Test Series</button></li>
                  <li><button onClick={() => scrollToSection(coursesRef)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">CS Executive Test Series</button></li>
                  <li><button onClick={() => scrollToSection(coursesRef)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">CS Professional Test Series</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-4">Resources</h4>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li><a href="https://missioncstestseries.com/cstestseriesschedule" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1.5"><Download className="h-3 w-3" />Download Schedule</a></li>
                  <li><button onClick={() => onNavigate('reviews')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Student Reviews</button></li>
                  <li><button onClick={() => onNavigate('discussions')} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200">Discussion Forum</button></li>
                  <li><a href="https://missioncstestseries.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />Official Website</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-4">Connect With Us</h4>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-emerald-600" /><span>misssioncs@gmail.com</span></li>
                  <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-emerald-600" /><span>+918929592998</span></li>
                </ul>
                <div className="flex items-center gap-3 mt-4">
                  {[
                    { icon: <Instagram className="h-4 w-4" />, label: 'Instagram', hoverColor: 'hover:bg-pink-100 dark:hover:bg-pink-950/30 hover:text-pink-600 dark:hover:text-pink-400' },
                    { icon: <Youtube className="h-4 w-4" />, label: 'YouTube', hoverColor: 'hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400' },
                    { icon: <Linkedin className="h-4 w-4" />, label: 'LinkedIn', hoverColor: 'hover:bg-sky-100 dark:hover:bg-sky-950/30 hover:text-sky-600 dark:hover:text-sky-400' },
                  ].map((social) => (
                    <a key={social.label} href="#" aria-label={social.label}
                      className={`w-9 h-9 rounded-full bg-foreground/5 flex items-center justify-center ${social.hoverColor} transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95`}>
                      <span className="text-foreground">{social.icon}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <Separator className="mb-6" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Mission CS Test Series. All rights reserved.</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button onClick={() => onNavigate('privacy-policy')} className="hover:text-foreground transition-colors duration-200 cursor-pointer">Privacy Policy</button>
                <button onClick={() => onNavigate('terms-conditions')} className="hover:text-foreground transition-colors duration-200 cursor-pointer">Terms of Service</button>
                <button onClick={() => onNavigate('refund-policy')} className="hover:text-foreground transition-colors duration-200 cursor-pointer">Refund Policy</button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ============ SCROLL TO TOP BUTTON ============ */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-amber-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 ${showScrollTop ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-75 pointer-events-none'}`}
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      {/* ============ CSS ANIMATIONS ============ */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out both;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out both;
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }

        @keyframes float-medium {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(10px) rotate(-5deg); }
        }
        .animate-float-medium {
          animation: float-medium 5s ease-in-out infinite;
          animation-delay: 1s;
        }

        @keyframes float-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float-fast {
          animation: float-fast 7s ease-in-out infinite;
          animation-delay: 2s;
        }

        @keyframes float-item {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-item {
          animation: float-item 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-shimmer {
          animation: shimmer 8s ease-in-out infinite;
        }

        @keyframes pulse-cta {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .animate-pulse-cta {
          animation: pulse-cta 2s ease-in-out infinite;
        }

        @keyframes leaderboard-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-leaderboard-in {
          animation: leaderboard-in 0.5s ease-out both;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        .animate-pulse-dot {
          animation: pulse-dot 3s ease-in-out infinite;
        }

        @keyframes gradient-text {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-text {
          animation: gradient-text 6s ease-in-out infinite;
        }

        @keyframes gradient-shift {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 8s ease-in-out infinite;
        }

        @keyframes icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-icon-pulse {
          animation: icon-pulse 3s ease-in-out infinite;
        }

        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: oklch(0.8 0 0); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: oklch(0.7 0 0); }

        /* Global scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: oklch(0.85 0 0); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: oklch(0.7 0 0); }

        /* Shimmer loading effect */
        @keyframes loading-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-loading-shimmer {
          background: linear-gradient(90deg, oklch(0.95 0 0) 25%, oklch(0.9 0 0) 50%, oklch(0.95 0 0) 75%);
          background-size: 200% 100%;
          animation: loading-shimmer 1.5s ease-in-out infinite;
        }
        .dark .animate-loading-shimmer {
          background: linear-gradient(90deg, oklch(0.25 0 0) 25%, oklch(0.2 0 0) 50%, oklch(0.25 0 0) 75%);
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  )
}
