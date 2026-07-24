import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import webpush from 'web-push'

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@missioncs.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export async function POST(req: NextRequest) {
  const auth = verifyAuth(req)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { title, message, targetCourseId } = await req.json()
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message required' }, { status: 400 })
    }

    const where: any = {}
    if (targetCourseId) {
      where.student = { courseId: targetCourseId }
    }

    const subscriptions = await db.pushSubscription.findMany({
      where,
      include: { student: { select: { fullName: true } } },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, total: 0 })
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.' }, { status: 500 })
    }

    const payload = JSON.stringify({ title, message, timestamp: Date.now() })
    let sent = 0

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

    return NextResponse.json({ sent, total: subscriptions.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
