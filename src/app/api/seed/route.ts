import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { ACHIEVEMENT_TIERS } from '@/lib/achievements'

// POST /api/seed - Seeds the database with initial data
export async function POST() {
  try {
    // Create admin
    const existingAdmin = await db.admin.findFirst()
    if (!existingAdmin) {
      const hash = await hashPassword('admin123')
      await db.admin.create({
        data: { email: 'admin@missioncs.com', password: hash, name: 'Admin' }
      })
    }
    
    // Create courses
    const courses = [
      { title: 'CSEET Test Series', slug: 'cseet' },
      { title: 'CS Executive Test Series', slug: 'cs-executive' },
      { title: 'CS Professional Test Series', slug: 'cs-professional' }
    ]
    
    for (const course of courses) {
      const existing = await db.course.findUnique({ where: { slug: course.slug } })
      if (!existing) {
        await db.course.create({ data: course })
      }
    }
    
    // Create achievements
    const existingAchievements = await db.achievement.findMany()
    if (existingAchievements.length === 0) {
      for (const tier of ACHIEVEMENT_TIERS) {
        await db.achievement.create({
          data: {
            name: tier.name,
            description: tier.description,
            threshold: tier.threshold,
            icon: tier.icon,
            order: tier.order
          }
        })
      }
    }
    
    // Create some sample reviews
    const existingReviews = await db.review.count()
    if (existingReviews === 0) {
      const cseet = await db.course.findUnique({ where: { slug: 'cseet' } })
      const csExec = await db.course.findUnique({ where: { slug: 'cs-executive' } })
      const csProf = await db.course.findUnique({ where: { slug: 'cs-professional' } })
      
      const sampleReviews = [
        { authorName: 'Priya Sharma', text: 'Mission CS Test Series helped me clear CSEET with flying colors! The evaluation is thorough and the feedback is incredibly detailed.', rating: 5, courseId: cseet?.id, source: 'admin', status: 'approved' },
        { authorName: 'Rahul Verma', text: 'The CS Executive test series is the best I have tried. Questions are exam-oriented and cover the entire syllabus comprehensively.', rating: 5, courseId: csExec?.id, source: 'admin', status: 'approved' },
        { authorName: 'Anjali Patel', text: 'I achieved AIR 9 in CS Professional thanks to Mission CS. The mock tests simulate real exam conditions perfectly.', rating: 5, courseId: csProf?.id, source: 'admin', status: 'approved' },
        { authorName: 'Vikram Singh', text: 'Excellent test series with prompt evaluation. The 24-hour evaluation turnaround is a game-changer for quick revision.', rating: 4, courseId: csExec?.id, source: 'admin', status: 'approved' },
        { authorName: 'Meera Joshi', text: 'The structured approach of Mission CS helped me stay consistent with my preparation. Highly recommended!', rating: 5, courseId: cseet?.id, source: 'admin', status: 'approved' },
        { authorName: 'Arjun Kumar', text: 'Best investment for CS exam preparation. The detailed feedback on each answer helps identify weak areas effectively.', rating: 5, courseId: csProf?.id, source: 'admin', status: 'approved' },
      ]
      
      for (const review of sampleReviews) {
        if (review.courseId) {
          await db.review.create({ data: review })
        }
      }
    }
    
    // Create settings
    const existingSettings = await db.setting.findUnique({ where: { key: 'signup_approval' } })
    if (!existingSettings) {
      await db.setting.create({ data: { key: 'signup_approval', value: 'false' } })
    }
    
    // Add some sample subjects and chapters for CSEET
    const cseet = await db.course.findUnique({ where: { slug: 'cseet' } })
    if (cseet) {
      const cseetSubjects = [
        { name: 'Business Communication', courseId: cseet.id, orderNum: 1 },
        { name: 'Legal Aptitude and Logical Reasoning', courseId: cseet.id, orderNum: 2 },
        { name: 'Economic and Business Environment', courseId: cseet.id, orderNum: 3 },
        { name: 'Current Affairs', courseId: cseet.id, orderNum: 4 },
      ]
      
      for (const sub of cseetSubjects) {
        const existing = await db.subject.findFirst({ where: { name: sub.name, courseId: sub.courseId } })
        if (!existing) {
          const subject = await db.subject.create({ data: sub })
          // Add sample chapters
          const chapters = [
            'Introduction', 'Core Concepts', 'Advanced Topics', 'Practice & Revision', 'Mock Test Preparation'
          ]
          for (const chap of chapters) {
            const existingChap = await db.chapter.findFirst({ where: { name: chap, subjectId: subject.id } })
            if (!existingChap) {
              await db.chapter.create({ data: { name: chap, subjectId: subject.id } })
            }
          }
        }
      }
    }
    
    // Add some sample subjects for CS Executive
    const csExec = await db.course.findUnique({ where: { slug: 'cs-executive' } })
    if (csExec) {
      const csExecSubjects = [
        { name: 'Jurisprudence, Interpretation and General Laws', courseId: csExec.id, orderNum: 1 },
        { name: 'Company Law', courseId: csExec.id, orderNum: 2 },
        { name: 'Setting up of Business Entities and Closure', courseId: csExec.id, orderNum: 3 },
        { name: 'Tax Laws', courseId: csExec.id, orderNum: 4 },
        { name: 'Corporate Accounting and Financial Management', courseId: csExec.id, orderNum: 5 },
        { name: 'Securities Law and Capital Markets', courseId: csExec.id, orderNum: 6 },
      ]
      
      for (const sub of csExecSubjects) {
        const existing = await db.subject.findFirst({ where: { name: sub.name, courseId: sub.courseId } })
        if (!existing) {
          const subject = await db.subject.create({ data: sub })
          const chapters = ['Introduction', 'Core Provisions', 'Case Studies', 'Practice Problems', 'Revision Summary']
          for (const chap of chapters) {
            const existingChap = await db.chapter.findFirst({ where: { name: chap, subjectId: subject.id } })
            if (!existingChap) {
              await db.chapter.create({ data: { name: chap, subjectId: subject.id } })
            }
          }
        }
      }
    }
    
    // Add some sample subjects for CS Professional
    const csProf = await db.course.findUnique({ where: { slug: 'cs-professional' } })
    if (csProf) {
      const csProfSubjects = [
        { name: 'Governance, Risk Management, Compliances and Ethics', courseId: csProf.id, orderNum: 1 },
        { name: 'Advanced Tax Laws', courseId: csProf.id, orderNum: 2 },
        { name: 'Corporate Funding and Listings', courseId: csProf.id, orderNum: 3 },
        { name: 'Secretarial Audit, Due Diligence and Compliance Management', courseId: csProf.id, orderNum: 4 },
      ]
      
      for (const sub of csProfSubjects) {
        const existing = await db.subject.findFirst({ where: { name: sub.name, courseId: sub.courseId } })
        if (!existing) {
          const subject = await db.subject.create({ data: sub })
          const chapters = ['Overview', 'Detailed Study', 'Practical Application', 'Case Laws', 'Exam Preparation']
          for (const chap of chapters) {
            const existingChap = await db.chapter.findFirst({ where: { name: chap, subjectId: subject.id } })
            if (!existingChap) {
              await db.chapter.create({ data: { name: chap, subjectId: subject.id } })
            }
          }
        }
      }
    }
    
    // Seed sample quizzes with questions
    const existingQuizzes = await db.quiz.count()
    if (existingQuizzes === 0 && cseet && csExec && csProf) {
      const cseetSubj = await db.subject.findFirst({ where: { courseId: cseet.id, name: 'Business Communication' } })
      const csExecSubj = await db.subject.findFirst({ where: { courseId: csExec.id, name: 'Company Law' } })
      const csProfSubj = await db.subject.findFirst({ where: { courseId: csProf.id, name: 'Advanced Tax Laws' } })

      const quizData = [
        {
          title: 'CSEET Business Communication Basics',
          description: 'Test your fundamentals of business communication',
          courseId: cseet.id, subjectId: cseetSubj?.id, difficulty: 'easy', points: 10,
          questions: [
            { text: 'Which of the following is the most formal mode of communication?', options: JSON.stringify(['Email', 'Business letter', 'Phone call', 'Text message']), correctIdx: 1, explanation: 'Business letters are formal documents used for official communication.' },
            { text: 'What does "7 Cs of Communication" refer to?', options: JSON.stringify(['Clear, Concise, Concrete, Correct, Coherent, Complete, Courteous', 'Seven Channels of Communication', 'Seven Company Codes', 'Seven Communication Styles']), correctIdx: 0, explanation: 'The 7 Cs are principles for effective communication.' },
            { text: 'Which is NOT a type of non-verbal communication?', options: JSON.stringify(['Body language', 'Facial expressions', 'Email tone', 'Eye contact']), correctIdx: 2, explanation: 'Email tone falls under written/verbal communication.' },
            { text: 'A memo is typically used for:', options: JSON.stringify(['External communication', 'Internal communication', 'Marketing', 'Public relations']), correctIdx: 1, explanation: 'Memos are internal documents for organizational communication.' },
            { text: 'Which communication barrier involves different meanings of words?', options: JSON.stringify(['Physical barrier', 'Semantic barrier', 'Psychological barrier', 'Organizational barrier']), correctIdx: 1, explanation: 'Semantic barriers relate to language and word meanings.' },
          ],
        },
        {
          title: 'Company Law Fundamentals',
          description: 'Essential concepts of Indian Company Law',
          courseId: csExec.id, subjectId: csExecSubj?.id, difficulty: 'medium', points: 15,
          questions: [
            { text: 'The Companies Act, 2013 replaced which previous Act?', options: JSON.stringify(['Companies Act, 1956', 'Companies Act, 1965', 'Companies Act, 1972', 'Companies Act, 1988']), correctIdx: 0, explanation: 'The 2013 Act replaced the Companies Act, 1956.' },
            { text: 'Minimum number of members required to form a private company?', options: JSON.stringify(['2', '3', '5', '7']), correctIdx: 0, explanation: 'A private company requires minimum 2 members.' },
            { text: 'What is the maximum number of members in a private company?', options: JSON.stringify(['50', '100', '200', 'No limit']), correctIdx: 2, explanation: 'A private company can have maximum 200 members (excluding employee-members).' },
            { text: 'Which type of company can issue shares to the public?', options: JSON.stringify(['Private Company', 'Public Company', 'One Person Company', 'Section 8 Company']), correctIdx: 1, explanation: 'Only public companies can issue shares to the public.' },
            { text: 'Annual General Meeting (AGM) must be held:', options: JSON.stringify(['Every 6 months', 'Once a year', 'Every 2 years', 'As decided by directors']), correctIdx: 1, explanation: 'AGM must be held once every calendar year.' },
            { text: 'DIN stands for:', options: JSON.stringify(['Director Identification Number', 'Direct Income Number', 'Document Index Number', 'Departmental Issue Note']), correctIdx: 0, explanation: 'DIN is a unique identification number for directors.' },
          ],
        },
        {
          title: 'Advanced Tax Laws Quiz',
          description: 'Test your knowledge of advanced tax concepts',
          courseId: csProf.id, subjectId: csProfSubj?.id, difficulty: 'hard', points: 20,
          questions: [
            { text: 'GST in India was implemented from which date?', options: JSON.stringify(['1 April 2017', '1 July 2017', '1 October 2017', '1 January 2018']), correctIdx: 1, explanation: 'GST was implemented from 1st July 2017.' },
            { text: 'What are the GST slabs in India?', options: JSON.stringify(['5%, 12%, 18%, 28%', '5%, 10%, 15%, 20%', '0%, 5%, 15%, 25%', '0%, 5%, 12%, 18%, 28%']), correctIdx: 3, explanation: 'GST has multiple slabs: 0%, 5%, 12%, 18%, 28%.' },
            { text: 'Which tax was NOT subsumed by GST?', options: JSON.stringify(['Service Tax', 'VAT', 'Excise Duty', 'Income Tax']), correctIdx: 3, explanation: 'Income Tax is a direct tax and was not subsumed by GST.' },
            { text: 'The threshold for GST registration for goods (general category states) is:', options: JSON.stringify(['10 lakh', '20 lakh', '40 lakh', '50 lakh']), correctIdx: 2, explanation: 'For goods, the threshold is Rs. 40 lakh in general category states.' },
            { text: 'GSTR-1 is filed for:', options: JSON.stringify(['Outward supplies', 'Inward supplies', 'Tax payment', 'Annual return']), correctIdx: 0, explanation: 'GSTR-1 is a monthly return for outward supplies.' },
            { text: 'Input Tax Credit (ITC) can be claimed on:', options: JSON.stringify(['All purchases', 'Business purchases only', 'Personal purchases', 'Capital goods only']), correctIdx: 1, explanation: 'ITC can be claimed only on business-related purchases.' },
            { text: 'Which document is mandatory for inter-state movement of goods above Rs. 50,000?', options: JSON.stringify(['Invoice', 'E-way bill', 'GST receipt', 'Delivery challan']), correctIdx: 1, explanation: 'E-way bill is mandatory for inter-state consignments above Rs. 50,000.' },
          ],
        },
        {
          title: 'General Knowledge & Current Affairs',
          description: 'Daily quiz to boost your general awareness',
          courseId: null, subjectId: null, difficulty: 'easy', points: 5,
          questions: [
            { text: 'Who is the current President of India (as of 2024)?', options: JSON.stringify(['Ram Nath Kovind', 'Droupadi Murmu', 'Pranab Mukherjee', 'Pratibha Patil']), correctIdx: 1, explanation: 'Droupadi Murmu became the 15th President of India in July 2022.' },
            { text: 'What is the currency of Japan?', options: JSON.stringify(['Yuan', 'Yen', 'Won', 'Ringgit']), correctIdx: 1, explanation: 'The Japanese Yen is the official currency of Japan.' },
            { text: 'Which planet is known as the "Red Planet"?', options: JSON.stringify(['Venus', 'Jupiter', 'Mars', 'Saturn']), correctIdx: 2, explanation: 'Mars is called the Red Planet due to its reddish appearance.' },
            { text: 'The Reserve Bank of India was established in:', options: JSON.stringify(['1932', '1935', '1947', '1950']), correctIdx: 1, explanation: 'The RBI was established on 1 April 1935.' },
            { text: 'Which is the longest river in India?', options: JSON.stringify(['Yamuna', 'Ganga', 'Godavari', 'Brahmaputra']), correctIdx: 1, explanation: 'Ganga is the longest river in India at about 2,525 km.' },
          ],
        },
      ]

      for (const qd of quizData) {
        const { questions, ...quizFields } = qd
        const quiz = await db.quiz.create({ data: quizFields as any })
        for (const q of questions) {
          await db.question.create({ data: { ...q, quizId: quiz.id } })
        }
      }
    }

    return NextResponse.json({ message: 'Database seeded successfully!', adminEmail: 'admin@missioncs.com', adminPassword: 'admin123' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
