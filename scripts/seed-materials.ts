import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding study materials...')

  // Fetch courses/subjects/chapters
  const courses = await prisma.course.findMany()
  console.log(`Found ${courses.length} courses`)

  if (courses.length === 0) {
    console.error('❌ No courses found. Please run the main seed first via POST /api/seed.')
    process.exit(1)
  }

  const cseet = courses.find((c) => c.slug === 'cseet')
  const csExec = courses.find((c) => c.slug === 'cs-executive')
  const csProf = courses.find((c) => c.slug === 'cs-professional')

  // Fetch subjects per course
  const subjects = await prisma.subject.findMany()
  const chapters = await prisma.chapter.findMany()

  const findSubject = (courseId: string, name: string) =>
    subjects.find((s) => s.courseId === courseId && s.name === name)

  const findChapter = (subjectId: string, name: string) =>
    chapters.find((c) => c.subjectId === subjectId && c.name === name)

  // Build materials list
  const materials: Array<{
    title: string
    description: string
    type: 'pdf' | 'video' | 'link' | 'document'
    url: string
    courseId?: string
    subjectId?: string
    chapterId?: string
    fileSize?: string
    duration?: string
    isActive: boolean
  }> = []

  // ─── CSEET ───
  if (cseet) {
    const bc = findSubject(cseet.id, 'Business Communication')
    const lar = findSubject(cseet.id, 'Legal Aptitude and Logical Reasoning')
    const ebe = findSubject(cseet.id, 'Economic and Business Environment')
    const ca = findSubject(cseet.id, 'Current Affairs')

    if (bc) {
      const intro = findChapter(bc.id, 'Introduction')
      const core = findChapter(bc.id, 'Core Concepts')
      materials.push(
        {
          title: 'CSEET Business Communication - Full Notes PDF',
          description: 'Comprehensive notes covering all chapters of Business Communication including principles, barriers, and effective communication techniques.',
          type: 'pdf',
          url: 'https://example.com/materials/cseet-bc-full-notes.pdf',
          courseId: cseet.id,
          subjectId: bc.id,
          chapterId: intro?.id,
          fileSize: '4.2 MB',
          isActive: true,
        },
        {
          title: 'Business Communication Video Lecture Series',
          description: 'Complete video lecture series explaining each topic with examples and case studies. Recorded by expert faculty.',
          type: 'video',
          url: 'https://example.com/materials/cseet-bc-video-lecture.mp4',
          courseId: cseet.id,
          subjectId: bc.id,
          duration: '6h 30m',
          isActive: true,
        },
        {
          title: 'Communication Barriers - Quick Revision Guide',
          description: 'Quick revision PDF summarizing types of communication barriers and how to overcome them.',
          type: 'pdf',
          url: 'https://example.com/materials/cseet-bc-revision-guide.pdf',
          courseId: cseet.id,
          subjectId: bc.id,
          chapterId: core?.id,
          fileSize: '1.1 MB',
          isActive: true,
        }
      )
    }

    if (lar) {
      materials.push(
        {
          title: 'Legal Aptitude - Logical Reasoning Practice Set',
          description: '50+ practice questions with detailed solutions for logical reasoning and legal aptitude sections.',
          type: 'document',
          url: 'https://example.com/materials/cseet-lar-practice-set.docx',
          courseId: cseet.id,
          subjectId: lar.id,
          fileSize: '2.8 MB',
          isActive: true,
        },
        {
          title: 'Indian Constitution - Reference Material Link',
          description: 'Official external link to the bare act of the Indian Constitution for quick reference during studies.',
          type: 'link',
          url: 'https://example.com/materials/indian-constitution-reference',
          courseId: cseet.id,
          subjectId: lar.id,
          isActive: true,
        }
      )
    }

    if (ebe) {
      materials.push(
        {
          title: 'Economic and Business Environment - Complete Study Material',
          description: 'Complete study material covering microeconomics, macroeconomics, and Indian business environment.',
          type: 'pdf',
          url: 'https://example.com/materials/cseet-ebe-study-material.pdf',
          courseId: cseet.id,
          subjectId: ebe.id,
          fileSize: '5.6 MB',
          isActive: true,
        }
      )
    }

    if (ca) {
      materials.push(
        {
          title: 'Current Affairs Monthly Compilation - 2024',
          description: 'Monthly current affairs compilation covering national, international, sports, and business news.',
          type: 'pdf',
          url: 'https://example.com/materials/cseet-ca-monthly-2024.pdf',
          courseId: cseet.id,
          subjectId: ca.id,
          fileSize: '3.3 MB',
          isActive: true,
        }
      )
    }
  }

  // ─── CS Executive ───
  if (csExec) {
    const cl = findSubject(csExec.id, 'Company Law')
    const tax = findSubject(csExec.id, 'Tax Laws')
    const jur = findSubject(csExec.id, 'Jurisprudence, Interpretation and General Laws')
    const sec = findSubject(csExec.id, 'Securities Law and Capital Markets')

    if (cl) {
      const intro = findChapter(cl.id, 'Introduction')
      const cases = findChapter(cl.id, 'Case Studies')
      materials.push(
        {
          title: 'Company Law Chapter 1 Video Lecture',
          description: 'Detailed video lecture covering Chapter 1 - Introduction to Company Law with practical examples.',
          type: 'video',
          url: 'https://example.com/materials/cs-exec-cl-ch1-video.mp4',
          courseId: csExec.id,
          subjectId: cl.id,
          chapterId: intro?.id,
          duration: '1h 45m',
          isActive: true,
        },
        {
          title: 'Company Law - Comprehensive Case Studies PDF',
          description: 'Collection of 75+ landmark case studies with analysis and judgments explained in simple language.',
          type: 'pdf',
          url: 'https://example.com/materials/cs-exec-cl-case-studies.pdf',
          courseId: csExec.id,
          subjectId: cl.id,
          chapterId: cases?.id,
          fileSize: '6.1 MB',
          isActive: true,
        },
        {
          title: 'Companies Act 2013 - Bare Act Reference',
          description: 'External link to the official Companies Act 2013 bare act with all amendments up to date.',
          type: 'link',
          url: 'https://example.com/materials/companies-act-2013',
          courseId: csExec.id,
          subjectId: cl.id,
          isActive: true,
        }
      )
    }

    if (tax) {
      materials.push(
        {
          title: 'Tax Laws Quick Revision Guide',
          description: 'Concise revision notes covering all key provisions of direct and indirect tax laws for last-minute revision.',
          type: 'pdf',
          url: 'https://example.com/materials/cs-exec-tax-quick-revision.pdf',
          courseId: csExec.id,
          subjectId: tax.id,
          fileSize: '2.4 MB',
          isActive: true,
        },
        {
          title: 'GST Provisions - Detailed Notes Document',
          description: 'Detailed document covering GST registration, returns, input tax credit, and compliance procedures.',
          type: 'document',
          url: 'https://example.com/materials/cs-exec-tax-gst-notes.docx',
          courseId: csExec.id,
          subjectId: tax.id,
          fileSize: '3.7 MB',
          isActive: true,
        }
      )
    }

    if (jur) {
      materials.push(
        {
          title: 'Jurisprudence - Theory and Interpretation Video',
          description: 'Video series explaining the fundamentals of jurisprudence and statutory interpretation.',
          type: 'video',
          url: 'https://example.com/materials/cs-exec-jur-video.mp4',
          courseId: csExec.id,
          subjectId: jur.id,
          duration: '4h 15m',
          isActive: true,
        }
      )
    }

    if (sec) {
      materials.push(
        {
          title: 'Securities Law - SEBI Regulations PDF',
          description: 'Complete notes on SEBI regulations including recent amendments and their implications.',
          type: 'pdf',
          url: 'https://example.com/materials/cs-exec-sec-sebi-notes.pdf',
          courseId: csExec.id,
          subjectId: sec.id,
          fileSize: '3.9 MB',
          isActive: true,
        }
      )
    }
  }

  // ─── CS Professional ───
  if (csProf) {
    const at = findSubject(csProf.id, 'Advanced Tax Laws')
    const gov = findSubject(csProf.id, 'Governance, Risk Management, Compliances and Ethics')
    const cf = findSubject(csProf.id, 'Corporate Funding and Listings')
    const audit = findSubject(csProf.id, 'Secretarial Audit, Due Diligence and Compliance Management')

    if (at) {
      materials.push(
        {
          title: 'Advanced Tax Laws Case Studies',
          description: 'Advanced case studies covering international taxation, transfer pricing, and complex tax planning scenarios.',
          type: 'pdf',
          url: 'https://example.com/materials/cs-prof-at-case-studies.pdf',
          courseId: csProf.id,
          subjectId: at.id,
          fileSize: '4.8 MB',
          isActive: true,
        },
        {
          title: 'International Taxation - Video Lecture',
          description: 'In-depth video lecture on international taxation principles, DTAA, and transfer pricing regulations.',
          type: 'video',
          url: 'https://example.com/materials/cs-prof-at-int-tax-video.mp4',
          courseId: csProf.id,
          subjectId: at.id,
          duration: '3h 20m',
          isActive: true,
        }
      )
    }

    if (gov) {
      materials.push(
        {
          title: 'Governance Risk Management - Complete Study Pack',
          description: 'Complete study pack covering ESG, risk frameworks, compliance management, and business ethics.',
          type: 'document',
          url: 'https://example.com/materials/cs-prof-gov-study-pack.docx',
          courseId: csProf.id,
          subjectId: gov.id,
          fileSize: '5.2 MB',
          isActive: true,
        }
      )
    }

    if (cf) {
      materials.push(
        {
          title: 'Corporate Funding - IPO Process Reference',
          description: 'External link to SEBI guidelines on IPO process, listing requirements, and corporate funding options.',
          type: 'link',
          url: 'https://example.com/materials/corporate-funding-ipo-reference',
          courseId: csProf.id,
          subjectId: cf.id,
          isActive: true,
        }
      )
    }

    if (audit) {
      materials.push(
        {
          title: 'Secretarial Audit - Checklist and Templates',
          description: 'Ready-to-use checklists and templates for conducting secretarial audit and due diligence.',
          type: 'pdf',
          url: 'https://example.com/materials/cs-prof-audit-checklist.pdf',
          courseId: csProf.id,
          subjectId: audit.id,
          fileSize: '1.8 MB',
          isActive: true,
        }
      )
    }
  }

  // General / cross-course material
  materials.push({
    title: 'CS Exam Preparation Strategy - Master Guide',
    description: 'A comprehensive guide on how to plan and execute your CS exam preparation effectively. Covers time management, revision strategy, and exam-day tips.',
    type: 'pdf',
    url: 'https://example.com/materials/cs-exam-strategy-master-guide.pdf',
    fileSize: '2.6 MB',
    isActive: true,
  })

  // Insert materials (skip if title already exists to make idempotent)
  let inserted = 0
  let skipped = 0
  for (const m of materials) {
    const existing = await prisma.studyMaterial.findFirst({ where: { title: m.title } })
    if (existing) {
      skipped++
      continue
    }
    await prisma.studyMaterial.create({ data: m })
    inserted++
  }

  console.log(`✅ Inserted ${inserted} materials, skipped ${skipped} (already existed).`)
  console.log(`📊 Total materials in database: ${await prisma.studyMaterial.count()}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
