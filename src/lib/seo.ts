import { useEffect } from 'react'

const SITE_URL = 'https://missioncstestseries.com'

export interface PageMeta {
  title: string
  description: string
  path: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
}

const defaults: PageMeta = {
  title: "MISSION CS Test Series - India's Premier CS Exam Preparation Platform",
  description:
    'Join 20,000+ CS aspirants preparing with Mission CS Test Series. Comprehensive test series for CSEET, CS Executive, and CS Professional with 24-hour evaluation, expert feedback, and proven results including AIR 8 & 9.',
  path: '/',
}

export const pageMeta: Record<string, PageMeta> = {
  landing: defaults,
  reviews: {
    title: 'Student Reviews - MISSION CS Test Series',
    description:
      'Read genuine reviews and success stories from 20,000+ CS aspirants who cleared CSEET, CS Executive, and CS Professional exams with Mission CS Test Series. See why students trust our mock tests.',
    path: '/?view=reviews',
    ogTitle: 'Student Reviews & Success Stories | MISSION CS Test Series',
  },
  discussions: {
    title: 'Discussion Forum - MISSION CS Test Series',
    description:
      'Join the CS community discussion forum. Ask doubts, share preparation strategies, and connect with fellow CSEET, CS Executive, and CS Professional aspirants and faculty.',
    path: '/?view=discussions',
    ogTitle: 'CS Exam Discussion Forum | MISSION CS Test Series',
  },
  'cs-executive': {
    title: 'CS Executive Test Series 2026 - ICSI New Syllabus (2022) | MISSION CS',
    description:
      'ICSI CS Executive test series covering all 7 papers under Syllabus 2022 — JIGL, Company Law, Setting Up of Business, Corporate Accounting, Capital Market & Securities Laws, Economic & IP Laws, Tax Laws. 24-hr evaluation by qualified CS professionals. Enroll now.',
    path: '/?view=cs-executive',
    ogTitle: 'CS Executive Mock Tests 2026 | ICSI Syllabus 2022 | MISSION CS',
    ogDescription: 'Master all 7 papers of the CS Executive programme (ICSI Syllabus 2022) with expert-evaluated test series. Group 1: JIGL, Company Law, Setting Up of Business, Corporate Accounting. Group 2: Capital Market, Economic & IP Laws, Tax Laws.',
  },
  'cs-professional': {
    title: 'CS Professional Test Series 2026 - ESG, Drafting, Compliance | MISSION CS',
    description:
      'Comprehensive CS Professional test series under ICSI Syllabus 2022 covering ESG, Drafting & Pleadings, Compliance Management & Audit, Strategic Management & Corporate Finance, Corporate Restructuring & Insolvency, plus elective papers. Open-book elective mock tests included.',
    path: '/?view=cs-professional',
    ogTitle: 'CS Professional Mock Tests 2026 | ESG to Insolvency | MISSION CS',
    ogDescription: 'Prepare for CS Professional with expert-evaluated test series covering all 7 papers including ESG Principles, Drafting & Pleadings, Compliance Management, Strategic Management, Corporate Restructuring, and 6 elective options under ICSI Syllabus 2022.',
  },
  signin: {
    title: 'Sign In - MISSION CS Test Series',
    description: 'Sign in to your MISSION CS Test Series account to access mock tests, track your progress, and continue your CS exam preparation journey.',
    path: '/?view=signin',
  },
  signup: {
    title: 'Sign Up - MISSION CS Test Series',
    description: 'Create your free MISSION CS Test Series account. Start practicing with India\'s premier CS exam mock tests for CSEET, CS Executive, and CS Professional.',
    path: '/?view=signup',
  },
  'forgot-password': {
    title: 'Forgot Password - MISSION CS Test Series',
    description: 'Reset your MISSION CS Test Series account password. Enter your registered email to receive an OTP and create a new password.',
    path: '/?view=forgot-password',
  },
}

export function usePageMeta(key: string) {
  const meta = pageMeta[key] || defaults
  useEffect(() => {
    document.title = meta.title
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', meta.description)
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', meta.ogTitle || meta.title)
    const ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) ogDesc.setAttribute('content', meta.ogDescription || meta.description)
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute('content', `${SITE_URL}${meta.path}`)
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.setAttribute('href', `${SITE_URL}${meta.path}`)
  }, [meta])
}
