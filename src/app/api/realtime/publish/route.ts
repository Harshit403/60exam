import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { hubPublish } from '@/lib/realtime-hub'

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

      // Students cannot chat while their Pomodoro focus session is running
      const activeMembership = await db.groupMember.findFirst({
        where: { groupId, studentId: auth.id, leftAt: null },
      })
      const ts = activeMembership?.timerState as any
      const hasActiveTimer = ts && ts.running === true && ts.paused !== true
      if (auth.role === 'student' && hasActiveTimer) {
        return NextResponse.json({ error: 'Finish your Pomodoro focus session to send messages in this group' }, { status: 400 })
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

    // ─── Discussion Room: WebRTC signaling ─────────────────────────
    case 'discussion-signal': {
      const { roomId, to, data } = body
      if (!roomId || !data) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      await db.discussionRoomMember.updateMany({
        where: { roomId, studentId: auth.id, leftAt: null },
        data: { lastActiveAt: new Date() },
      }).catch(() => {})
      await db.roomSignal.create({
        data: { channel: `droom:${roomId}`, from: auth.id, to: to || null, data: data as any },
      }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    // ─── Discussion Room: stage control ────────────────────────────
    case 'discussion-stage': {
      const { roomId, target, stageAction } = body
      if (!roomId || !target) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      const myMember = await db.discussionRoomMember.findFirst({
        where: { roomId, studentId: auth.id, leftAt: null },
      })
      if (!myMember) return NextResponse.json({ error: 'Not in room' }, { status: 403 })

      if (stageAction === 'request') {
        if (myMember.onStage) return NextResponse.json({ error: 'Already on stage' }, { status: 400 })
        await db.discussionRoomMember.update({ where: { id: myMember.id }, data: { stageRequested: true, lastActiveAt: new Date() } })
        hubPublish(`droom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }

      // approve/deny/remove require moderator
      if (myMember.role !== 'moderator') {
        return NextResponse.json({ error: 'Only a moderator can do that' }, { status: 403 })
      }
      const targetMember = await db.discussionRoomMember.findFirst({
        where: { roomId, studentId: target, leftAt: null },
      })
      if (!targetMember) return NextResponse.json({ error: 'Target not in room' }, { status: 404 })

      if (stageAction === 'approve') {
        await db.discussionRoomMember.update({
          where: { id: targetMember.id },
          data: { role: 'stage', onStage: true, stageRequested: false, onStageSince: new Date() },
        })
      } else if (stageAction === 'deny') {
        await db.discussionRoomMember.update({ where: { id: targetMember.id }, data: { stageRequested: false } })
      } else if (stageAction === 'remove') {
        await db.discussionRoomMember.update({
          where: { id: targetMember.id },
          data: { role: 'audience', onStage: false, stageRequested: false, onStageSince: null },
        })
      } else {
        return NextResponse.json({ error: 'Unknown stage action' }, { status: 400 })
      }

      hubPublish(`droom:${roomId}`, 'refresh', {})
      return NextResponse.json({ ok: true })
    }

    // ─── Discussion Room: heartbeat ────────────────────────────────
    case 'discussion-heartbeat': {
      const { roomId } = body
      if (!roomId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      await db.discussionRoomMember.updateMany({
        where: { roomId, studentId: auth.id, leftAt: null },
        data: { lastActiveAt: new Date() },
      }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    // ─── Virtual Library: WebRTC signaling ─────────────────────────
    case 'library-signal': {
      const { roomId, to, data } = body
      if (!roomId || !data) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      await db.virtualLibraryMember.updateMany({
        where: { roomId, studentId: auth.id, leftAt: null },
        data: { lastActiveAt: new Date() },
      }).catch(() => {})
      await db.roomSignal.create({
        data: { channel: `vroom:${roomId}`, from: auth.id, to: to || null, data: data as any },
      }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    // ─── Virtual Library: vote to remove a participant ─────────────
    case 'library-vote': {
      const { roomId, target, vote } = body
      if (!roomId || !target || typeof vote !== 'boolean') return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      if (target === auth.id) return NextResponse.json({ error: 'Cannot vote on yourself' }, { status: 400 })

      const targetMember = await db.virtualLibraryMember.findFirst({
        where: { roomId, studentId: target, leftAt: null },
      })
      if (!targetMember) return NextResponse.json({ error: 'Target not in room' }, { status: 404 })

      if (vote) {
        const votes = Array.isArray(targetMember.removalVotes) ? targetMember.removalVotes as string[] : []
        const next = votes.includes(auth.id) ? votes : [...votes, auth.id]
        await db.virtualLibraryMember.update({ where: { id: targetMember.id }, data: { removalVotes: next as any, lastActiveAt: new Date() } }).catch(() => {})
      } else {
        const votes = Array.isArray(targetMember.removalVotes) ? targetMember.removalVotes as string[] : []
        const next = votes.filter(v => v !== auth.id)
        await db.virtualLibraryMember.update({ where: { id: targetMember.id }, data: { removalVotes: next as any } }).catch(() => {})
      }

      hubPublish(`vroom:${roomId}`, 'refresh', {})
      return NextResponse.json({ ok: true })
    }

    // ─── Virtual Library: heartbeat ────────────────────────────────
    case 'library-heartbeat': {
      const { roomId } = body
      if (!roomId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      await db.virtualLibraryMember.updateMany({
        where: { roomId, studentId: auth.id, leftAt: null },
        data: { lastActiveAt: new Date() },
      }).catch(() => {})
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
