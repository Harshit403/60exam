import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, comparePassword, generateToken } from '@/lib/auth'

// POST /api/student/auth/signup
export async function POST(req: NextRequest) {
  try {
    const { fullName, email, mobile, password, courseId } = await req.json()
    
    if (!fullName || !email || !mobile || !password || !courseId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    
    const existing = await db.student.findFirst({
      where: { OR: [{ email }, { mobile }] }
    })
    if (existing) return NextResponse.json({ error: 'Email or mobile already registered' }, { status: 400 })
    
    const setting = await db.setting.findUnique({ where: { key: 'signup_approval' } })
    const approvalEnabled = setting?.value === 'true'
    
    const hashedPassword = await hashPassword(password)
    const student = await db.student.create({
      data: {
        fullName,
        email,
        mobile,
        password: hashedPassword,
        courseId,
        status: approvalEnabled ? 'pending' : 'approved'
      },
      include: { course: true }
    })

    // Log sign-up IP against the student
    try {
      const forwarded = req.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers.get('x-real-ip') || 'unknown')
      await db.ipLog.create({
        data: {
          studentId: student.id,
          ipAddress: ip,
          path: '/student/auth/signup',
          userAgent: req.headers.get('user-agent') || null,
          action: 'signup',
        },
      })
    } catch { /* ip logging must not break signup */ }
    
    if (approvalEnabled) {
      return NextResponse.json({
        message: 'Your registration is pending approval. Please wait for admin approval.',
        status: 'pending'
      })
    }
    
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
        course: student.course
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
