import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/student/leaderboard - Top students ranked by score
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req.headers)
    if (!auth || auth.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 100)
    const courseId = searchParams.get('courseId') || undefined

    // Build where clause
    const where: any = {
      status: 'approved',
    }
    if (courseId) {
      where.courseId = courseId
    }

    // Fetch students ordered by score descending
    const students = await db.student.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        score: true,
        currentStreak: true,
        verified: true,
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { score: 'desc' },
        { currentStreak: 'desc' },
        { totalStudyMin: 'desc' },
      ],
      take: limit,
    })

    // Build leaderboard with rank
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

    // Find current user's rank if not in top results
    let currentUserRank = null
    if (!leaderboard.some((s) => s.isCurrentUser)) {
      const allApprovedStudents = await db.student.findMany({
        where: { status: 'approved', ...(courseId ? { courseId } : {}) },
        select: { id: true, score: true },
        orderBy: [
          { score: 'desc' },
          { currentStreak: 'desc' },
          { totalStudyMin: 'desc' },
        ],
      })
      const rank = allApprovedStudents.findIndex((s) => s.id === auth.id) + 1
      if (rank > 0) {
        const currentUser = await db.student.findUnique({
          where: { id: auth.id },
          select: {
            id: true,
            fullName: true,
            score: true,
            currentStreak: true,
            verified: true,
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
      totalStudents: await db.student.count({
        where: { status: 'approved', ...(courseId ? { courseId } : {}) },
      }),
    })
  } catch (error: any) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
