'use client'

import { usePageMeta } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen, Gavel, CheckCircle2, ArrowRight, ExternalLink,
  GraduationCap, Shield, Award, TrendingUp, FileText, Users,
  Target, Clock, Zap, BarChart3, BookMarked, Briefcase, ChevronRight,
  ArrowLeft, Star, Trophy, Lightbulb, Scale, Building2, PieChart,
  LayoutList, PenTool, Landmark, FileSearch, Banknote,
} from 'lucide-react'

interface CSProfessionalPageProps {
  onNavigate: (view: string) => void
}

export default function CSProfessionalPage({ onNavigate }: CSProfessionalPageProps) {
  usePageMeta('cs-professional')
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('landing')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">MISSION CS</span>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-1.5 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">Test Series</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="hover:bg-muted/80 transition-colors duration-200">
            <ArrowLeft className="h-4 w-4 mr-1" />Back to Home
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-700 via-orange-700 to-rose-800 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
          <div className="absolute top-16 left-[8%] w-36 h-36 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-12 right-[10%] w-44 h-44 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

          <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Course",
              "name": "CS Professional Test Series",
              "description": "ICSI CS Professional test series covering all 7 papers under Syllabus 2022",
              "provider": { "@type": "Organization", "name": "Mission CS Test Series" },
              "courseCode": "CS-Professional"
            })
          }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-6 text-xs font-medium px-4 py-1.5 bg-white/15 text-white border-white/25 backdrop-blur-sm">
                <Gavel className="h-3.5 w-3.5 mr-1.5" />
                CS Professional Programme
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                CS Professional<br />
                <span className="text-amber-200">Test Series</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-amber-100/90 max-w-2xl mx-auto leading-relaxed">
                Conquer the final frontier of the Company Secretary course. Our Professional test series prepares you for 7 advanced papers under ICSI Syllabus 2022 with rigorous practice, expert evaluation, and proven strategies.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="text-base px-8 py-6 bg-white text-amber-800 hover:bg-amber-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
                  <a href="https://missioncstestseries.com" target="_blank" rel="noopener noreferrer">
                    Enroll Now<ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" onClick={() => onNavigate('landing')} className="text-base px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-300">
                  Back to Home
                </Button>
              </div>
              <div className="mt-12 flex flex-wrap justify-center gap-6 sm:gap-10">
                {[
                  { value: '7', label: 'Papers' },
                  { value: '2', label: 'Groups' },
                  { value: 'AIR 8', label: 'Best Result' },
                  { value: '700', label: 'Total Marks' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-amber-200/80 uppercase tracking-wider mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About CS Professional Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                About the CS Professional Programme
              </h2>
              <div className="prose prose-lg dark:prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The Company Secretary Professional programme represents the pinnacle of the CS course curriculum, designed to transform aspiring Company Secretaries into seasoned professionals capable of handling the most complex corporate governance challenges. Administered by the Institute of Company Secretaries of India (ICSI), this programme demands not just knowledge of advanced legal provisions but the ability to synthesize multiple areas of law and practice into comprehensive, real-world solutions. Successfully clearing the Professional programme opens the door to practicing as a Company Secretary — one of the most respected professional designations in India&apos;s corporate landscape.
                </p>
                <p>
                  Under the ICSI Syllabus 2022 (effective from June 2024 examination), the CS Professional curriculum consists of seven papers organized across two groups. Group 1 comprises four papers: Environmental, Social and Governance (ESG) – Principles & Practice; Drafting, Pleadings and Appearances; Compliance Management, Audit & Due Diligence; and Elective 1 (open-book exam with six options). Group 2 comprises three papers: Strategic Management & Corporate Finance; Corporate Restructuring, Valuation and Insolvency; and Elective 2 (open-book exam with five options). Each paper carries 100 marks, totaling 700 marks across the programme.
                </p>
                <p>
                  What distinguishes the Professional programme from the Executive level is the heightened complexity and the multi-disciplinary nature of the questions. At this level, ICSI expects candidates to demonstrate not merely knowledge of individual statutes but the ability to analyze complex corporate scenarios from multiple legal perspectives simultaneously. A single question might require you to apply provisions from the Companies Act, SEBI regulations, FEMA guidelines, and competition law — all within a cohesive, well-structured answer. The descriptive and analytical nature of the examination means every paper tests your ability to reason, evaluate, and articulate professional solutions.
                </p>
                <p>
                  The Professional programme also places significant emphasis on practical application and professional judgment. Questions often present real-world corporate scenarios where you must identify the legal issues, determine the applicable provisions, evaluate the options available, and recommend a course of action — exactly as you would in professional practice. This is why rote memorization alone is insufficient at this level, and why structured practice with expert feedback is absolutely essential for success. Mission CS Professional Test Series is specifically designed to develop this multi-dimensional analytical thinking and professional judgment through rigorous, scenario-based practice.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-7xl mx-auto" />

        {/* Group-wise Coverage */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">
                <BookMarked className="h-3.5 w-3.5 mr-1.5" />Curriculum
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Group-wise Paper Coverage — ICSI Syllabus 2022</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Comprehensive test coverage across all 7 papers with specialized tests for open-book electives and descriptive analytical questions.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Group 1 */}
              <Card className="border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-base">
                    <Shield className="h-5 w-5" />
                    GROUP 1 — 4 Papers (400 Marks)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    { name: 'Paper 1: Environmental, Social and Governance (ESG) – Principles & Practice', desc: 'Part I: Governance & Sustainability (65 marks) — Board governance, ESG frameworks, sustainability strategy. Part II: Risk Management (20 marks) — Enterprise risk, internal controls. Part III: Environment & Sustainability Reporting (15 marks) — ESG disclosures, BRSR, carbon accounting.' },
                    { name: 'Paper 2: Drafting, Pleadings and Appearances', desc: 'Part I: Drafting & Conveyancing (70 marks) — Legal drafting, deeds, agreements, conveyancing. Part II: Pleadings & Appearances (30 marks) — Court pleadings, tribunal appearances, advocacy skills.' },
                    { name: 'Paper 3: Compliance Management, Audit & Due Diligence', desc: 'Part I: Compliance Management (40 marks) — Compliance frameworks, regulatory monitoring. Part II: Audit & Due Diligence (60 marks) — Secretarial audit, due diligence procedures, compliance audit.' },
                    { name: 'Paper 4: Elective 1 (Open-Book Exam)', desc: 'Choose 1 of 6: CSR & Social Governance | Internal & Forensic Audit | Intellectual Property Rights – Law & Practice | Artificial Intelligence, Data Analytics and Cyber Security – Laws & Practice | Advanced Direct Tax Laws & Practice | IFSCA - Regulations, Listing and Compliances.' },
                  ].map((paper) => (
                    <div key={paper.name} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground text-sm">{paper.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{paper.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Group 2 */}
              <Card className="border-amber-200/50 dark:border-amber-800/30 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-base">
                    <Landmark className="h-5 w-5" />
                    GROUP 2 — 3 Papers (300 Marks)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    { name: 'Paper 5: Strategic Management & Corporate Finance', desc: 'Part I: Strategic Management (40 marks) — Strategic analysis, formulation, implementation. Part II: Corporate Finance (60 marks) — Capital structure, dividend policy, project finance, working capital management.' },
                    { name: 'Paper 6: Corporate Restructuring, Valuation and Insolvency', desc: 'Part I: Corporate Restructuring (40 marks) — Mergers, demergers, amalgamations. Part II: Valuation (20 marks) — Business valuation methods, approaches. Part III: Insolvency, Liquidation & Winding-up (40 marks) — IBC proceedings, liquidation process, winding-up under Companies Act.' },
                    { name: 'Paper 7: Elective 2 (Open-Book Exam)', desc: 'Choose 1 of 5: Arbitration, Mediation & Conciliation | Goods & Services Tax (GST) & Corporate Tax Planning | Labour Laws & Practice | Banking & Insurance – Laws & Practice | Insolvency and Bankruptcy – Law & Practice.' },
                  ].map((paper) => (
                    <div key={paper.name} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground text-sm">{paper.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{paper.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">
                <Zap className="h-3.5 w-3.5 mr-1.5" />Features
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Why Choose Our CS Professional Test Series?</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Advanced features designed for the most challenging level of the CS course, with focus on multi-disciplinary analysis and professional judgment.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Gavel className="h-6 w-6" />, title: 'Multi-Law Scenario Questions', desc: 'Our test papers include advanced scenario-based questions that require the application of multiple statutes simultaneously — mirroring the actual ICSI examination pattern with descriptive analytical questions that test your professional judgment.' },
                { icon: <Award className="h-6 w-6" />, title: 'Senior Faculty Evaluation', desc: 'Professional-level papers are evaluated by senior practicing Company Secretaries and subject matter experts with decades of experience. Their feedback goes beyond marking — they provide strategic guidance on answer approach.' },
                { icon: <Clock className="h-6 w-6" />, title: 'Priority Evaluation Queue', desc: 'Professional test series students receive priority evaluation with results delivered within 24 working hours. We understand the time pressure of the final level and ensure your feedback arrives when you need it most.' },
                { icon: <BarChart3 className="h-6 w-6" />, title: 'Advanced Performance Analytics', desc: 'Detailed analytics tracking your competency across all seven papers, with group-wise analysis, topic-level insights, and predictive scoring based on your improvement trajectory. Know exactly where you stand before the exam.' },
                { icon: <FileText className="h-6 w-6" />, title: 'Descriptive Answer Evaluation', desc: 'With 50 descriptive questions of 2 marks each per paper, our evaluators provide detailed feedback on answer structure, legal reasoning, citation accuracy, and presentation — the key differentiators at the Professional level.' },
                { icon: <Target className="h-6 w-6" />, title: 'Open-Book Exam Preparation', desc: 'Papers 4 and 7 are open-book exams. Our test series simulates the open-book environment, training you to efficiently navigate reference materials and produce well-structured answers under time constraints.' },
              ].map((feature) => (
                <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/60">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-950/40 dark:to-rose-950/40 flex items-center justify-center mb-4 text-amber-700 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-7xl mx-auto" />

        {/* Exam Pattern Section */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">
                <LayoutList className="h-3.5 w-3.5 mr-1.5" />Exam Pattern
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">CS Professional Exam Pattern — Syllabus 2022</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Understand the examination structure under the ICSI Syllabus 2022, effective from June 2024 examination.</p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {[
                      { subject: 'Paper 1: ESG – Principles & Practice', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 2: Drafting, Pleadings and Appearances', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 3: Compliance Management, Audit & Due Diligence', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 4: Elective 1 (Open-Book — 6 options)', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 5: Strategic Management & Corporate Finance', marks: '100 Marks', group: '2' },
                      { subject: 'Paper 6: Corporate Restructuring, Valuation and Insolvency', marks: '100 Marks', group: '2' },
                      { subject: 'Paper 7: Elective 2 (Open-Book — 5 options)', marks: '100 Marks', group: '2' },
                    ].map((paper, idx) => (
                      <div key={idx} className={`flex items-center justify-between py-3 px-3 sm:px-4 rounded-lg gap-2 ${idx % 2 === 0 ? 'bg-muted/50' : ''}`}>
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Badge variant={paper.group === '1' ? 'default' : 'secondary'} className="text-[10px] w-6 h-6 p-0 flex items-center justify-center flex-shrink-0">
                            {paper.group}
                          </Badge>
                          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{paper.subject}</span>
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex-shrink-0">{paper.marks}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between py-3 px-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Total (7 Papers)</span>
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-300">700 Marks</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Question Format:</strong> 50 descriptive/analytical questions per paper, 2 marks each. No negative marking. No MCQ.</p>
                      <p><strong className="text-foreground">Open-Book Exams:</strong> Papers 4 and 7 are open-book examinations. Candidates may refer to specified reference materials during the exam.</p>
                      <p><strong className="text-foreground">Passing Criteria:</strong> 40% in each paper individually and 50% aggregate overall (not per group)</p>
                      <p><strong className="text-foreground">Exam Sessions:</strong> June and December each year. Pre-examination test required.</p>
                      <p><strong className="text-foreground">Duration:</strong> 3 hours per paper, offline pen-paper, English medium</p>
                      <p><strong className="text-foreground">Syllabus:</strong> ICSI Syllabus 2022 effective from June 2024. Study materials updated through May 2025 for June 2026 exams.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />Benefits
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">How Mission CS Professional Test Series Gives You the Edge</h2>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
              {[
                { title: 'Master Multi-Disciplinary Analysis', desc: 'The CS Professional examination demands the ability to analyze situations from the perspective of multiple statutes simultaneously. Our case study-based practice questions train you to think across legal domains — combining Companies Act provisions with SEBI regulations, FEMA guidelines, and competition law principles. This multi-dimensional thinking is what separates successful candidates from those who fall short, and it is the core skill that Mission CS Professional Test Series develops through systematic, progressive practice.' },
                { title: 'Develop Professional Judgment', desc: 'At the Professional level, ICSI does not merely test your knowledge of legal provisions — they test your ability to exercise professional judgment in complex corporate situations. Our test series includes questions that present ambiguous scenarios where multiple interpretations are possible, forcing you to evaluate options, justify your recommendations, and anticipate counter-arguments. This is the skill that makes you effective as a practicing Company Secretary, not just an exam passer.' },
                { title: 'Build Exam-Temperature Resilience', desc: 'The CS Professional examination is a grueling multi-day affair spanning seven papers. Our full-length mock test series builds the mental stamina and endurance needed to maintain peak performance across all papers. By simulating the actual examination schedule and time constraints, we prepare you not just academically but psychologically for the challenge ahead.' },
                { title: 'Elective Paper Mastery', desc: 'Choosing and mastering your elective papers is a strategic decision that can significantly impact your overall score. Our specialized elective test series covers all options in depth — 6 electives for Paper 4 and 5 electives for Paper 7 — helping you not only prepare for your chosen electives but also make an informed choice based on your strengths and career aspirations.' },
                { title: 'Rank-Oriented Strategy', desc: 'For aspirants aiming for top ranks, we provide rank-oriented feedback that goes beyond mere passing. Our evaluators identify the subtle improvements that can elevate your answers from good to outstanding — the precise legal terminology, the strategic case law references, and the presentation techniques that earn distinction marks. Our recent AIR 8 result demonstrates the effectiveness of this approach.' },
              ].map((benefit, idx) => (
                <Card key={idx} className="border-border/60 hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6 flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-950/40 dark:to-rose-950/40 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Separator className="max-w-7xl mx-auto" />

        {/* Preparation Tips */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">
                <Lightbulb className="h-3.5 w-3.5 mr-1.5" />Expert Tips
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Preparation Tips for CS Professional</h2>
            </div>

            <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
              {[
                { title: 'Think Like a Practicing CS', tip: 'At the Professional level, you are being trained for real-world practice. Approach every question as if you are advising a client — identify all legal issues, evaluate options, and recommend the best course of action with proper reasoning.' },
                { title: 'Connect Across Subjects', tip: 'The descriptive questions often test integration of knowledge. Practice connecting concepts across different papers — how does corporate restructuring affect securities law compliance? What governance issues arise during insolvency?' },
                { title: 'Study Recent Amendments', tip: 'Professional-level questions frequently test recent amendments and new regulations. Stay updated with changes to the Companies Act, SEBI LODR, IBC provisions, and RBI guidelines through our regular amendment updates.' },
                { title: 'Master the 50×2 Format', tip: 'Each paper has 50 questions of 2 marks each — no MCQs, no negative marking. Practice writing concise, precise answers that cover the key points within the time limit. Every mark counts across 700 total marks.' },
                { title: 'Choose Electives Strategically', tip: 'Select your elective papers based on your existing knowledge base and career goals, not perceived easiness. A paper you find interesting is easier to study deeply, and deep knowledge always scores better than superficial coverage of an "easy" subject.' },
                { title: 'Practice Time Allocation', tip: 'With 50 questions to answer in 3 hours, you have roughly 3.6 minutes per question. Practice allocating time proportionally — concise yet complete answers for each 2-mark question, without spending too long on any single one.' },
                { title: 'Build a Case Law Repository', tip: 'Maintain a curated collection of landmark and recent case laws organized by topic. At the Professional level, citing relevant case law in your answers demonstrates depth of understanding and earns valuable additional marks.' },
                { title: 'Attempt Full-Length Mocks', tip: 'Never skip full-length mock tests under timed conditions. The Professional exam requires sustained focus over three hours per paper. Only regular full-length practice builds the stamina and concentration needed for exam day.' },
                { title: 'Master Open-Book Exam Strategy', tip: 'For Papers 4 and 7, practice navigating reference materials efficiently. Tab your books, create quick-reference notes, and practice locating provisions rapidly. The open-book format tests your ability to find and apply information, not just recall it.' },
                { title: 'Select Electives with Care', tip: 'Review the syllabus of all elective options before choosing. Consider your career aspirations, existing knowledge, and the availability of study materials. Discuss with mentors and past rankers to make an informed decision.' },
                { title: 'Track Amendments Diligently', tip: 'ICSI updates study materials periodically. Track all amendments, notifications, and circulars issued by ICSI, MCA, SEBI, and other regulators. Our amendment alerts ensure you never miss a syllabus update for the June and December exam cycles.' },
              ].map((tip, idx) => (
                <Card key={idx} className="border-border/60">
                  <CardContent className="pt-5 pb-4 px-5">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm mb-1">{tip.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tip.tip}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-gradient-to-br from-amber-700 via-orange-700 to-rose-800 border-0 shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 pointer-events-none opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '30px 30px',
              }} />
              <CardContent className="pt-10 pb-10 text-center relative">
                <Trophy className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Complete Your CS Journey?</h2>
                <p className="text-amber-100/90 max-w-xl mx-auto mb-8 text-lg">
                  The Professional programme is your final challenge. Join Mission CS and clear it with confidence — just like our AIR 8 ranker did.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild className="text-base px-8 py-6 bg-white text-amber-800 hover:bg-amber-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
                    <a href="https://missioncstestseries.com" target="_blank" rel="noopener noreferrer">
                      Enroll Now<ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => onNavigate('student-signup')} className="text-base px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-300">
                    Create Free Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Sticky Footer */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-foreground">MISSION CS Test Series</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} Mission CS Test Series. All rights reserved. Empowering CS aspirants across India.
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button onClick={() => onNavigate('privacy-policy')} className="hover:text-foreground transition-colors">Privacy Policy</button>
              <button onClick={() => onNavigate('terms-conditions')} className="hover:text-foreground transition-colors">Terms</button>
              <button onClick={() => onNavigate('refund-policy')} className="hover:text-foreground transition-colors">Refund Policy</button>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="text-xs hover:bg-muted/80 ml-2">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
