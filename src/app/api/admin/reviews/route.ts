import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/reviews
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const search = req.nextUrl.searchParams.get('search') || ''
  const where: any = {}
  if (search) where.OR = [{ authorName: { contains: search } }, { text: { contains: search } }]
  
  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { course: true, student: true }
  })
  return NextResponse.json({ reviews })
}

// POST /api/admin/reviews
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { authorName, text, rating, courseId } = await req.json()
  const review = await db.review.create({
    data: { authorName, text, rating, courseId: courseId || null, source: 'admin', status: 'approved' },
    include: { course: true }
  })
  return NextResponse.json({ review })
}
