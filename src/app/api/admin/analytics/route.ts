import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/analytics - Comprehensive platform-wide analytics
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // ─── Overview Counts ───────────────────────────────────────────
    const [
      totalStudents,
      totalCourses,
      totalQuizzes,
      totalAttempts,
      totalStudyAgg,
      activeWeekStudents,
      newMonthStudents,
    ] = await Promise.all([
      db.student.count(),
      db.course.count(),
      db.quiz.count(),
      db.quizAttempt.count(),
      db.student.aggregate({ _sum: { totalStudyMin: true } }),
      db.student.count({
        where: { lastStudyAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      db.student.count({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
    ])

    const totalStudyMinutes = totalStudyAgg._sum.totalStudyMin || 0

    // ─── 1. Student Growth (last 6 months) ─────────────────────────
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const studentGrowth: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const count = await db.student.count({
        where: { createdAt: { gte: start, lt: end } },
      })
      studentGrowth.push({ month: monthLabels[d.getMonth()], count })
    }

    // ─── 2. Course Distribution ────────────────────────────────────
    const courses = await db.course.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const totalCourseStudents = courses.reduce((s, c) => s + c._count.students, 0)
    const courseDistribution = courses.map((c) => ({
      courseTitle: c.title,
      studentCount: c._count.students,
      percentage: totalCourseStudents > 0 ? Math.round((c._count.students / totalCourseStudents) * 100) : 0,
    }))

    // ─── 3. Quiz Performance ───────────────────────────────────────
    const quizzes = await db.quiz.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
        attempts: { select: { score: true, totalQuestions: true, passed: true } },
      },
    })
    const quizPerformance = quizzes
      .map((q) => {
        const attempts = q.attempts.length
        const passed = q.attempts.filter((a) => a.passed).length
        const avgScore = attempts > 0
          ? Math.round(
              q.attempts.reduce((s, a) => s + (a.score / Math.max(1, a.totalQuestions)) * 100, 0) / attempts,
            )
          : 0
        return {
          quizTitle: q.title,
          difficulty: q.difficulty,
          attempts,
          passRate: attempts > 0 ? Math.round((passed / attempts) * 100) : 0,
          avgScore,
        }
      })
      .sort((a, b) => b.attempts - a.attempts)

    // ─── 4. Difficulty Stats ──────────────────────────────────────
    const allAttempts = await db.quizAttempt.findMany({
      select: { score: true, totalQuestions: true, passed: true, quiz: { select: { difficulty: true } } },
    })
    const difficultyStats = (['easy', 'medium', 'hard'] as const).map((diff) => {
      const attempts = allAttempts.filter((a) => a.quiz.difficulty === diff)
      const passed = attempts.filter((a) => a.passed).length
      const avgScore = attempts.length > 0
        ? Math.round(
            attempts.reduce((s, a) => s + (a.score / Math.max(1, a.totalQuestions)) * 100, 0) / attempts.length,
          )
        : 0
      return {
        difficulty: diff,
        attempts: attempts.length,
        passRate: attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0,
        avgScore,
      }
    })

    // ─── 5. Weekly Activity (Mon-Sun) ──────────────────────────────
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    // Reorder so Mon is first
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Aggregate last 90 days by day-of-week for a more stable weekly profile
    const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const [recentSessions, recentQuizAttempts] = await Promise.all([
      db.studySession.findMany({
        where: { date: { gte: since } },
        select: { date: true, durationMin: true },
      }),
      db.quizAttempt.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ])

    const weekMap: Record<string, { studyMinutes: number; quizAttempts: number }> = {}
    orderedDays.forEach((d) => (weekMap[d] = { studyMinutes: 0, quizAttempts: 0 }))

    for (const s of recentSessions) {
      const day = dayNames[new Date(s.date).getDay()]
      if (weekMap[day]) weekMap[day].studyMinutes += s.durationMin
    }
    for (const a of recentQuizAttempts) {
      const day = dayNames[new Date(a.createdAt).getDay()]
      if (weekMap[day]) weekMap[day].quizAttempts += 1
    }

    const weeklyActivity = orderedDays.map((day) => ({
      day,
      studyMinutes: weekMap[day].studyMinutes,
      quizAttempts: weekMap[day].quizAttempts,
    }))

    // ─── 6. Top Performers ────────────────────────────────────────
    const topStudents = await db.student.findMany({
      where: { status: 'approved' },
      orderBy: [{ score: 'desc' }, { currentStreak: 'desc' }, { totalStudyMin: 'desc' }],
      take: 5,
      include: { course: { select: { title: true } } },
    })
    const topPerformers = topStudents.map((s) => ({
      fullName: s.fullName,
      score: s.score,
      courseTitle: s.course.title,
      studyMinutes: s.totalStudyMin,
    }))

    // ─── 7. Engagement Metrics ────────────────────────────────────
    // Avg session duration = total study minutes / total sessions
    const totalSessions = await db.studySession.count()
    const avgSessionDuration = totalSessions > 0 ? Math.round(totalStudyMinutes / totalSessions) : 0

    // Avg quizzes per student (approved)
    const approvedStudents = await db.student.count({ where: { status: 'approved' } })
    const avgQuizzesPerStudent = approvedStudents > 0
      ? Math.round((totalAttempts / approvedStudents) * 10) / 10
      : 0

    // Avg study minutes per day (over last 30 days, across all students)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last30Sessions = await db.studySession.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: { durationMin: true },
    })
    const totalLast30Min = last30Sessions.reduce((s, x) => s + x.durationMin, 0)
    const avgStudyMinutesPerDay = Math.round(totalLast30Min / 30)

    // Retention rate: % of approved students who studied in the last 7 days
    const retentionRate = approvedStudents > 0
      ? Math.round((activeWeekStudents / approvedStudents) * 100)
      : 0

    return NextResponse.json({
      overview: {
        totalStudents,
        totalCourses,
        totalQuizzes,
        totalAttempts,
        totalStudyMinutes,
        activeStudentsThisWeek: activeWeekStudents,
        newStudentsThisMonth: newMonthStudents,
      },
      studentGrowth,
      courseDistribution,
      quizPerformance,
      difficultyStats,
      weeklyActivity,
      topPerformers,
      engagementMetrics: {
        avgSessionDuration,
        avgQuizzesPerStudent,
        avgStudyMinutesPerDay,
        retentionRate,
      },
    })
  } catch (error: any) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load analytics' }, { status: 500 })
  }
}
