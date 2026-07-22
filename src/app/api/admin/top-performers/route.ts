import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/top-performers
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search') || ''
  const period = req.nextUrl.searchParams.get('period') || 'all'
  const fromParam = req.nextUrl.searchParams.get('from')
  const toParam = req.nextUrl.searchParams.get('to')

  // Compute date range in IST (UTC+5:30)
  const IST_OFFSET = 5.5 * 60 * 60 * 1000
  const now = new Date()
  const istNow = new Date(now.getTime() + IST_OFFSET)
  const iYear = istNow.getUTCFullYear()
  const iMonth = istNow.getUTCMonth()
  const iDate = istNow.getUTCDate()

  let dateFrom: Date | null = null
  let dateTo: Date | null = null

  if (fromParam && toParam) {
    dateFrom = new Date(fromParam)
    dateTo = new Date(toParam)
    dateTo.setHours(23, 59, 59, 999)
  } else {
    switch (period) {
      case 'today':
        dateFrom = new Date(Date.UTC(iYear, iMonth, iDate, 0, 0, 0, 0).valueOf() - IST_OFFSET)
        dateTo = new Date(Date.UTC(iYear, iMonth, iDate, 23, 59, 59, 999).valueOf() - IST_OFFSET)
        break
      case 'yesterday':
        dateFrom = new Date(Date.UTC(iYear, iMonth, iDate - 1, 0, 0, 0, 0).valueOf() - IST_OFFSET)
        dateTo = new Date(Date.UTC(iYear, iMonth, iDate - 1, 23, 59, 59, 999).valueOf() - IST_OFFSET)
        break
      case 'weekly':
        dateFrom = new Date(Date.UTC(iYear, iMonth, iDate - 6, 0, 0, 0, 0).valueOf() - IST_OFFSET)
        dateTo = new Date(Date.UTC(iYear, iMonth, iDate, 23, 59, 59, 999).valueOf() - IST_OFFSET)
        break
      case 'monthly':
        dateFrom = new Date(Date.UTC(iYear, iMonth, iDate - 29, 0, 0, 0, 0).valueOf() - IST_OFFSET)
        dateTo = new Date(Date.UTC(iYear, iMonth, iDate, 23, 59, 59, 999).valueOf() - IST_OFFSET)
        break
    }
  }

  const studentWhere: any = { status: 'approved' }
  if (search) {
    studentWhere.OR = [{ fullName: { contains: search } }, { email: { contains: search } }, { mobile: { contains: search } }]
  }

  if (dateFrom && dateTo) {
    // Filter by study sessions in date range
    const studentsWithSessions = await db.studySession.findMany({
      where: {
        date: { gte: dateFrom, lte: dateTo },
        student: { status: 'approved', ...(search ? {
          OR: [{ fullName: { contains: search } }, { email: { contains: search } }, { mobile: { contains: search } }]
        } : {}) }
      },
      select: { studentId: true, durationMin: true, chapterId: true, student: { select: { id: true, fullName: true, mobile: true, email: true, course: { select: { title: true } }, chapterCompletions: { select: { chapterId: true } } } } }
    })

    const grouped: Record<string, { minutes: number; chapters: Set<string>; student: any }> = {}
    for (const s of studentsWithSessions) {
      if (!grouped[s.studentId]) grouped[s.studentId] = { minutes: 0, chapters: new Set(), student: s.student }
      grouped[s.studentId].minutes += s.durationMin
      if (s.chapterId) grouped[s.studentId].chapters.add(s.chapterId)
    }

    const result = Object.values(grouped)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 50)
      .map(g => ({
        id: g.student.id,
        name: g.student.fullName,
        mobile: g.student.mobile,
        email: g.student.email,
        course: g.student.course?.title || '—',
        studyHours: Math.floor(g.minutes / 60),
        studyMinutes: g.minutes,
        subjectsStudied: g.student.chapterCompletions.length
      }))

    return NextResponse.json({ performers: result })
  }

  // All time: use totalStudyMin from Student model
  const performers = await db.student.findMany({
    where: studentWhere,
    orderBy: { totalStudyMin: 'desc' },
    take: 50,
    include: {
      course: true,
      chapterCompletions: { select: { chapterId: true } }
    }
  })

  const result = performers.map(p => ({
    id: p.id,
    name: p.fullName,
    mobile: p.mobile,
    email: p.email,
    course: p.course?.title || '—',
    studyHours: Math.floor(p.totalStudyMin / 60),
    studyMinutes: p.totalStudyMin,
    subjectsStudied: p.chapterCompletions.length
  }))

  return NextResponse.json({ performers: result })
}
