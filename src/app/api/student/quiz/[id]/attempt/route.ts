import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// POST /api/student/quiz/[id]/attempt - Submit quiz answers, get result
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { answers } = await req.json() // answers: array of selected indices (parallel to questions order)
    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers must be an array' }, { status: 400 })
    }

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { createdAt: 'asc' } },
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

    // Check chapter completion lock — student must complete all linked chapters before attempting quiz
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

    // Calculate score
    let correctCount = 0
    const results = quiz.questions.map((q, idx) => {
      const correct = q.correctIdx
      const selected = answers[idx] ?? -1
      const isCorrect = selected === correct
      if (isCorrect) correctCount++
      return {
        questionId: q.id,
        questionText: q.text,
        options: JSON.parse(q.options),
        selectedIdx: selected,
        correctIdx: correct,
        explanation: q.explanation,
        isCorrect
      }
    })

    const total = quiz.questions.length
    const passed = (correctCount / total) >= 0.6 // 60% to pass
    // Points awarded only for passing, proportional to performance
    const pointsEarned = passed ? Math.round(quiz.points * (correctCount / total)) : 0

    // Save attempt
    await db.quizAttempt.create({
      data: {
        studentId: payload.id,
        quizId: quiz.id,
        answers: JSON.stringify(answers),
        score: correctCount,
        totalQuestions: total,
        passed,
        pointsEarned,
      }
    })

    // Award points to student if earned
    if (pointsEarned > 0) {
      await db.student.update({
        where: { id: payload.id },
        data: { score: { increment: pointsEarned } }
      })
    }

    return NextResponse.json({
      result: {
        score: correctCount,
        total,
        percentage: Math.round((correctCount / total) * 100),
        passed,
        pointsEarned,
        questionResults: results,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
