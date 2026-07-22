import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/student/analytics - Comprehensive student analytics
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentId = payload.id

    // Get all study sessions for the student
    const sessions = await db.studySession.findMany({
      where: { studentId },
      include: { chapter: { include: { subject: true } } },
      orderBy: { date: 'asc' }
    })

    // Get all quiz attempts
    const quizAttempts = await db.quizAttempt.findMany({
      where: { studentId },
      include: { quiz: { select: { title: true, difficulty: true, points: true } } },
      orderBy: { createdAt: 'asc' }
    })

    // Get student info
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: {
        score: true, totalStudyMin: true, currentStreak: true, verified: true,
        createdAt: true, course: { select: { title: true } }
      }
    })

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // ─── 1. Study time over last 30 days (daily) ─────────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyStudy: { date: string; minutes: number; sessions: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]
      const daySessions = sessions.filter(s => new Date(s.date).toISOString().split('T')[0] === dayStr)
      const minutes = daySessions.reduce((sum, s) => sum + s.durationMin, 0)
      dailyStudy.push({ date: dayStr, minutes, sessions: daySessions.length })
    }

    // ─── 2. Subject-wise study distribution ──────────────────────────
    const subjectMap = new Map<string, { name: string; minutes: number; sessions: number }>()
    for (const s of sessions) {
      if (s.chapter?.subject) {
        const subjName = s.chapter.subject.name
        const existing = subjectMap.get(subjName) || { name: subjName, minutes: 0, sessions: 0 }
        existing.minutes += s.durationMin
        existing.sessions += 1
        subjectMap.set(subjName, existing)
      }
    }
    const subjectDistribution = Array.from(subjectMap.values()).sort((a, b) => b.minutes - a.minutes)

    // ─── 3. Quiz performance over time ────────────────────────────────
    const quizTimeline = quizAttempts.map(a => ({
      id: a.id,
      date: a.createdAt,
      quizTitle: a.quiz.title,
      score: a.score,
      total: a.totalQuestions,
      percentage: Math.round((a.score / a.totalQuestions) * 100),
      passed: a.passed,
      pointsEarned: a.pointsEarned,
      difficulty: a.quiz.difficulty,
    }))

    // ─── 4. Quiz summary by difficulty ───────────────────────────────
    const difficultyStats = ['easy', 'medium', 'hard'].map(diff => {
      const attempts = quizAttempts.filter(a => a.quiz.difficulty === diff)
      const passed = attempts.filter(a => a.passed).length
      const avgScore = attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + (a.score / a.totalQuestions) * 100, 0) / attempts.length)
        : 0
      return {
        difficulty: diff,
        attempts: attempts.length,
        passed,
        failed: attempts.length - passed,
        passRate: attempts.length > 0 ? Math.round((passed / attempts.length) * 100) : 0,
        avgScore,
      }
    })

    // ─── 5. Weekly study hours (last 8 weeks) ────────────────────────
    const weeklyStudy: { week: string; minutes: number }[] = []
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - (w * 7 + 6))
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() - (w * 7))
      const weekSessions = sessions.filter(s => {
        const d = new Date(s.date)
        return d >= weekStart && d <= weekEnd
      })
      const minutes = weekSessions.reduce((sum, s) => sum + s.durationMin, 0)
      weeklyStudy.push({
        week: `W${8 - w}`,
        minutes,
      })
    }

    // ─── 6. Longest consecutive streak (last 30 days) ────────────────
    let maxStreak = 0, currentRun = 0
    for (const d of dailyStudy) {
      if (d.sessions > 0) { currentRun++; maxStreak = Math.max(maxStreak, currentRun) }
      else { currentRun = 0 }
    }
    const longestStreak = Math.max(student.currentStreak, maxStreak)

    // ─── 7. Achievements progress (next 3 to unlock) ─────────────────
    const achievements = await db.achievement.findMany({
      orderBy: { threshold: 'asc' }
    })
    const unlockedAchievements = await db.studentAchievement.findMany({
      where: { studentId },
      select: { achievementId: true, unlockedAt: true }
    })
    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId))
    const nextAchievements = achievements
      .filter(a => !unlockedIds.has(a.id) && a.threshold > student.score)
      .slice(0, 3)
      .map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        threshold: a.threshold,
        progress: a.threshold > 0 ? Math.min(100, Math.round((student.score / a.threshold) * 100)) : 100,
        remaining: Math.max(0, a.threshold - student.score),
      }))

    // ─── 8. Activity calendar (last 90 days) ─────────────────────────
    const activityCalendar: { date: string; count: number; minutes: number }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]
      const daySessions = sessions.filter(s => new Date(s.date).toISOString().split('T')[0] === dayStr)
      const minutes = daySessions.reduce((sum, s) => sum + s.durationMin, 0)
      activityCalendar.push({
        date: dayStr,
        count: daySessions.length,
        minutes,
      })
    }

    // ─── 9. Stats summary ────────────────────────────────────────────
    const totalSessions = sessions.length
    const totalCompletedSessions = sessions.filter(s => s.completed).length
    const avgSessionLength = totalSessions > 0
      ? Math.round(student.totalStudyMin / totalSessions)
      : 0
    const studyDays = new Set(sessions.map(s => new Date(s.date).toISOString().split('T')[0])).size
    const totalQuizPoints = quizAttempts.reduce((sum, a) => sum + a.pointsEarned, 0)
    const totalQuizAttempts = quizAttempts.length
    const quizPassRate = totalQuizAttempts > 0
      ? Math.round((quizAttempts.filter(a => a.passed).length / totalQuizAttempts) * 100)
      : 0

    return NextResponse.json({
      student: {
        score: student.score,
        totalStudyMin: student.totalStudyMin,
        currentStreak: student.currentStreak,
        verified: student.verified,
        courseTitle: student.course.title,
        memberSince: student.createdAt,
      },
      summary: {
        totalSessions,
        totalCompletedSessions,
        avgSessionLength,
        studyDays,
        longestStreak,
        totalQuizAttempts,
        quizPassRate,
        totalQuizPoints,
      },
      dailyStudy,
      weeklyStudy,
      subjectDistribution,
      quizTimeline,
      difficultyStats,
      nextAchievements,
      activityCalendar,
      unlockedAchievementsCount: unlockedIds.size,
      totalAchievements: achievements.length,
    })
  } catch (error: any) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
