import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/student/reviews - Student's own reviews
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reviews = await db.review.findMany({
    where: { studentId: auth.id },
    orderBy: { createdAt: 'desc' },
    include: { course: true }
  })

  return NextResponse.json({ reviews })
}

// POST /api/student/reviews
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { text, rating, courseId } = await req.json()
  
  const student = await db.student.findUnique({ where: { id: auth.id } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  
  const review = await db.review.create({
    data: {
      authorName: student.fullName,
      text,
      rating,
      courseId: courseId || null,
      studentId: auth.id,
      source: 'student',
      status: 'pending' // Requires admin approval
    }
  })
  
  return NextResponse.json({ review, message: 'Review submitted for admin approval' })
}
