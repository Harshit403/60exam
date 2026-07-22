import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/student/quiz-history - All past quiz attempts for the logged-in student
// Query params: courseId, difficulty, passed (boolean), page, limit
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req.headers)
    if (!auth || auth.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId') || undefined
    const difficulty = searchParams.get('difficulty') || undefined
    const passedRaw = searchParams.get('passed')
    const passed = passedRaw === 'true' ? true : passedRaw === 'false' ? false : undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 50)
    const skip = (page - 1) * limit

    // Build where clause for filtering attempts via the related quiz
    const quizWhere: { courseId?: string; difficulty?: string } = {}
    if (courseId) quizWhere.courseId = courseId
    if (difficulty) quizWhere.difficulty = difficulty

    const attemptWhere: {
      studentId: string
      passed?: boolean
      quiz?: typeof quizWhere
    } = {
      studentId: auth.id,
      ...(typeof passed === 'boolean' ? { passed } : {}),
      ...(Object.keys(quizWhere).length > 0 ? { quiz: quizWhere } : {}),
    }

    // ─── Fetch paged attempts ────────────────────────────────────────
    const [attempts, totalCount] = await Promise.all([
      db.quizAttempt.findMany({
        where: attemptWhere,
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              points: true,
              course: { select: { title: true } },
              subject: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.quizAttempt.count({ where: attemptWhere }),
    ])

    // ─── Compute full stats from ALL attempts (unfiltered by page) ────
    // For accurate trends and difficulty breakdown, we want all attempts by this student
    // (still respecting the same filters so the stats reflect what's being viewed)
    const allAttempts = await db.quizAttempt.findMany({
      where: attemptWhere,
      include: {
        quiz: {
          select: { difficulty: true, points: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const totalAttempts = allAttempts.length
    const totalPassed = allAttempts.filter((a) => a.passed).length
    const totalFailed = totalAttempts - totalPassed
    const passRate = totalAttempts > 0
      ? Math.round((totalPassed / totalAttempts) * 1000) / 10
      : 0
    const avgScore = totalAttempts > 0
      ? Math.round(
          (allAttempts.reduce((s, a) => s + (a.score / a.totalQuestions) * 100, 0) /
            totalAttempts) *
            10,
        ) / 10
      : 0
    const totalPointsEarned = allAttempts.reduce((s, a) => s + a.pointsEarned, 0)

    // Best streak of consecutive passes (in chronological order)
    let bestStreak = 0
    let currentStreak = 0
    for (const a of allAttempts) {
      if (a.passed) {
        currentStreak += 1
        if (currentStreak > bestStreak) bestStreak = currentStreak
      } else {
        currentStreak = 0
      }
    }

    // Difficulty breakdown
    const diffBreakdown = (['easy', 'medium', 'hard'] as const).map((diff) => {
      const diffAttempts = allAttempts.filter((a) => a.quiz.difficulty === diff)
      const diffPassed = diffAttempts.filter((a) => a.passed).length
      const diffAvg = diffAttempts.length > 0
        ? Math.round(
            (diffAttempts.reduce((s, a) => s + (a.score / a.totalQuestions) * 100, 0) /
              diffAttempts.length) *
              10,
          ) / 10
        : 0
      return {
        difficulty: diff,
        attempts: diffAttempts.length,
        passed: diffPassed,
        avgScore: diffAvg,
      }
    })
    const byDifficulty: Record<string, { attempts: number; passed: number; avgScore: number }> = {}
    for (const d of diffBreakdown) byDifficulty[d.difficulty] = d

    // Recent trend (last 7 days, oldest first)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const recentTrend: { date: string; attempts: number; avgScore: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]
      const dayAttempts = allAttempts.filter(
        (a) => new Date(a.createdAt).toISOString().split('T')[0] === dayStr,
      )
      const dayAvg = dayAttempts.length > 0
        ? Math.round(
            (dayAttempts.reduce((s, a) => s + (a.score / a.totalQuestions) * 100, 0) /
              dayAttempts.length) *
              10,
          ) / 10
        : 0
      recentTrend.push({
        date: dayStr,
        attempts: dayAttempts.length,
        avgScore: dayAvg,
      })
    }

    // Map attempts for response
    const mappedAttempts = attempts.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      quizTitle: a.quiz.title,
      quizDifficulty: a.quiz.difficulty,
      courseTitle: a.quiz.course?.title || 'General',
      subjectTitle: a.quiz.subject?.name || null,
      score: a.score,
      totalQuestions: a.totalQuestions,
      percentage: Math.round((a.score / a.totalQuestions) * 100),
      passed: a.passed,
      pointsEarned: a.pointsEarned,
      answers: a.answers,
      createdAt: a.createdAt,
    }))

    const totalPages = Math.max(1, Math.ceil(totalCount / limit))

    return NextResponse.json({
      attempts: mappedAttempts,
      stats: {
        totalAttempts,
        totalPassed,
        totalFailed,
        passRate,
        avgScore,
        totalPointsEarned,
        bestStreak,
        byDifficulty,
        recentTrend,
      },
      totalPages,
      currentPage: page,
    })
  } catch (error: any) {
    console.error('Quiz history error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
