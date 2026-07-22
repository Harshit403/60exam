import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/admin/quiz/[id] - Get quiz details with questions
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { createdAt: 'asc' } } }
    })
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      quiz: {
        ...quiz,
        questions: quiz.questions.map(q => ({
          ...q,
          options: JSON.parse(q.options)
        }))
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/admin/quiz/[id] - Update quiz (toggle active, edit fields)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await req.json()
    const allowed: any = {}
    for (const k of ['title', 'description', 'courseId', 'subjectId', 'difficulty', 'points', 'isActive']) {
      if (k in updates) allowed[k] = updates[k]
    }

    const quiz = await db.quiz.update({ where: { id }, data: allowed })
    return NextResponse.json({ quiz })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/quiz/[id] - Delete quiz
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await db.quiz.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
