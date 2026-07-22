import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders, hashPassword } from '@/lib/auth'

// GET /api/admin/students
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const search = req.nextUrl.searchParams.get('search') || ''
  const where: any = {}
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } },
      { mobile: { contains: search } }
    ]
  }
  
  const students = (await db.student.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { course: true }
  })).map(s => ({ ...s, name: s.fullName }))
  
  return NextResponse.json({ students })
}

// POST /api/admin/students
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = await req.json()
  const fullName = body.fullName || body.name
  const { email, mobile, password, courseId } = body
  
  const existing = await db.student.findFirst({
    where: { OR: [{ email }, { mobile }] }
  })
  if (existing) return NextResponse.json({ error: 'Email or mobile already exists' }, { status: 400 })
  
  const hashedPassword = await hashPassword(password)
  const student = await db.student.create({
    data: { fullName, email, mobile, password: hashedPassword, courseId, status: 'approved' },
    include: { course: true }
  })
  
  return NextResponse.json({ student: { ...student, name: student.fullName } })
}
