import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { getISTTodayStart } from '@/lib/date-utils'

// GET /api/student/study-plan
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const dateStr = req.nextUrl.searchParams.get('date')
  
  if (dateStr) {
    const date = new Date(dateStr)
    const nextDay = new Date(date.getTime() + 86400000)
    const plans = await db.studyPlan.findMany({
      where: { studentId: auth.id, plannedDate: { gte: date, lt: nextDay } },
      include: { chapter: { include: { subject: true } } },
      orderBy: { plannedDate: 'asc' }
    })
    return NextResponse.json({ plans })
  }
  
  // Get all upcoming plans
  const todayStart = getISTTodayStart()
  const plans = await db.studyPlan.findMany({
    where: { studentId: auth.id, plannedDate: { gte: todayStart } },
    include: { chapter: { include: { subject: true } } },
    orderBy: { plannedDate: 'asc' }
  })
  
  return NextResponse.json({ plans })
}

// POST /api/student/study-plan
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { chapterId, notes, plannedDate } = await req.json()
  
  const plan = await db.studyPlan.create({
    data: {
      studentId: auth.id,
      chapterId: chapterId || null,
      notes: notes || null,
      plannedDate: new Date(plannedDate)
    },
    include: { chapter: { include: { subject: true } } }
  })
  
  return NextResponse.json({ plan })
}
