import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getISTTodayStart, getISTTodayEnd } from '@/lib/date-utils'

// GET /api/public/leaderboard
// PUBLIC endpoint — no auth required.
// ?daily=true — returns top 3 by today's study minutes.
// Default — returns top 10 approved students ordered by score (desc).
export async function GET(req: NextRequest) {
  const daily = req.nextUrl.searchParams.get('daily') === 'true'

  if (daily) {
    const todayStart = getISTTodayStart()
    const todayEnd = getISTTodayEnd()

    const sessions = await db.studySession.groupBy({
      by: ['studentId'],
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      _sum: { durationMin: true },
      orderBy: { _sum: { durationMin: 'desc' } },
      take: 3,
    })

    const studentIds = sessions.map(s => s.studentId)
    const students = studentIds.length > 0 ? await db.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        fullName: true,
        score: true,
        currentStreak: true,
        verified: true,
        course: { select: { title: true } },
      },
    }) : []

    const studentMap = new Map(students.map(s => [s.id, s]))

    const leaderboard = sessions.map((s, index) => {
      const student = studentMap.get(s.studentId)
      return {
        id: s.studentId,
        name: (student?.fullName || 'Unknown').split(' ')[0],
        studyMinutes: s._sum.durationMin || 0,
        score: student?.score || 0,
        currentStreak: student?.currentStreak || 0,
        verified: student?.verified || false,
        courseTitle: student?.course?.title ?? null,
        rank: index + 1,
      }
    })

    return NextResponse.json({ leaderboard })
  }

  const students = await db.student.findMany({
    where: { status: 'approved' },
    orderBy: [{ score: 'desc' }, { currentStreak: 'desc' }],
    take: 10,
    select: {
      id: true,
      fullName: true,
      score: true,
      currentStreak: true,
      verified: true,
      course: { select: { title: true } },
    },
  })

  const leaderboard = students.map((s, index) => ({
    id: s.id,
    name: s.fullName.split(' ')[0],
    score: s.score,
    currentStreak: s.currentStreak,
    verified: s.verified,
    courseTitle: s.course?.title ?? null,
    rank: index + 1,
  }))

  return NextResponse.json({ leaderboard })
}
