import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  console.log('[push/subscribe] auth header present:', !!authHeader, 'starts with Bearer:', authHeader?.startsWith('Bearer '))

  const auth = verifyAuth(req)
  if (!auth || auth.role !== 'student') {
    console.log('[push/subscribe] auth failed, role:', auth?.role)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { endpoint, p256dh, auth: authSecret, userAgent } = await req.json()
    if (!endpoint || !p256dh || !authSecret) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 })
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth: authSecret, userAgent: userAgent || null },
      create: { studentId: auth.id, endpoint, p256dh, auth: authSecret, userAgent: userAgent || null },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = verifyAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { endpoint } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    await db.pushSubscription.deleteMany({ where: { endpoint, studentId: auth.id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
