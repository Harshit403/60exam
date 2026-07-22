import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'student') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const requesterId = auth.id
    const { id: groupId } = await params

    const membership = await db.groupMember.findFirst({
      where: { studentId: requesterId, groupId, leftAt: null }
    })
    if (!membership) {
      return Response.json({ error: 'Not a member of this group' }, { status: 403 })
    }

    // Get accepted member IDs from query param (comma-separated)
    const url = new URL(request.url)
    const memberIdsParam = url.searchParams.get('members') || ''
    const acceptedIds = memberIdsParam.split(',').filter(Boolean)

    if (acceptedIds.length === 0) {
      return Response.json({ error: 'No members specified' }, { status: 400 })
    }

    // Ensure requester is included
    const allIds = [...new Set([requesterId, ...acceptedIds])]

    const students = await db.student.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true,
        score: true,
        totalStudyMin: true,
        currentStreak: true,
        longestStreak: true,
        createdAt: true,
        course: { select: { title: true } }
      }
    })

    // Get study sessions for all students (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sessions = await db.studySession.findMany({
      where: {
        studentId: { in: allIds },
        date: { gte: thirtyDaysAgo }
      },
      select: {
        id: true,
        studentId: true,
        durationMin: true,
        date: true,
        chapter: { select: { name: true, subject: { select: { name: true } } } }
      },
      orderBy: { date: 'asc' }
    })

    // Get quiz attempts for all students
    const quizAttempts = await db.quizAttempt.findMany({
      where: { studentId: { in: allIds } },
      select: {
        id: true,
        studentId: true,
        score: true,
        totalMarks: true,
        createdAt: true
      }
    })

    // Get achievement progress for all students
    const achievements = await db.achievementProgress.findMany({
      where: { studentId: { in: allIds } },
      select: {
        id: true,
        studentId: true,
        achievementId: true,
        progress: true,
        unlocked: true
      }
    })

    // Build comparison data per student (no personal details)
    const comparisonData = students.map(student => {
      const studentSessions = sessions.filter(s => s.studentId === student.id)
      const studentQuizzes = quizAttempts.filter(q => q.studentId === student.id)
      const studentAchievements = achievements.filter(a => a.studentId === student.id)

      // Daily study minutes for last 7 days
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dailyMinutes: { date: string; minutes: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dayStr = d.toISOString().split('T')[0]
        const daySessions = studentSessions.filter(s =>
          new Date(s.date).toISOString().split('T')[0] === dayStr
        )
        dailyMinutes.push({ date: dayStr, minutes: daySessions.reduce((sum, s) => sum + s.durationMin, 0) })
      }

      // Subject distribution
      const subjectMap = new Map<string, number>()
      for (const s of studentSessions) {
        const name = s.chapter?.subject?.name || 'Other'
        subjectMap.set(name, (subjectMap.get(name) || 0) + s.durationMin)
      }

      // Quiz accuracy
      const totalScore = studentQuizzes.reduce((sum, q) => sum + q.score, 0)
      const totalMarks = studentQuizzes.reduce((sum, q) => sum + q.totalMarks, 0)
      const accuracy = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0

      // Session count (last 30 days)
      const sessionsLast30 = studentSessions.length

      // Total study hours
      const totalHours = Math.round(student.totalStudyMin / 60 * 10) / 10

      // Achievements unlocked
      const unlockedCount = studentAchievements.filter(a => a.unlocked).length

      return {
        userId: student.id,
        isRequester: student.id === requesterId,
        score: student.score,
        totalStudyHours: totalHours,
        currentStreak: student.currentStreak,
        longestStreak: student.longestStreak,
        sessionsLast30,
        quizAccuracy: accuracy,
        totalQuizzes: studentQuizzes.length,
        achievementsUnlocked: unlockedCount,
        totalAchievements: studentAchievements.length,
        course: student.course?.title || null,
        dailyMinutes,
        subjectDistribution: Array.from(subjectMap.entries()).map(([name, minutes]) => ({ name, minutes }))
      }
    })

    return Response.json({ members: comparisonData })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
