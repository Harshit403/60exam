import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  switch (action) {
    // ─── Discussion Room: send message ──────────────────────────────
    case 'room-message': {
      const { roomId, content } = body
      if (!roomId || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      const msg = await db.roomMessage.create({
        data: {
          roomId,
          userId: auth.id,
          userName: auth.email?.split('@')[0] || 'User',
          userRole: auth.role,
          content,
          type: 'message',
        },
      })
      return NextResponse.json({ message: msg })
    }

    // ─── Group: send chat message ───────────────────────────────────
    case 'group-message': {
      const { groupId, content } = body
      if (!groupId || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      const msg = await db.groupMessage.create({
        data: {
          groupId,
          studentId: auth.id,
          content,
          type: 'text',
        },
      })
      await db.groupMember.updateMany({
        where: { groupId, studentId: auth.id, leftAt: null },
        data: { lastActiveAt: new Date() },
      })
      return NextResponse.json({ message: msg })
    }

    // ─── Group: sync timer state ────────────────────────────────────
    case 'group-timer': {
      const { groupId, timerState } = body
      if (!groupId || !timerState) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      await db.groupMember.updateMany({
        where: { groupId, studentId: auth.id, leftAt: null },
        data: { timerState, lastActiveAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }

    // ─── Group: comparison request ──────────────────────────────────
    case 'group-comparison-request': {
      const { groupId } = body
      if (!groupId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      await db.groupMessage.create({
        data: {
          groupId,
          studentId: auth.id,
          content: '__comparison_request__',
          type: 'system',
        },
      })
      await db.groupMember.updateMany({
        where: { groupId, studentId: auth.id, leftAt: null },
        data: { lastActiveAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }

    // ─── Group: comparison response ─────────────────────────────────
    case 'group-comparison-response': {
      const { groupId, accepted } = body
      if (!groupId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      await db.groupMessage.create({
        data: {
          groupId,
          studentId: auth.id,
          content: accepted ? '__comparison_accepted__' : '__comparison_declined__',
          type: 'system',
        },
      })
      await db.groupMember.updateMany({
        where: { groupId, studentId: auth.id, leftAt: null },
        data: { lastActiveAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
