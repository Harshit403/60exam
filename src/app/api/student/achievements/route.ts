import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { ACHIEVEMENT_TIERS } from '@/lib/achievements'

// GET /api/student/achievements
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Ensure achievements exist
  const existingAchievements = await db.achievement.findMany({ orderBy: { order: 'asc' } })
  if (existingAchievements.length === 0) {
    for (const tier of ACHIEVEMENT_TIERS) {
      await db.achievement.create({
        data: {
          name: tier.name,
          description: tier.description,
          threshold: tier.threshold,
          icon: tier.icon,
          order: tier.order
        }
      })
    }
  }
  
  const allAchievements = await db.achievement.findMany({ orderBy: { order: 'asc' } })
  const studentAchievements = await db.studentAchievement.findMany({
    where: { studentId: auth.id },
    select: { achievementId: true, unlockedAt: true }
  })
  
  const unlockedIds = new Set(studentAchievements.map(a => a.achievementId))
  
  const achievements = allAchievements.map(a => ({
    ...a,
    unlocked: unlockedIds.has(a.id),
    unlockedAt: studentAchievements.find(sa => sa.achievementId === a.id)?.unlockedAt || null
  }))
  
  const student = await db.student.findUnique({ where: { id: auth.id } })
  
  return NextResponse.json({
    achievements,
    totalUnlocked: studentAchievements.length,
    totalAchievements: allAchievements.length,
    currentScore: student?.score || 0
  })
}
