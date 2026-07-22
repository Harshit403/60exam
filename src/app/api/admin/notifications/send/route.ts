import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, message, type = 'info', targetRole = 'all', targetCourseId = null } = body

  if (!title || !title.trim() || !message || !message.trim()) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  const notification = await db.adminNotification.create({
    data: {
      title: title.trim(),
      message: message.trim(),
      type,
      targetRole,
      targetCourseId,
      createdBy: auth.id,
    },
  })

  return NextResponse.json({
    success: true,
    notification: {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
    },
  })
}
