import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { checkStreak, calculateScore } from '@/lib/achievements'
import { getISTTodayStart, getISTTodayEnd } from '@/lib/date-utils'

// GET /api/student/dashboard
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const student = await db.student.findUnique({
    where: { id: auth.id },
    include: {
      course: {
        include: {
          subjects: {
            orderBy: { orderNum: 'asc' },
            include: {
              chapters: true
            }
          }
        }
      },
      chapterCompletions: true,
      achievements: { include: { achievement: true } }
    }
  })
  
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  
  const { streak, verified } = checkStreak(student.lastStudyAt, student.currentStreak)
  
  // Update streak if needed
  if (streak !== student.currentStreak || verified !== student.verified) {
    await db.student.update({
      where: { id: student.id },
      data: { currentStreak: streak, verified }
    })
  }
  
  const totalChapters = student.course.subjects.reduce((acc: number, s: any) => acc + s.chapters.length, 0)
  const completedChapters = student.chapterCompletions.length
  const completionPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
  
  // Today's study time (IST)
  const todayStart = getISTTodayStart()
  const todayEnd = getISTTodayEnd()
  const todaySessions = await db.studySession.findMany({
    where: { studentId: student.id, date: { gte: todayStart, lte: todayEnd } }
  })
  const todayStudyMin = todaySessions.reduce((acc: number, s: any) => acc + s.durationMin, 0)

  // Today's study plan
  const todayPlan = await db.studyPlan.findFirst({
    where: { studentId: student.id, plannedDate: { gte: todayStart, lte: todayEnd } },
    include: { chapter: { include: { subject: true } } }
  })
  
  return NextResponse.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      mobile: student.mobile,
      score: student.score,
      totalStudyMin: student.totalStudyMin,
      currentStreak: streak,
      verified,
      course: student.course
    },
    subjects: student.course.subjects,
    totalSubjects: student.course.subjects.length,
    totalChapters,
    completedChapters,
    completionPercent,
    todayStudyMin,
    todayPlan,
    achievements: student.achievements
  })
}
