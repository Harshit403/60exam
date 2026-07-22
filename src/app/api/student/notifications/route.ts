import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/student/notifications - Get recent notifications for student
// Generates notifications based on recent activities: admin replies, achievement unlocks, etc.
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentId = payload.id
    const notifications: any[] = []

    // 1. Admin replies on student's discussions (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const discussions = await db.discussion.findMany({
      where: {
        studentId,
        adminReply: { not: null },
        updatedAt: { gte: sevenDaysAgo }
      },
      select: {
        id: true, title: true, adminReply: true, updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    for (const d of discussions) {
      if (d.adminReply) {
        notifications.push({
          id: `disc-${d.id}`,
          type: 'admin-reply',
          title: 'Admin replied to your doubt',
          message: `Your discussion "${d.title}" has a new reply`,
          timestamp: d.updatedAt,
          read: false,
          link: 'discussion',
        })
      }
    }

    // 2. Recent achievements unlocked (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentAchievements = await db.studentAchievement.findMany({
      where: {
        studentId,
        unlockedAt: { gte: thirtyDaysAgo }
      },
      include: {
        achievement: { select: { name: true, icon: true, threshold: true } }
      },
      orderBy: { unlockedAt: 'desc' },
      take: 3,
    })

    for (const a of recentAchievements) {
      notifications.push({
        id: `ach-${a.id}`,
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: `You earned "${a.achievement.name}" badge`,
        timestamp: a.unlockedAt,
        read: false,
        link: 'dashboard',
      })
    }

    // 3. Quiz performance notifications (last 7 days)
    const recentQuizAttempts = await db.quizAttempt.findMany({
      where: {
        studentId,
        createdAt: { gte: sevenDaysAgo }
      },
      include: {
        quiz: { select: { title: true, points: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    for (const a of recentQuizAttempts) {
      if (a.passed && a.pointsEarned > 0) {
        notifications.push({
          id: `quiz-${a.id}`,
          type: 'quiz-passed',
          title: 'Quiz Passed! 🎉',
          message: `You passed "${a.quiz.title}" with ${Math.round((a.score / a.totalQuestions) * 100)}% and earned ${a.pointsEarned} points`,
          timestamp: a.createdAt,
          read: false,
          link: 'quiz',
        })
      }
    }

    // 4. Streak milestones & course info (merged query)
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { currentStreak: true, lastStrikeAt: true, courseId: true }
    })

    if (student && student.currentStreak > 0 && student.lastStrikeAt) {
      const strikeDate = new Date(student.lastStrikeAt)
      if (strikeDate >= sevenDaysAgo) {
        const milestones = [7, 14, 30, 50, 100]
        for (const m of milestones) {
          if (student.currentStreak === m) {
            notifications.push({
              id: `streak-${m}`,
              type: 'streak',
              title: `${m}-Day Streak! 🔥`,
              message: `You've studied for ${m} consecutive days. Keep it up!`,
              timestamp: strikeDate,
              read: false,
              link: 'dashboard',
            })
            break
          }
        }
      }
    }

    // 5. Pending review requests (if student hasn't submitted a review yet)
    const hasReview = await db.review.findFirst({
      where: { studentId },
      select: { id: true }
    })
    if (!hasReview) {
      notifications.push({
        id: 'review-pending',
        type: 'info',
        title: 'Share your experience',
        message: 'Submit a review to help other students',
        timestamp: new Date(),
        read: false,
        link: 'landing',
      })
    }

    // 6. Admin push notifications (targeted to all students or this student's course)
    const adminNotifications = await db.adminNotification.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        OR: [
          { targetRole: 'all' },
          { targetRole: 'student' },
          ...(student?.courseId ? [{ targetRole: 'batch', targetCourseId: student.courseId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Get read receipts for this student
    const readIds = await db.adminNotificationRead.findMany({
      where: { studentId },
      select: { notificationId: true },
    })
    const readSet = new Set(readIds.map(r => r.notificationId))

    for (const n of adminNotifications) {
      notifications.push({
        id: `admin-${n.id}`,
        type: n.type === 'alert' ? 'alert' : 'info',
        title: n.title,
        message: n.message,
        timestamp: n.createdAt,
        read: readSet.has(n.id),
        link: null,
      })
    }

    // Sort by timestamp desc
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    })
  } catch (error: any) {
    console.error('Student notifications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
