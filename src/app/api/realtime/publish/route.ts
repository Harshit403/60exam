import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { hubPublish } from '@/lib/realtime-hub'
import { ensureStageInvitedColumn, ensureVirtualLibraryStageColumns } from '@/lib/ensure-columns'

function newSignalId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch { /* fall through */ }
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// RoomSignal was added to the schema after the app was first deployed, so the
// table may not exist on the live DB yet. Create it lazily on first use so
// cross-instance signaling works without requiring a manual migration.
let roomSignalTableReady = false
async function ensureRoomSignalTable() {
  if (roomSignalTableReady) return
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RoomSignal" (
      "id" TEXT NOT NULL,
      "channel" TEXT NOT NULL,
      "from" TEXT NOT NULL,
      "to" TEXT,
      "data" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RoomSignal_pkey" PRIMARY KEY ("id")
    );
  `)
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "RoomSignal_channel_createdAt_idx" ON "RoomSignal" ("channel", "createdAt")`,
  ).catch(() => {})
  roomSignalTableReady = true
}

// Relay a WebRTC signal: persist to the shared DB (works across serverless
// instances) and also fan out through the in-memory hub (instant on one
// instance). The same id is used on both paths so clients can dedupe.
async function relaySignal(channel: string, from: string, to: string | null, data: any) {
  const id = newSignalId()
  try {
    await db.roomSignal.create({
      data: { id, channel, from, to: to || null, data: data as any },
    })
  } catch {
    // Table likely missing on the live DB — self-heal once, then retry.
    try {
      await ensureRoomSignalTable()
      await db.roomSignal.create({
        data: { id, channel, from, to: to || null, data: data as any },
      })
    } catch { /* DB relay still unavailable; rely on in-memory hub fallback */ }
  }
  hubPublish(channel, 'signal', { id, from, to: to || null, data })
}

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
      await relaySignal(`droom:${roomId}`, auth.id, to, data)
      return NextResponse.json({ ok: true })
    }

    // ─── Discussion Room: stage control ────────────────────────────
    case 'discussion-stage': {
      const { roomId, target, stageAction } = body
      if (!roomId || !target) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      await ensureStageInvitedColumn()
      const myMember = await db.discussionRoomMember.findFirst({
        where: { roomId, studentId: auth.id, leftAt: null },
        select: { id: true, role: true, onStage: true, stageRequested: true, stageInvited: true },
      })
      if (!myMember) return NextResponse.json({ error: 'Not in room' }, { status: 403 })

      // ── Self actions (any member) ──
      if (stageAction === 'request') {
        if (myMember.onStage) return NextResponse.json({ error: 'Already on stage' }, { status: 400 })
        await db.discussionRoomMember.update({ where: { id: myMember.id }, data: { stageRequested: true, stageInvited: false, lastActiveAt: new Date() } })
        hubPublish(`droom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }
      if (stageAction === 'cancel-request') {
        await db.discussionRoomMember.update({ where: { id: myMember.id }, data: { stageRequested: false } })
        hubPublish(`droom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }
      if (stageAction === 'accept-invite') {
        if (myMember.onStage) return NextResponse.json({ error: 'Already on stage' }, { status: 400 })
        if (!myMember.stageInvited) return NextResponse.json({ error: 'No pending invitation' }, { status: 400 })
        await db.discussionRoomMember.update({
          where: { id: myMember.id },
          data: { role: 'stage', onStage: true, stageRequested: false, stageInvited: false, onStageSince: new Date(), lastActiveAt: new Date() },
        })
        hubPublish(`droom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }
      if (stageAction === 'decline-invite') {
        if (!myMember.stageInvited) return NextResponse.json({ error: 'No pending invitation' }, { status: 400 })
        await db.discussionRoomMember.update({ where: { id: myMember.id }, data: { stageInvited: false } })
        hubPublish(`droom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }

      // ── Moderator actions ──
      if (myMember.role !== 'moderator') {
        return NextResponse.json({ error: 'Only a moderator can do that' }, { status: 403 })
      }
      const targetMember = await db.discussionRoomMember.findFirst({
        where: { roomId, studentId: target, leftAt: null },
        select: { id: true, role: true, stageRequested: true, stageInvited: true },
      })
      if (!targetMember) return NextResponse.json({ error: 'Target not in room' }, { status: 404 })

      if (stageAction === 'approve') {
        await db.discussionRoomMember.update({
          where: { id: targetMember.id },
          data: { role: 'stage', onStage: true, stageRequested: false, stageInvited: false, onStageSince: new Date() },
        })
      } else if (stageAction === 'deny') {
        await db.discussionRoomMember.update({ where: { id: targetMember.id }, data: { stageRequested: false } })
      } else if (stageAction === 'remove') {
        await db.discussionRoomMember.update({
          where: { id: targetMember.id },
          data: { role: 'audience', onStage: false, stageRequested: false, stageInvited: false, onStageSince: null },
        })
      } else if (stageAction === 'invite') {
        if (targetMember.stageInvited) return NextResponse.json({ error: 'Already invited' }, { status: 400 })
        await db.discussionRoomMember.update({
          where: { id: targetMember.id },
          data: { stageInvited: true, stageRequested: false },
        })
      } else if (stageAction === 'uninvite') {
        await db.discussionRoomMember.update({ where: { id: targetMember.id }, data: { stageInvited: false } })
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
      await relaySignal(`vroom:${roomId}`, auth.id, to, data)
      return NextResponse.json({ ok: true })
    }

    // ─── Virtual Library: stage control (mirrors discussion rooms) ─
    case 'library-stage': {
      const { roomId, target, stageAction } = body
      if (!roomId || !target) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      await ensureVirtualLibraryStageColumns()
      const myMember = await db.virtualLibraryMember.findFirst({
        where: { roomId, studentId: auth.id, leftAt: null },
        select: { id: true, role: true, onStage: true, stageRequested: true, stageInvited: true },
      })
      if (!myMember) return NextResponse.json({ error: 'Not in room' }, { status: 403 })

      // ── Self actions (any member) ──
      if (stageAction === 'request') {
        if (myMember.onStage) return NextResponse.json({ error: 'Already on stage' }, { status: 400 })
        await db.virtualLibraryMember.update({ where: { id: myMember.id }, data: { stageRequested: true, stageInvited: false, lastActiveAt: new Date() } })
        hubPublish(`vroom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }
      if (stageAction === 'cancel-request') {
        await db.virtualLibraryMember.update({ where: { id: myMember.id }, data: { stageRequested: false } })
        hubPublish(`vroom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }
      if (stageAction === 'accept-invite') {
        if (myMember.onStage) return NextResponse.json({ error: 'Already on stage' }, { status: 400 })
        if (!myMember.stageInvited) return NextResponse.json({ error: 'No pending invitation' }, { status: 400 })
        await db.virtualLibraryMember.update({
          where: { id: myMember.id },
          data: { role: 'stage', onStage: true, stageRequested: false, stageInvited: false, onStageSince: new Date(), lastActiveAt: new Date() },
        })
        hubPublish(`vroom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }
      if (stageAction === 'decline-invite') {
        if (!myMember.stageInvited) return NextResponse.json({ error: 'No pending invitation' }, { status: 400 })
        await db.virtualLibraryMember.update({ where: { id: myMember.id }, data: { stageInvited: false } })
        hubPublish(`vroom:${roomId}`, 'refresh', {})
        return NextResponse.json({ ok: true })
      }

      // ── Moderator actions ──
      if (myMember.role !== 'moderator') {
        return NextResponse.json({ error: 'Only a moderator can do that' }, { status: 403 })
      }
      const targetMember = await db.virtualLibraryMember.findFirst({
        where: { roomId, studentId: target, leftAt: null },
        select: { id: true, role: true, stageRequested: true, stageInvited: true },
      })
      if (!targetMember) return NextResponse.json({ error: 'Target not in room' }, { status: 404 })

      if (stageAction === 'approve') {
        await db.virtualLibraryMember.update({
          where: { id: targetMember.id },
          data: { role: 'stage', onStage: true, stageRequested: false, stageInvited: false, onStageSince: new Date() },
        })
      } else if (stageAction === 'deny') {
        await db.virtualLibraryMember.update({ where: { id: targetMember.id }, data: { stageRequested: false } })
      } else if (stageAction === 'remove') {
        await db.virtualLibraryMember.update({
          where: { id: targetMember.id },
          data: { role: 'audience', onStage: false, stageRequested: false, stageInvited: false, onStageSince: null },
        })
      } else if (stageAction === 'invite') {
        if (targetMember.stageInvited) return NextResponse.json({ error: 'Already invited' }, { status: 400 })
        await db.virtualLibraryMember.update({
          where: { id: targetMember.id },
          data: { stageInvited: true, stageRequested: false },
        })
      } else if (stageAction === 'uninvite') {
        await db.virtualLibraryMember.update({ where: { id: targetMember.id }, data: { stageInvited: false } })
      } else {
        return NextResponse.json({ error: 'Unknown stage action' }, { status: 400 })
      }

      hubPublish(`vroom:${roomId}`, 'refresh', {})
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
