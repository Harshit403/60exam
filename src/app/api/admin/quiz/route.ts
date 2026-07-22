import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/admin/quiz - List all quizzes
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quizzes = await db.quiz.findMany({
      include: {
        _count: { select: { questions: true, attempts: true } },
        course: { select: { title: true } },
        subject: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      quizzes: quizzes.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        points: q.points,
        isActive: q.isActive,
        courseTitle: q.course?.title || null,
        subjectName: q.subject?.name || null,
        questionsCount: q._count.questions,
        attemptsCount: q._count.attempts,
        createdAt: q.createdAt,
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/quiz - Create a new quiz with questions
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, courseId, subjectId, difficulty, points, isActive, questions } = await req.json()
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Title and at least one question are required' }, { status: 400 })
    }

    const quiz = await db.quiz.create({
      data: {
        title,
        description: description || null,
        courseId: courseId || null,
        subjectId: subjectId || null,
        difficulty: difficulty || 'medium',
        points: points || 10,
        isActive: isActive !== false,
        questions: {
          create: questions.map((q: any) => ({
            text: q.text,
            options: JSON.stringify(q.options),
            correctIdx: q.correctIdx,
            explanation: q.explanation || null,
          }))
        }
      },
      include: { questions: true }
    })

    return NextResponse.json({ quiz })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
