import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/dashboard
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const totalStudents = await db.student.count()
  const totalCourses = await db.course.count()
  const totalSubjects = await db.subject.count()
  const totalChapters = await db.chapter.count()
  const totalReviews = await db.review.count()
  const totalDiscussions = await db.discussion.count()
  const totalQuizzes = await db.quiz.count()
  const totalQuizAttempts = await db.quizAttempt.count()
  const totalNotes = await db.note.count()
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const recentStudents = (await db.student.findMany({
    where: { createdAt: { gte: yesterday } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { course: true }
  })).map(s => ({ ...s, name: s.fullName }))
  
  // Weekly signups - last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentSignupsAll = await db.student.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true }
  })
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeklySignups: { day: string; signups: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - i)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)
    const count = recentSignupsAll.filter(s => {
      const sd = new Date(s.createdAt)
      return sd >= day && sd < nextDay
    }).length
    weeklySignups.push({ day: dayNames[day.getDay()], signups: count })
  }
  
  // Build activity log from real recent events
  const activityLog: { type: string; text: string; time: string; timestamp: Date }[] = []
  
  // Recent student signups
  const recentStudentsForLog = await db.student.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { fullName: true, createdAt: true }
  })
  recentStudentsForLog.forEach(s => {
    activityLog.push({
      type: 'signup',
      text: `New student registered: ${s.fullName}`,
      time: formatTimeAgo(s.createdAt),
      timestamp: s.createdAt
    })
  })
  
  // Recent reviews
  const recentReviews = await db.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { authorName: true, createdAt: true }
  })
  recentReviews.forEach(r => {
    activityLog.push({
      type: 'review',
      text: `New review submitted by ${r.authorName}`,
      time: formatTimeAgo(r.createdAt),
      timestamp: r.createdAt
    })
  })
  
  // Recent discussions
  const recentDiscussions = await db.discussion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { student: { select: { fullName: true } } }
  })
  recentDiscussions.forEach(d => {
    activityLog.push({
      type: 'discussion',
      text: `Discussion posted by ${d.student.fullName}`,
      time: formatTimeAgo(d.createdAt),
      timestamp: d.createdAt
    })
  })
  
  // Recent courses created/updated
  const recentCourses = await db.course.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: { title: true, updatedAt: true }
  })
  recentCourses.forEach(c => {
    activityLog.push({
      type: 'course',
      text: `Course updated: ${c.title}`,
      time: formatTimeAgo(c.updatedAt),
      timestamp: c.updatedAt
    })
  })
  
  // Sort by timestamp descending and take top 10
  activityLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  const topActivity = activityLog.slice(0, 10).map(({ timestamp, ...rest }) => rest)
  
  return NextResponse.json({
    totalStudents,
    totalCourses,
    totalSubjects,
    totalChapters,
    totalReviews,
    totalDiscussions,
    totalQuizzes,
    totalQuizAttempts,
    totalNotes,
    recentSignups: recentStudents,
    weeklySignups,
    activityLog: topActivity
  })
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
