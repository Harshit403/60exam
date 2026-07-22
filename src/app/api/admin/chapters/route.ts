import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/chapters
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const search = req.nextUrl.searchParams.get('search') || ''
  const subjectId = req.nextUrl.searchParams.get('subjectId') || ''
  const courseId = req.nextUrl.searchParams.get('courseId') || ''
  const where: any = {}
  if (search) where.OR = [{ name: { contains: search } }]
  if (subjectId) where.subjectId = subjectId
  if (courseId) where.subject = { courseId }
  
  const chapters = await db.chapter.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { subject: { include: { course: true } } }
  })
  return NextResponse.json({ chapters })
}

// POST /api/admin/chapters
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { name, subjectId } = await req.json()
  const chapter = await db.chapter.create({ data: { name, subjectId }, include: { subject: { include: { course: true } } } })
  return NextResponse.json({ chapter })
}
