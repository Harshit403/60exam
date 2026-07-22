import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/subjects
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const search = req.nextUrl.searchParams.get('search') || ''
  const courseId = req.nextUrl.searchParams.get('courseId') || ''
  const where: any = {}
  if (search) where.OR = [{ name: { contains: search } }]
  if (courseId) where.courseId = courseId
  
  const subjects = await db.subject.findMany({
    where,
    orderBy: [{ orderNum: 'asc' }, { createdAt: 'desc' }],
    include: { course: true, _count: { select: { chapters: true } } }
  })
  return NextResponse.json({ subjects })
}

// POST /api/admin/subjects
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { name, courseId, orderNum } = await req.json()
  const subject = await db.subject.create({ data: { name, courseId, orderNum: orderNum || 0 }, include: { course: true } })
  return NextResponse.json({ subject })
}
