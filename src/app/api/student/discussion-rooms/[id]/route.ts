import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { randomAnonymousIdentity, type AnonymousIdentity } from '@/lib/anonymous-identity'
import { ensureStageInvitedColumn, ensureRoomMemberIpColumn, ensureRoomLockColumns, logRoomActivity } from '@/lib/ensure-columns'
import { getClientIp } from '@/lib/request-ip'

// GET /api/student/discussion-rooms/[id] - room detail + current presence (anonymized)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await ensureStageInvitedColumn()

  const room = await db.discussionRoom.findUnique({
    where: { id },
    include: { members: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' } } },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (!room.isActive) return NextResponse.json({ error: 'Room is inactive' }, { status: 403 })

  const myMember = room.members.find(m => m.studentId === auth.id)

  // Anonymized presence: never expose real identity
  const presence = room.members.map(m => ({
    userId: m.studentId,
    displayName: m.displayName,
    color: m.color,
    gender: m.gender,
    role: m.role,
    onStage: m.onStage,
  }))

  return NextResponse.json({
    room: {
      id: room.id,
      name: room.name,
      description: room.description,
      maxCapacity: room.maxCapacity,
      present: room.members.length,
      full: room.members.length >= room.maxCapacity,
    },
    me: myMember ? {
      userId: myMember.studentId,
      displayName: myMember.displayName,
      color: myMember.color,
      role: myMember.role,
      onStage: myMember.onStage,
      gender: myMember.gender,
    } : null,
    presence,
  })
}

// POST /api/student/discussion-rooms/[id] - join room (assign anonymous identity)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const studentId = auth.id

  const body = await _req.json().catch(() => ({}))
  const gender: 'male' | 'female' | null = body?.gender === 'male' || body?.gender === 'female' ? body.gender : null
  await ensureStageInvitedColumn()
  await ensureRoomMemberIpColumn()
  await ensureRoomLockColumns()
  const ipAddress = getClientIp(_req)

  const room = await db.discussionRoom.findUnique({ where: { id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (!room.isActive) return NextResponse.json({ error: 'Room is inactive' }, { status: 403 })

  // Blocked check
  const blocked = await db.blockedUser.findFirst({ where: { studentId } })
  if (blocked) return NextResponse.json({ error: 'You are blocked from joining rooms' }, { status: 403 })

  const existing = await db.discussionRoomMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId } },
  })
  // Reuse the existing identity only when it already matches the gender the
  // user just picked; otherwise regenerate so the anonymous name always
  // matches the selected gender (never a stale/random-gender name).
  if (existing && !existing.leftAt && (!gender || existing.gender === gender)) {
    return NextResponse.json({
      member: {
        userId: existing.studentId,
        displayName: existing.displayName,
        color: existing.color,
        role: existing.role,
        onStage: existing.onStage,
        gender: existing.gender,
      },
    })
  }

  // A locked room is closed to NEW members: no one outside the current roster
  // (including a returning member who left) can join until it is unlocked.
  if (room.isLocked && !(existing && !existing.leftAt)) {
    return NextResponse.json({ error: 'This room is locked. Only existing members can join.' }, { status: 403 })
  }

  // Capacity check (active members only)
  const activeCount = await db.discussionRoomMember.count({ where: { roomId: id, leftAt: null } })
  if (activeCount >= room.maxCapacity) {
    return NextResponse.json({ error: 'This room is full' }, { status: 400 })
  }

  const taken = await db.discussionRoomMember.findMany({
    where: { roomId: id, leftAt: null },
    select: { displayName: true, color: true },
  })

  // Always honor the identity the user saved on their device (localStorage) so
  // their anonymous name stays the SAME across every visit — never regenerate it
  // just because a name/color happens to be taken in this room (the 24-name pool
  // collides constantly in busy rooms, which caused a new random name each join).
  const saved = body?.identity && typeof body.identity?.name === 'string' && typeof body.identity?.color === 'string'
    ? { name: body.identity.name, color: body.identity.color }
    : null
  const takenList = taken.map(t => ({ name: t.displayName, color: t.color }))
  const identity: AnonymousIdentity = saved
    ? { ...saved, gender: gender || 'neutral' }
    : randomAnonymousIdentity(gender, takenList)

  // First two joiners become moderators (and go on stage); everyone else is
  // audience. Rejoining users always land back in the audience — a returning
  // moderator whose 2-hour moderation window is still valid keeps it (renewed
  // from this visit, per "moderation counts from the last visit for that room").
  const nowMs = Date.now()
  const MODERATOR_TTL_MS = 2 * 60 * 60 * 1000
  const modStillValid = !!(existing?.moderatorUntil && new Date(existing.moderatorUntil).getTime() > nowMs)
  let role = 'audience'
  let onStage = false
  let moderatorUntil: Date | null = null
  if (existing && !existing.leftAt) {
    // Already in the room (e.g. gender switch): keep the position, refresh the
    // moderation window if it is still valid.
    role = existing.role
    onStage = existing.onStage
    moderatorUntil = modStillValid ? new Date(nowMs + MODERATOR_TTL_MS) : existing.moderatorUntil
  } else if (existing && existing.leftAt) {
    // Rejoin → audience. A returning moderator with a valid window keeps (and
    // renews) their moderation; otherwise they start fresh as audience.
    role = modStillValid ? 'moderator' : 'audience'
    onStage = false
    moderatorUntil = modStillValid ? new Date(nowMs + MODERATOR_TTL_MS) : null
  } else if (activeCount < 2) {
    role = 'moderator'
    onStage = true
    moderatorUntil = new Date(nowMs + MODERATOR_TTL_MS)
  }

  const member = await db.discussionRoomMember.upsert({
    where: { roomId_studentId: { roomId: id, studentId } },
    update: {
      leftAt: null,
      displayName: identity.name,
      color: identity.color,
      gender: identity.gender,
      role,
      onStage,
      stageRequested: false,
      onStageSince: onStage ? new Date() : null,
      lastActiveAt: new Date(),
      ipAddress,
      bandwidthMb: 0,
      moderatorUntil,
    },
    create: {
      roomId: id,
      studentId,
      displayName: identity.name,
      color: identity.color,
      gender: identity.gender,
      role,
      onStage,
      onStageSince: onStage ? new Date() : null,
      ipAddress,
      bandwidthMb: 0,
      moderatorUntil,
    },
  })

  await logRoomActivity({
    kind: 'discussion',
    roomId: id,
    roomName: room.name,
    studentId,
    displayName: member.displayName,
    color: member.color,
    action: 'join',
    ipAddress,
  })

  return NextResponse.json({
    member: {
      userId: member.studentId,
      displayName: member.displayName,
      color: member.color,
      role: member.role,
      onStage: member.onStage,
      gender: member.gender,
    },
  })
}

// DELETE /api/student/discussion-rooms/[id] - leave room
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await ensureStageInvitedColumn()
  await ensureRoomMemberIpColumn()
  const ipAddress = getClientIp(_req)

  const member = await db.discussionRoomMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId: auth.id } },
  })
  if (member && !member.leftAt) {
    await db.discussionRoomMember.update({
      where: { id: member.id },
      data: { leftAt: new Date(), stageRequested: false, stageInvited: false },
    })
    const room = await db.discussionRoom.findUnique({ where: { id }, select: { name: true } })
    await logRoomActivity({
      kind: 'discussion',
      roomId: id,
      roomName: room?.name || id,
      studentId: auth.id,
      displayName: member.displayName,
      color: member.color,
      action: 'leave',
      ipAddress: ipAddress || member.ipAddress,
      bandwidthMb: member.bandwidthMb ?? null,
    })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/student/discussion-rooms/[id] - heartbeat (keep alive)
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.discussionRoomMember.updateMany({
    where: { roomId: id, studentId: auth.id, leftAt: null },
    data: { lastActiveAt: new Date(), ipAddress: getClientIp(_req) },
  })

  return NextResponse.json({ success: true })
}