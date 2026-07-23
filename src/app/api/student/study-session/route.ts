import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { calculateScore, ACHIEVEMENT_TIERS } from '@/lib/achievements'
import { isSameISTDay } from '@/lib/date-utils'

// POST /api/student/study-session
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { chapterId, durationMin, completed, notes } = await req.json()
  
  const session = await db.studySession.create({
    data: {
      studentId: auth.id,
      chapterId: chapterId || null,
      durationMin,
      completed: completed || false,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null
    }
  })
  
  // Update student stats
  const student = await db.student.findUnique({ where: { id: auth.id } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  
  const newTotalMin = student.totalStudyMin + durationMin
  const newScore = calculateScore(newTotalMin)
  
  // Update streak (IST calendar day comparison)
  const now = new Date()
  const lastStudy = student.lastStudyAt
  let newStreak = student.currentStreak

  if (lastStudy) {
    const diffHours = (now.getTime() - new Date(lastStudy).getTime()) / (1000 * 60 * 60)
    if (diffHours < 24) {
      // Within 24 hours — streak continues
      if (!isSameISTDay(now, new Date(lastStudy))) {
        newStreak = student.currentStreak + 1
      }
    } else {
      newStreak = 1
    }
  } else {
    newStreak = 1
  }
  
  const isVerified = newStreak >= 7
  
  await db.student.update({
    where: { id: auth.id },
    data: {
      totalStudyMin: newTotalMin,
      score: newScore,
      currentStreak: newStreak,
      lastStudyAt: now,
      verified: isVerified
    }
  })
  
  // If completed, mark chapter as completed
  if (completed && chapterId) {
    await db.chapterCompletion.upsert({
      where: { studentId_chapterId: { studentId: auth.id, chapterId } },
      update: {},
      create: { studentId: auth.id, chapterId }
    })
  }
  
  // Check for new achievements
  const unlockedAchievements = await db.studentAchievement.findMany({
    where: { studentId: auth.id },
    select: { achievementId: true }
  })
  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId))
  
  const allAchievements = await db.achievement.findMany({ orderBy: { order: 'asc' } })
  
  // Create achievements if they don't exist
  if (allAchievements.length === 0) {
    for (const tier of ACHIEVEMENT_TIERS) {
      const achievement = await db.achievement.create({
        data: { name: tier.name, description: tier.description, threshold: tier.threshold, icon: tier.icon, order: tier.order }
      })
      if (newScore >= tier.threshold && !unlockedIds.has(achievement.id)) {
        await db.studentAchievement.create({
          data: { studentId: auth.id, achievementId: achievement.id }
        })
      }
    }
  } else {
    for (const achievement of allAchievements) {
      if (newScore >= achievement.threshold && !unlockedIds.has(achievement.id)) {
        await db.studentAchievement.create({
          data: { studentId: auth.id, achievementId: achievement.id }
        })
      }
    }
  }
  
  return NextResponse.json({ session, newScore, newStreak, isVerified })
}

// GET /api/student/study-session (history)
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const dateStr = req.nextUrl.searchParams.get('date')
  
  if (dateStr) {
    const date = new Date(dateStr)
    const nextDay = new Date(date.getTime() + 86400000)
    const sessions = await db.studySession.findMany({
      where: { studentId: auth.id, date: { gte: date, lt: nextDay } },
      include: { chapter: { include: { subject: true } } },
      orderBy: { date: 'desc' }
    })
    const totalMin = sessions.reduce((acc: number, s: any) => acc + s.durationMin, 0)
    return NextResponse.json({ sessions, totalMin })
  }
  
  // Get all sessions for chart data (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const sessions = await db.studySession.findMany({
    where: { studentId: auth.id, date: { gte: thirtyDaysAgo } },
    include: { chapter: { include: { subject: true } } },
    orderBy: { date: 'desc' }
  })
  
  return NextResponse.json({ sessions })
}
