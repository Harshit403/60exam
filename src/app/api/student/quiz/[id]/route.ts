import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/student/quiz/[id] - Get quiz questions (without revealing correct answers)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        questions: { select: { id: true, text: true, options: true } },
        chapterLinks: {
          include: {
            chapter: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!quiz || !quiz.isActive) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Check chapter completion lock — student must complete all linked chapters before accessing quiz
    if (quiz.chapterLinks.length > 0) {
      const linkedChapterIds = quiz.chapterLinks.map((link: any) => link.chapterId)
      const completedChapters = await db.chapterCompletion.findMany({
        where: {
          studentId: payload.id,
          chapterId: { in: linkedChapterIds }
        },
        select: { chapterId: true }
      })
      const completedIds = new Set(completedChapters.map((c: any) => c.chapterId))
      const incompleteChapters = quiz.chapterLinks
        .filter((link: any) => !completedIds.has(link.chapterId))
        .map((link: any) => ({ id: link.chapter.id, name: link.chapter.name }))

      if (incompleteChapters.length > 0) {
        return NextResponse.json({
          error: 'Quiz is locked. Complete all linked chapters first.',
          isLocked: true,
          lockedChapters: incompleteChapters,
        }, { status: 403 })
      }
    }

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        points: quiz.points,
      },
      questions: quiz.questions.map(q => ({
        id: q.id,
        text: q.text,
        options: JSON.parse(q.options),
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
