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

      // Prefer student's full name over email-derived username
      let userName = auth.email?.split('@')[0] || 'User'
      if (auth.role === 'student') {
        const student = await db.student.findUnique({
          where: { id: auth.id },
          select: { fullName: true },
        })
        if (student?.fullName) userName = student.fullName
      }

      const msg = await db.roomMessage.create({
        data: {
          roomId,
          userId: auth.id,
          userName,
          userRole: auth.role,
          content,
          type: 'message',
        },
      })
      return NextResponse.json({ message: msg })
    }

    // ─── Group: send chat message ───────────────────────────────────
    case 'group-message': {
      const { groupId, content, anonymousName, anonymousGender, disappearAfter } = body
      if (!groupId || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      // Students can only message while their Pomodoro session is running
      const activeMembership = await db.groupMember.findFirst({
        where: { groupId, studentId: auth.id, leftAt: null },
      })
      const ts = activeMembership?.timerState as any
      const hasActiveTimer = ts && ts.running === true && ts.paused !== true
      if (auth.role === 'student' && !hasActiveTimer) {
        return NextResponse.json({ error: 'Start a Pomodoro study session to send messages in this group' }, { status: 400 })
      }

      const forwarded = req.headers.get('x-forwarded-for')
      const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.headers.get('x-real-ip') || null)

      let expiresAt: Date | null = null
      if (disappearAfter === '30m') {
        expiresAt = new Date(Date.now() + 30 * 60 * 1000)
      } else if (disappearAfter === '24h') {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      }

      const msg = await db.groupMessage.create({
        data: {
          groupId,
          studentId: auth.id,
          content,
          type: 'text',
          anonymousName: anonymousName || null,
          anonymousGender: anonymousGender || null,
          ipAddress,
          disappearAfter: disappearAfter || null,
          expiresAt,
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
      const { groupId, timerState, timerStartedAt } = body
      if (!groupId || !timerState) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      const updateData: any = { timerState, lastActiveAt: new Date() }
      if (timerStartedAt) updateData.timerStartedAt = new Date(timerStartedAt)

      await db.groupMember.updateMany({
        where: { groupId, studentId: auth.id, leftAt: null },
        data: updateData,
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
