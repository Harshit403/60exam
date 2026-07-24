import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getISTTodayStart, getISTTodayEnd } from '@/lib/date-utils'
import webpush from 'web-push'

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@missioncs.com'
const cronSecret = process.env.CRON_SECRET

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret && authHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  try {
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMin = now.getUTCMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`

    const todayStart = getISTTodayStart()
    const todayEnd = getISTTodayEnd()

    // Find students with daily plan reminder enabled whose time matches (within a 15 min window)
    const students = await db.student.findMany({
      where: {
        dailyPlanReminderEnabled: true,
      },
      select: {
        id: true,
        fullName: true,
        dailyPlanReminderTime: true,
        lastReminderSentAt: true,
      },
    })

    let sent = 0
    let skipped = 0

    for (const student of students) {
      // Check if reminder time matches current time (within 15 min window)
      if (!student.dailyPlanReminderTime) continue

      const [remH, remM] = student.dailyPlanReminderTime.split(':').map(Number)
      const remTotal = remH * 60 + remM
      const curTotal = currentHour * 60 + currentMin
      if (Math.abs(curTotal - remTotal) > 7) {
        skipped++
        continue
      }

      // Check if reminder was already sent today
      if (student.lastReminderSentAt) {
        const lastSentDate = new Date(student.lastReminderSentAt).toDateString()
        if (lastSentDate === now.toDateString()) {
          skipped++
          continue
        }
      }

      // Get today's study plans
      const plans = await db.studyPlan.findMany({
        where: { studentId: student.id, plannedDate: { gte: todayStart, lte: todayEnd } },
        include: { chapter: { include: { subject: { select: { name: true } } } } },
      })

      if (plans.length === 0) {
        skipped++
        continue
      }

      // Build notification message
      const subjects = [...new Set(plans.map(p => p.chapter?.subject?.name).filter(Boolean))] as string[]
      const chapters = plans.map(p => p.chapter?.name).filter(Boolean)
      const title = '📚 Today\'s Study Plan'
      const message = subjects.length > 0
        ? `You planned: ${chapters.join(', ')} (${subjects.join(', ')})`
        : `You have ${plans.length} chapter(s) planned for today`

      // Update lastReminderSentAt
      await db.student.update({
        where: { id: student.id },
        data: { lastReminderSentAt: now },
      })

      // Send push notification to all subscriptions
      const subscriptions = await db.pushSubscription.findMany({
        where: { studentId: student.id },
      })

      if (subscriptions.length === 0) {
        skipped++
        continue
      }

      const payload = JSON.stringify({ title, message, timestamp: Date.now() })

      await Promise.allSettled(
        subscriptions.map(async sub => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            )
            sent++
          } catch {
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          }
        })
      )
    }

    return NextResponse.json({
      sent,
      skipped,
      total: students.length,
      time: currentTimeStr,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
