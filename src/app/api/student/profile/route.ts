import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/student/profile
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const student = await db.student.findUnique({
    where: { id: auth.id },
    include: { course: true }
  })
  
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  
  return NextResponse.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      mobile: student.mobile,
      courseId: student.courseId,
      course: student.course,
      score: student.score,
      totalStudyMin: student.totalStudyMin,
      currentStreak: student.currentStreak,
      verified: student.verified
    }
  })
}

// PUT /api/student/profile
export async function PUT(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { fullName, courseId } = await req.json()
  
  const student = await db.student.update({
    where: { id: auth.id },
    data: { fullName, courseId },
    include: { course: true }
  })
  
  return NextResponse.json({ student })
}
