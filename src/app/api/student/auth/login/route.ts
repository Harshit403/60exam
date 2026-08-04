import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comparePassword, generateToken } from '@/lib/auth'

// POST /api/student/auth/login
export async function POST(req: NextRequest) {
  try {
    const { emailOrMobile, password } = await req.json()
    
    const student = await db.student.findFirst({
      where: { OR: [{ email: emailOrMobile }, { mobile: emailOrMobile }] },
      include: { course: true }
    })
    
    if (!student) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    if (student.status === 'pending') return NextResponse.json({ error: 'Your registration is pending approval' }, { status: 403 })
    if (student.status === 'rejected') return NextResponse.json({ error: 'Your registration has been rejected' }, { status: 403 })
    
    const valid = await comparePassword(password, student.password)
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    // Log sign-in IP against the student
    try {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers.get('x-real-ip') || 'unknown')
      await db.ipLog.create({
        data: {
          studentId: student.id,
          ipAddress: ip,
          path: '/student/auth/login',
          userAgent: req.headers.get('user-agent') || null,
          action: 'login',
        },
      })
    } catch { /* ip logging must not break login */ }

    const token = generateToken({ id: student.id, role: 'student', email: student.email })
    
    return NextResponse.json({
      token,
      user: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        mobile: student.mobile,
        role: 'student',
        courseId: student.courseId,
        course: student.course,
        score: student.score,
        totalStudyMin: student.totalStudyMin,
        currentStreak: student.currentStreak,
        verified: student.verified
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
