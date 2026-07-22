import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// POST /api/student/profile/reset
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Reset all student stats
  await db.studySession.deleteMany({ where: { studentId: auth.id } })
  await db.studyPlan.deleteMany({ where: { studentId: auth.id } })
  await db.chapterCompletion.deleteMany({ where: { studentId: auth.id } })
  await db.studentAchievement.deleteMany({ where: { studentId: auth.id } })
  
  await db.student.update({
    where: { id: auth.id },
    data: {
      score: 0,
      totalStudyMin: 0,
      currentStreak: 0,
      lastStrikeAt: null,
      lastStudyAt: null,
      verified: false
    }
  })
  
  return NextResponse.json({ success: true, message: 'All stats have been reset' })
}
