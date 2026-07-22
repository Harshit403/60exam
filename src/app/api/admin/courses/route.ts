import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/courses
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const search = req.nextUrl.searchParams.get('search') || ''
  const where: any = {}
  if (search) {
    where.OR = [{ title: { contains: search } }, { slug: { contains: search } }]
  }
  
  const courses = await db.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { students: true, subjects: true } } }
  })
  return NextResponse.json({ courses })
}

// POST /api/admin/courses
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { title, slug } = await req.json()
  const existing = await db.course.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
  
  const course = await db.course.create({ data: { title, slug } })
  return NextResponse.json({ course })
}
