'use client'

import { usePageMeta } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen, Briefcase, CheckCircle2, ArrowRight, ExternalLink,
  GraduationCap, Shield, Award, TrendingUp, FileText, Users,
  Target, Clock, Zap, BarChart3, BookMarked, Gavel, ChevronRight,
  Star, Trophy, Lightbulb, Scale, Building2, PieChart,
  LayoutList, PenTool,
} from 'lucide-react'

interface CSExecutivePageProps {
  onNavigate: (view: string) => void
}

export default function CSExecutivePage({ onNavigate }: CSExecutivePageProps) {
  usePageMeta('cs-executive')
  return (
    <>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
          <div className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-[15%] w-40 h-40 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
            <div className="text-center max-w-4xl mx-auto">
              <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Course",
                  "name": "CS Executive Test Series",
                  "description": "ICSI CS Executive test series covering all 7 papers under Syllabus 2022",
                  "provider": { "@type": "Organization", "name": "Mission CS Test Series" },
                  "courseCode": "CS-Executive",
                  "hasCourseInstance": { "@type": "CourseInstance", "courseMode": "offline", "courseWorkload": "PT3H" }
                })
              }} />
              <Badge variant="secondary" className="mb-6 text-xs font-medium px-4 py-1.5 bg-white/15 text-white border-white/25 backdrop-blur-sm">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                CS Executive Programme
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                CS Executive<br />
                <span className="text-emerald-200">Test Series</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
                Master all 7 papers of the CS Executive programme with our expertly crafted test series. Get line-by-line feedback from qualified Company Secretaries and clear your exams with confidence.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="text-base px-8 py-6 bg-white text-emerald-800 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
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
                  { value: '20K+', label: 'Students Trust Us' },
                  { value: 'AIR 8', label: 'Top Result' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-emerald-200/80 uppercase tracking-wider mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About CS Executive Section */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                About the CS Executive Programme
              </h2>
              <div className="prose prose-lg dark:prose-invert max-w-none space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The Company Secretary Executive programme is the second level of the prestigious Company Secretary course administered by the Institute of Company Secretaries of India (ICSI). This programme serves as the critical bridge between the foundational CSEET level and the advanced Professional programme, equipping aspiring Company Secretaries with comprehensive knowledge of corporate law, governance frameworks, and business management principles. The Executive programme is designed to develop a deep understanding of the legal and regulatory environment in which companies operate, making it an essential stepping stone for anyone pursuing a career in corporate compliance and governance.
                </p>
                <p>
                  Under the ICSI Syllabus 2022 (effective from December 2023), the CS Executive curriculum comprises seven papers divided into two groups. Group 1 covers Jurisprudence, Interpretation & General Laws; Company Law & Practice; Setting Up of Business, Industrial & Labour Laws; and Corporate Accounting and Financial Management. Group 2 covers Capital Market & Securities Laws; Economic, Commercial and Intellectual Property Laws; and Tax Laws & Practice. Each paper carries 100 marks, making the total examination worth 700 marks. The qualifying criteria require candidates to score a minimum of 40% in each individual paper and 50% aggregate in each group, ensuring a balanced competency across all subjects. The old syllabus (2017) was discontinued after June 2024.
                </p>
                <p>
                  What makes the CS Executive examination particularly challenging is its shift from the objective-type format of CSEET to descriptive answer writing. Candidates must not only possess thorough knowledge of legal provisions and case laws but also demonstrate the ability to articulate complex legal arguments in a structured, logical manner. The examination tests your capacity to analyze factual situations, apply relevant legal principles, and present well-reasoned conclusions — skills that are fundamental to the role of a practicing Company Secretary. This is precisely where most aspirants struggle, and this is where Mission CS Test Series makes the most significant difference.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Separator className="max-w-7xl mx-auto" />

        {/* Curriculum Highlights */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-emerald-200/50 dark:border-emerald-800/30">
                <BookMarked className="h-3.5 w-3.5 mr-1.5" />Curriculum
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Group-wise Paper Coverage</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Our test series covers every paper comprehensively with chapter-wise, subject-wise, and full-length mock tests.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Group 1 */}
              <Card className="border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <Scale className="h-5 w-5" />
                    Group 1 — Law, Accounting & Governance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    { name: 'Paper 1: Jurisprudence, Interpretation & General Laws (JIGL)', desc: 'Constitutional law, administrative law, interpretation of statutes, and over 20 minor legislations including RTI, Consumer Protection, and Information Technology Act.' },
                    { name: 'Paper 2: Company Law & Practice', desc: 'Company Law Principles & Concepts (60 marks) and Company Administration & Meetings (40 marks). Comprehensive coverage of Companies Act 2013, rules, notifications, and landmark case laws.' },
                    { name: 'Paper 3: Setting Up of Business, Industrial & Labour Laws', desc: 'Setting Up of Business (60 marks) and Industrial & Labour Laws (40 marks). Covers business structures, startup ecosystem, FEMA, and labour legislation.' },
                    { name: 'Paper 4: Corporate Accounting and Financial Management', desc: 'Corporate Accounting (60 marks) and Financial Management (40 marks). 100% descriptive paper covering financial statements, ratio analysis, cost accounting, and budgeting.' },
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
                  <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <PieChart className="h-5 w-5" />
                    Group 2 — Capital Markets, Economic Laws & Taxation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    { name: 'Paper 5: Capital Market & Securities Laws', desc: 'Capital Market (40 marks) and Securities Laws (60 marks). SEBI regulations, stock exchange operations, investor protection, public issues, and insider trading provisions with practical case studies.' },
                    { name: 'Paper 6: Economic, Commercial and Intellectual Property Laws', desc: 'Economic & Commercial Laws (60 marks) and IP Laws (40 marks). FEMA, competition law, intellectual property rights, commercial arbitration, and international trade laws.' },
                    { name: 'Paper 7: Tax Laws & Practice', desc: 'Direct Tax (60 marks) and Indirect Tax (40 marks). Comprehensive coverage of income tax provisions, GST, customs duty, and tax planning strategies.' },
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
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Why Choose Our CS Executive Test Series?</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Every feature is designed to maximize your exam performance and build the answer-writing skills that ICSI examiners look for.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <Shield className="h-6 w-6" />, title: 'ICSI-Pattern Aligned', desc: 'Every mock test replicates the exact ICSI examination format including question types, marking scheme, and time constraints. Our question bank is regularly updated to reflect the latest syllabus amendments and examination trends observed in recent sessions.' },
                { icon: <Award className="h-6 w-6" />, title: 'Expert Faculty Evaluation', desc: 'Your answers are evaluated by qualified Company Secretaries and experienced educators who understand the ICSI marking system. Each paper receives line-by-line annotations highlighting correct provisions, missed case laws, and structural improvements needed.' },
                { icon: <Clock className="h-6 w-6" />, title: '24-Hour Evaluation', desc: 'Receive your evaluated papers within 24 working hours — the fastest turnaround in the industry. We understand that timely feedback is crucial for iterative improvement, and our evaluation team works round the clock to deliver on this promise.' },
                { icon: <BarChart3 className="h-6 w-6" />, title: 'Performance Analytics', desc: 'Track your progress with detailed analytics covering subject-wise scores, chapter-wise performance, improvement trends, and comparative analysis with toppers. Our data-driven approach helps you identify and focus on your weakest areas.' },
                { icon: <FileText className="h-6 w-6" />, title: 'Model Answers with Case Laws', desc: 'Every test comes with comprehensive model answers that demonstrate the ideal structure, legal provisions, and case law references. These model answers serve as study material and show you exactly how a high-scoring answer should be presented.' },
                { icon: <Target className="h-6 w-6" />, title: 'Chapter-wise + Full Mocks', desc: 'Our layered testing approach includes chapter-wise tests for granular preparation, subject-wise tests for focused practice, and full-length mock tests that simulate the complete three-hour examination experience across all papers.' },
              ].map((feature) => (
                <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/60">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950/40 dark:to-amber-950/40 flex items-center justify-center mb-4 text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
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
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">CS Executive Exam Pattern (Syllabus 2022)</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Understand the examination structure to plan your preparation strategy effectively.</p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {[
                      { subject: 'Paper 1: Jurisprudence, Interpretation & General Laws', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 2: Company Law & Practice', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 3: Setting Up of Business, Industrial & Labour Laws', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 4: Corporate Accounting and Financial Management', marks: '100 Marks', group: '1' },
                      { subject: 'Paper 5: Capital Market & Securities Laws', marks: '100 Marks', group: '2' },
                      { subject: 'Paper 6: Economic, Commercial and Intellectual Property Laws', marks: '100 Marks', group: '2' },
                      { subject: 'Paper 7: Tax Laws & Practice', marks: '100 Marks', group: '2' },
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
                    <div className="flex items-center justify-between py-3 px-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Total (7 Papers)</span>
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">700 Marks</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <p><strong className="text-foreground">Passing Criteria:</strong> 40% in each paper individually and 50% aggregate per group</p>
                      <p><strong className="text-foreground">Exam Sessions:</strong> June and December each year</p>
                      <p><strong className="text-foreground">Duration:</strong> 3 hours per paper</p>
                      <p><strong className="text-foreground">Question Type:</strong> 20% objective (case study based MCQs) + 80% descriptive for Papers 1-3, 5-7; Paper 4 is 100% descriptive</p>
                      <p><strong className="text-foreground">Negative Marking:</strong> 0.25 mark deducted per wrong MCQ answer (no negative for descriptive)</p>
                      <p><strong className="text-foreground">Medium:</strong> English (Hindi also available for some papers)</p>
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
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Benefits of Practicing with Mission CS</h2>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
              {[
                { title: 'Develop Structured Answer Writing', desc: 'The CS Executive exam demands answers that are well-organized with proper headings, sub-headings, legal provisions cited accurately, and case law references where applicable. Our test series trains you to write answers that follow this structure instinctively. Through repeated practice and expert feedback, you will learn to present even complex legal arguments in a clear, logical format that maximizes your score potential.' },
                { title: 'Master Time Management', desc: 'With three hours to complete a 100-mark paper, time management is often the difference between clearing and failing. Our mock tests simulate real exam conditions, helping you develop an internal clock for how long to spend on each question. Many students who know the material well still fail because they cannot complete the paper — our test series specifically addresses this challenge.' },
                { title: 'Build Legal Reasoning Skills', desc: 'CS Executive questions often present factual scenarios requiring the application of multiple legal provisions. Through our scenario-based practice questions, you develop the analytical thinking needed to identify the relevant laws, apply them correctly, and present a reasoned conclusion. This skill is not just essential for exams — it forms the foundation of your professional practice as a Company Secretary.' },
                { title: 'Track & Improve Systematically', desc: 'Our performance analytics dashboard tracks your scores across subjects, chapters, and test attempts. You can see exactly where you are improving and where you need more focus. This data-driven approach eliminates guesswork from your preparation strategy and ensures that every study hour is spent on the areas that will most impact your exam results.' },
                { title: 'Join a Community of Achievers', desc: 'When you enroll with Mission CS, you join a community of over 20,000 serious CS aspirants across India. Our discussion forums, study groups, and peer interactions create a support system that keeps you motivated throughout your preparation journey. Many of our top rankers credit the community aspect as a key factor in their success.' },
              ].map((benefit, idx) => (
                <Card key={idx} className="border-border/60 hover:shadow-md transition-all duration-300">
                  <CardContent className="pt-6 flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950/40 dark:to-amber-950/40 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
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
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Preparation Tips for CS Executive</h2>
            </div>

            <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
              {[
                { title: 'Start with JIGL', tip: 'Jurisprudence, Interpretation & General Laws forms the foundation for Company Law and other papers. Mastering JIGL first makes subsequent subjects significantly easier to understand and retain.' },
                { title: 'Practice Writing Daily', tip: 'Spend at least 30 minutes daily writing descriptive answers. The CS Executive exam tests your writing ability as much as your knowledge. Regular practice builds speed, clarity, and structure.' },
                { title: 'Memorize Section Numbers', tip: 'Citing section numbers from the Companies Act 2013 and other legislations adds credibility to your answers. Create flashcards or use mnemonic techniques to memorize important section numbers.' },
                { title: 'Study Case Laws', tip: 'Landmark case laws are frequently tested and can earn you extra marks. Maintain a case law notebook organized by topic, noting the facts, issue, decision, and principle established in each case.' },
                { title: 'Attempt Group-wise', tip: 'Focus on clearing one group at a time rather than preparing for all seven papers simultaneously. This concentrated approach leads to deeper understanding and better retention.' },
                { title: 'Review Model Answers', tip: 'After every mock test, carefully study the model answers provided. Note the structure, legal provisions cited, and the logical flow. Compare with your own answers to identify gaps in your approach.' },
                { title: 'Stay Updated on Amendments', tip: 'Corporate law is constantly evolving. Stay informed about recent amendments to the Companies Act, SEBI regulations, and other relevant legislation. ICSI often tests recent changes in examinations. Amendments to Papers 1, 2, and 6 became effective December 2025.' },
                { title: 'Time Your Practice', tip: 'Always attempt mock tests under timed conditions. Three hours for 100 marks means approximately 1.8 minutes per mark. Practicing with this constraint trains you to write concise, impactful answers.' },
                { title: 'Practice Accounting Numericals', tip: 'Paper 4 (Corporate Accounting and Financial Management) requires strong numerical skills. Practice journal entries, ledger preparation, ratio analysis, and financial statement problems daily to build speed and accuracy.' },
                { title: 'Track Syllabus Amendments', tip: 'ICSI regularly updates the syllabus. Amendments to Papers 1, 2, and 6 took effect from December 2025. Always refer to the latest study materials — those updated through November 2025 apply for June 2026 exams.' },
                { title: 'Use ICSI Study Material', tip: 'Always refer to the official ICSI study modules as your primary source. Our test series supplements these materials with practice questions and model answers, but the ICSI modules remain the authoritative reference for syllabus coverage.' },
              ].map((tip, idx) => (
                <Card key={idx} className="border-border/60">
                  <CardContent className="pt-5 pb-4 px-5">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
            <Card className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 border-0 shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 pointer-events-none opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '30px 30px',
              }} />
              <CardContent className="pt-10 pb-10 text-center relative">
                <Trophy className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Clear CS Executive?</h2>
                <p className="text-emerald-100/90 max-w-xl mx-auto mb-8 text-lg">
                  Join thousands of successful CS aspirants who have cleared the Executive programme with Mission CS Test Series. Your success story starts today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild className="text-base px-8 py-6 bg-white text-emerald-800 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
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
    </>
  )
}
