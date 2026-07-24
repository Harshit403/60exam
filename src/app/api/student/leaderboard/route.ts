import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { getISTTodayStart, getISTTodayEnd } from '@/lib/date-utils'

// GET /api/student/leaderboard - Top students ranked by score or period study time
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req.headers)
    if (!auth || auth.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 100)
    const courseId = searchParams.get('courseId') || undefined
    const period = searchParams.get('period') || 'all'

    const studentWhere: any = { status: 'approved' }
    if (courseId) studentWhere.courseId = courseId

    // ─── Period-based (today / 24h) ─────────────────────────────────────
    if (period === 'today' || period === '24h') {
      let dateFrom: Date
      let dateTo: Date = new Date()

      if (period === 'today') {
        dateFrom = getISTTodayStart()
        dateTo = getISTTodayEnd()
      } else {
        dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000)
      }

      // Aggregate study sessions in period
      const sessions = await db.studySession.findMany({
        where: {
          date: { gte: dateFrom, lte: dateTo },
          completed: true,
          student: { status: 'approved', ...(courseId ? { courseId } : {}) },
        },
        select: { studentId: true, durationMin: true },
      })

      // Group by student
      const minutesMap = new Map<string, number>()
      for (const s of sessions) {
        minutesMap.set(s.studentId, (minutesMap.get(s.studentId) || 0) + s.durationMin)
      }

      // Sort by minutes descending
      const sorted = [...minutesMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)

      // Fetch student details for top results
      const studentIds = sorted.map(([id]) => id)
      const studentsData = studentIds.length > 0 ? await db.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true, fullName: true, score: true, currentStreak: true, verified: true,
          course: { select: { id: true, title: true } },
        },
      }) : []

      const studentMap = new Map(studentsData.map(s => [s.id, s]))

      const leaderboard = sorted.map(([id, minutes], index) => {
        const s = studentMap.get(id)
        return {
          rank: index + 1,
          id,
          fullName: s?.fullName || 'Unknown',
          score: s?.score || 0,
          studyMinutes: minutes,
          currentStreak: s?.currentStreak || 0,
          verified: s?.verified || false,
          courseTitle: s?.course?.title || '',
          courseId: s?.course?.id || '',
          isCurrentUser: id === auth.id,
        }
      })

      // Compute current user's rank (if not in top)
      let currentUserRank: typeof leaderboard[0] | null = null
      if (!leaderboard.some(e => e.isCurrentUser)) {
        const userMinutes = minutesMap.get(auth.id) || 0
        let rank = 1
        for (const [, m] of minutesMap) {
          if (m > userMinutes) rank++
        }
        const currentUser = await db.student.findUnique({
          where: { id: auth.id },
          select: {
            id: true, fullName: true, score: true, currentStreak: true, verified: true,
            course: { select: { id: true, title: true } },
          },
        })
        if (currentUser) {
          currentUserRank = {
            rank,
            id: currentUser.id,
            fullName: currentUser.fullName,
            score: currentUser.score,
            studyMinutes: userMinutes,
            currentStreak: currentUser.currentStreak,
            verified: currentUser.verified,
            courseTitle: currentUser.course.title,
            courseId: currentUser.course.id,
            isCurrentUser: true,
          }
        }
      }

      return NextResponse.json({
        leaderboard,
        currentUserRank,
        totalStudents: await db.student.count({ where: studentWhere }),
      })
    }

    // ─── All-time (score-based) - existing behavior ─────────────────────
    const students = await db.student.findMany({
      where: studentWhere,
      select: {
        id: true, fullName: true, score: true, currentStreak: true, verified: true,
        course: { select: { id: true, title: true } },
      },
      orderBy: [
        { score: 'desc' },
        { currentStreak: 'desc' },
        { totalStudyMin: 'desc' },
      ],
      take: limit,
    })

    const leaderboard = students.map((s, index) => ({
      rank: index + 1,
      id: s.id,
      fullName: s.fullName,
      score: s.score,
      currentStreak: s.currentStreak,
      verified: s.verified,
      courseTitle: s.course.title,
      courseId: s.course.id,
      isCurrentUser: s.id === auth.id,
    }))

    let currentUserRank: typeof leaderboard[0] | null = null
    if (!leaderboard.some(s => s.isCurrentUser)) {
      const allApproved = await db.student.findMany({
        where: studentWhere,
        select: { id: true, score: true },
        orderBy: [
          { score: 'desc' },
          { currentStreak: 'desc' },
          { totalStudyMin: 'desc' },
        ],
      })
      const rank = allApproved.findIndex(s => s.id === auth.id) + 1
      if (rank > 0) {
        const currentUser = await db.student.findUnique({
          where: { id: auth.id },
          select: {
            id: true, fullName: true, score: true, currentStreak: true, verified: true,
            course: { select: { id: true, title: true } },
          },
        })
        if (currentUser) {
          currentUserRank = {
            rank,
            id: currentUser.id,
            fullName: currentUser.fullName,
            score: currentUser.score,
            currentStreak: currentUser.currentStreak,
            verified: currentUser.verified,
            courseTitle: currentUser.course.title,
            courseId: currentUser.course.id,
            isCurrentUser: true,
          }
        }
      }
    }

    return NextResponse.json({
      leaderboard,
      currentUserRank,
      totalStudents: await db.student.count({ where: studentWhere }),
    })
  } catch (error: any) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
