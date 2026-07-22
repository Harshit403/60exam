import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders, hashPassword } from '@/lib/auth'

// GET /api/admin/students/[id] - Full student profile
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const student = await db.student.findUnique({
    where: { id },
    include: {
      course: true,
      studySessions: { orderBy: { date: 'desc' }, take: 20 },
      quizAttempts: { include: { quiz: { select: { title: true, difficulty: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
      chapterCompletions: { include: { chapter: { select: { name: true, subject: { select: { name: true } } } } }, orderBy: { completedAt: 'desc' } },
      achievements: { include: { achievement: true }, orderBy: { unlockedAt: 'desc' } },
      discussions: { orderBy: { createdAt: 'desc' }, take: 10 },
      reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
      notes: { orderBy: { updatedAt: 'desc' }, take: 10 },
      groupMemberships: { where: { leftAt: null }, include: { group: { select: { name: true } } } },
      studyPlans: { orderBy: { plannedDate: 'desc' }, take: 10 },
    }
  })

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const totalStudySessions = await db.studySession.count({ where: { studentId: id } })
  const totalQuizAttempts = await db.quizAttempt.count({ where: { studentId: id } })
  const passedQuizzes = await db.quizAttempt.count({ where: { studentId: id, passed: true } })
  const totalDiscussions = await db.discussion.count({ where: { studentId: id, parentReplyId: null } })
  const totalReviews = await db.review.count({ where: { studentId: id } })
  const totalNotes = await db.note.count({ where: { studentId: id } })

  return NextResponse.json({
    student: {
      ...student,
      name: student.fullName,
      _stats: {
        totalStudySessions,
        totalStudyMin: student.totalStudyMin,
        totalQuizAttempts,
        passedQuizzes,
        avgScore: totalQuizAttempts > 0
          ? Math.round(student.quizAttempts.reduce((s, a) => s + (a.score / Math.max(1, a.totalQuestions)) * 100, 0) / totalQuizAttempts)
          : 0,
        totalChaptersCompleted: student.chapterCompletions.length,
        totalDiscussions,
        totalReviews,
        totalNotes,
      }
    }
  })
}

// PUT /api/admin/students/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params
  const body = await req.json()
  if (body.name) { body.fullName = body.name; delete body.name }
  
  const student = await db.student.update({
    where: { id },
    data: body,
    include: { course: true }
  })
  
  return NextResponse.json({ student: { ...student, name: student.fullName } })
}

// DELETE /api/admin/students/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params
  await db.student.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
