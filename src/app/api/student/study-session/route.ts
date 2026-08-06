import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { calculateScore, ACHIEVEMENT_TIERS } from '@/lib/achievements'
import { isSameISTDay } from '@/lib/date-utils'
import { ensureStudySessionLectureColumns } from '@/lib/ensure-columns'

// Apply a positive change to a student's study minutes and recompute score,
// streak and achievements. Shared by both session creation and per-minute
// incremental updates so study time is stored progressively on the server.
async function applyStudyProgress(studentId: string, addMin: number, now: Date, chapterId?: string | null, completed?: boolean) {
  const student = await db.student.findUnique({ where: { id: studentId } })
  if (!student) throw new Error('Student not found')

  const newTotalMin = student.totalStudyMin + addMin
  const newScore = calculateScore(newTotalMin)

  const lastStudy = student.lastStudyAt
  let newStreak = student.currentStreak

  if (lastStudy) {
    const diffHours = (now.getTime() - new Date(lastStudy).getTime()) / (1000 * 60 * 60)
    if (diffHours < 48) {
      // Within 48 hours — streak continues
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
    where: { id: studentId },
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
      where: { studentId_chapterId: { studentId, chapterId } },
      update: {},
      create: { studentId, chapterId }
    })
  }

  // Check for new achievements
  const unlockedAchievements = await db.studentAchievement.findMany({
    where: { studentId },
    select: { achievementId: true }
  })
  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId))

  const allAchievements = await db.achievement.findMany({ orderBy: { order: 'asc' } })

  if (allAchievements.length === 0) {
    for (const tier of ACHIEVEMENT_TIERS) {
      const achievement = await db.achievement.create({
        data: { name: tier.name, description: tier.description, threshold: tier.threshold, icon: tier.icon, order: tier.order }
      })
      if (newScore >= tier.threshold && !unlockedIds.has(achievement.id)) {
        await db.studentAchievement.create({
          data: { studentId, achievementId: achievement.id }
        })
      }
    }
  } else {
    for (const achievement of allAchievements) {
      if (newScore >= achievement.threshold && !unlockedIds.has(achievement.id)) {
        await db.studentAchievement.create({
          data: { studentId, achievementId: achievement.id }
        })
      }
    }
  }

  return { newScore, newStreak, isVerified }
}

// POST /api/student/study-session
// Creates a study session, or incrementally updates the student's own
// in-progress session when an `id` is provided (the client reports the study
// time in one-minute chunks while the Pomodoro runs, so time is stored even
// if the session never reaches the completion screen).
//
// Lecture mode (`mode: 'lecture'`) is server-authoritative: the server records
// `startedAt` when the timer starts and computes elapsed study time from its own
// clock, so study time is stored in the DB even if the tab is in the background.
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, mode, action, chapterId, durationMin, plannedMin, completed, notes } = await req.json()

  // ─── Lecture mode: server-authoritative session ───────────────────────
  if (mode === 'lecture') {
    await ensureStudySessionLectureColumns()
    const now = new Date()

    if (action === 'start') {
      const planned = Math.max(1, Math.min(Math.round(plannedMin || 25), 300))
      const session = await db.studySession.create({
        data: {
          studentId: auth.id,
          chapterId: chapterId || null,
          durationMin: 0,
          completed: false,
          mode: 'lecture',
          plannedMin: planned,
          startedAt: now,
        },
      })
      return NextResponse.json({ session })
    }

    const existing = await db.studySession.findFirst({ where: { id, studentId: auth.id, mode: 'lecture' } })
    if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Accrue the elapsed minutes since startedAt (server-authoritative), then
    // fold the delta into the stored duration + student progress. Returns the
    // newly accrued delta (already applied) and the total elapsed minutes.
    const accrueElapsed = async (markPaused: boolean) => {
      const startedAt = existing.startedAt
      let elapsed = existing.durationMin
      if (startedAt) {
        const planned = existing.plannedMin ?? Number.MAX_SAFE_INTEGER
        elapsed = Math.min(planned, elapsed + Math.floor((now.getTime() - new Date(startedAt).getTime()) / 60000))
      }
      const delta = Math.max(0, elapsed - existing.durationMin)
      if (delta > 0) {
        await db.studySession.update({
          where: { id },
          data: { durationMin: elapsed, ...(markPaused ? { startedAt: null } : {}) },
        })
        await applyStudyProgress(auth.id, delta, now, existing.chapterId || null, false)
      } else if (markPaused && startedAt) {
        await db.studySession.update({ where: { id }, data: { startedAt: null } })
      }
      return { elapsed, delta }
    }

    if (action === 'sync') {
      const { elapsed } = await accrueElapsed(false)
      const session = await db.studySession.findUnique({ where: { id } })
      return NextResponse.json({ session, elapsedMin: elapsed })
    }

    if (action === 'pause') {
      const { elapsed } = await accrueElapsed(true)
      const session = await db.studySession.findUnique({ where: { id } })
      return NextResponse.json({ session, elapsedMin: elapsed })
    }

    if (action === 'resume') {
      if (!existing.startedAt) {
        await db.studySession.update({ where: { id }, data: { startedAt: now } })
      }
      const session = await db.studySession.findUnique({ where: { id } })
      return NextResponse.json({ session, elapsedMin: existing.durationMin })
    }

    if (action === 'complete') {
      const { elapsed } = await accrueElapsed(true)
      await db.studySession.update({
        where: { id },
        data: {
          completed: completed ? true : existing.completed,
          startedAt: null,
          ...(typeof notes === 'string' ? { notes: notes.trim() ? notes.trim() : null } : {}),
        },
      })
      // Mark the chapter as completed only when the user says they finished.
      if (completed && existing.chapterId) {
        await applyStudyProgress(auth.id, 0, now, existing.chapterId, true)
      }
      const session = await db.studySession.findUnique({ where: { id } })
      return NextResponse.json({ session, elapsedMin: elapsed })
    }

    return NextResponse.json({ error: 'Invalid lecture action' }, { status: 400 })
  }

  const addMin = Math.max(0, Math.round(durationMin || 0))
  const now = new Date()

  // Incremental update of an existing in-progress session
  if (id) {
    const existing = await db.studySession.findFirst({
      where: { id, studentId: auth.id },
    })
    if (existing && !existing.completed) {
      const session = await db.studySession.update({
        where: { id },
        data: {
          durationMin: existing.durationMin + addMin,
          completed: completed ? true : existing.completed,
          ...(typeof notes === 'string' ? { notes: notes.trim() ? notes.trim() : null } : {}),
          ...(chapterId ? { chapterId } : {}),
        },
      })
      const stats = await applyStudyProgress(auth.id, addMin, now, chapterId || null, completed || false)
      return NextResponse.json({ session, ...stats })
    }
  }

  // Otherwise create a new session
  const session = await db.studySession.create({
    data: {
      studentId: auth.id,
      chapterId: chapterId || null,
      durationMin: addMin,
      completed: completed || false,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null
    }
  })

  const stats = await applyStudyProgress(auth.id, addMin, now, chapterId || null, completed || false)
  return NextResponse.json({ session, ...stats })
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
