import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { randomAnonymousIdentity, type AnonymousIdentity } from '@/lib/anonymous-identity'
import { ensureVirtualLibraryStageColumns, ensureRoomMemberIpColumn, ensureRoomLockColumns, logRoomActivity } from '@/lib/ensure-columns'
import { getClientIp } from '@/lib/request-ip'

// GET /api/student/virtual-libraries/[id] - room detail + presence (anonymized)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await ensureVirtualLibraryStageColumns()

  const room = await db.virtualLibrary.findUnique({
    where: { id },
    include: { members: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' } } },
  })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (!room.isActive) return NextResponse.json({ error: 'Room is inactive' }, { status: 403 })

  const myMember = room.members.find(m => m.studentId === auth.id)

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

// POST /api/student/virtual-libraries/[id] - join room
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const studentId = auth.id

  const body = await _req.json().catch(() => ({}))
  const gender: 'male' | 'female' | null = body?.gender === 'male' || body?.gender === 'female' ? body.gender : null
  await ensureVirtualLibraryStageColumns()
  await ensureRoomMemberIpColumn()
  await ensureRoomLockColumns()
  const ipAddress = getClientIp(_req)

  const room = await db.virtualLibrary.findUnique({ where: { id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (!room.isActive) return NextResponse.json({ error: 'Room is inactive' }, { status: 403 })

  const blocked = await db.blockedUser.findFirst({ where: { studentId } })
  if (blocked) return NextResponse.json({ error: 'You are blocked from joining rooms' }, { status: 403 })

  const existing = await db.virtualLibraryMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId } },
  })
  // Reuse the existing identity only when it already matches the gender the
  // user just picked; otherwise regenerate so the anonymous name always
  // matches the selected gender (never a stale/random-gender name).
  if (existing && !existing.leftAt && (!gender || existing.gender === gender)) {
    return NextResponse.json({ member: {
      userId: existing.studentId,
      displayName: existing.displayName,
      color: existing.color,
      role: existing.role,
      onStage: existing.onStage,
      gender: existing.gender,
    } })
  }

  // A locked room is closed to NEW members: no one outside the current roster
  // (including a returning member who left) can join until it is unlocked.
  if (room.isLocked && !(existing && !existing.leftAt)) {
    return NextResponse.json({ error: 'This room is locked. Only existing members can join.' }, { status: 403 })
  }

  const activeCount = await db.virtualLibraryMember.count({ where: { roomId: id, leftAt: null } })
  if (activeCount >= room.maxCapacity) {
    return NextResponse.json({ error: 'This room is full' }, { status: 400 })
  }

  const taken = await db.virtualLibraryMember.findMany({
    where: { roomId: id, leftAt: null },
    select: { displayName: true, color: true },
  })
  const takenList = taken.map(t => ({ name: t.displayName, color: t.color }))

  // Always honor the identity the user saved on their device (localStorage) so
  // their anonymous name stays the SAME across every visit — never regenerate it
  // just because a name/color happens to be taken in this room (the 24-name pool
  // collides constantly in busy rooms, which caused a new random name each join).
  const saved = body?.identity && typeof body.identity?.name === 'string' && typeof body.identity?.color === 'string'
    ? { name: body.identity.name, color: body.identity.color }
    : null
  const identity: AnonymousIdentity = saved
    ? { ...saved, gender: gender || 'neutral' }
    : randomAnonymousIdentity(gender, takenList)

  // First joiner becomes the moderator AND goes on stage instantly (no wait).
  // The second joiner goes directly on stage but WITHOUT moderator power (role
  // 'stage'). Everyone else — including anyone REJOINING the room — lands in
  // the audience and must use the "go on stage" request flow. A returning
  // member never reclaims moderator/stage automatically; they can earn it again
  // via the normal wait / request flow. Everyone except the 1st joiner waits
  // 5 minutes from join before they can become moderator.
  const MOD_WAIT_MS = 5 * 60 * 1000
  const isRejoin = !!(existing && existing.leftAt)
  const moderatorEligibleAt = !isRejoin && activeCount === 0 ? null : new Date(Date.now() + MOD_WAIT_MS)
  let role = 'audience'
  let onStage = false
  if (isRejoin) {
    // Rejoin → audience, always. Stage is reserved for the room's 1st and 2nd
    // joiners; a returning member is a subsequent join, so they start in the
    // audience with a fresh moderator wait (no reclaimed moderation window).
    role = 'audience'
    onStage = false
  } else if (activeCount === 0) {
    role = 'moderator'
    onStage = true
  } else if (activeCount === 1) {
    role = 'stage'
    onStage = true
  }

  const member = await db.virtualLibraryMember.upsert({
    where: { roomId_studentId: { roomId: id, studentId } },
    update: {
      leftAt: null,
      displayName: identity.name,
      color: identity.color,
      gender: identity.gender,
      role,
      onStage,
      stageRequested: false,
      stageInvited: false,
      onStageSince: onStage ? new Date() : null,
      removalVotes: [],
      lastActiveAt: new Date(),
      ipAddress,
      bandwidthMb: 0,
      moderatorEligibleAt,
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
      moderatorEligibleAt,
    },
  })

  await logRoomActivity({
    kind: 'library',
    roomId: id,
    roomName: room.name,
    studentId,
    displayName: member.displayName,
    color: member.color,
    action: 'join',
    ipAddress,
  })

  return NextResponse.json({ member: {
    userId: member.studentId,
    displayName: member.displayName,
    color: member.color,
    role: member.role,
    onStage: member.onStage,
    gender: member.gender,
    moderatorEligibleAt: member.moderatorEligibleAt?.getTime() || null,
  } })
}

// DELETE /api/student/virtual-libraries/[id] - leave room
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await ensureVirtualLibraryStageColumns()
  await ensureRoomMemberIpColumn()
  const ipAddress = getClientIp(_req)
  const member = await db.virtualLibraryMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId: auth.id } },
  })
  if (member && !member.leftAt) {
    await db.virtualLibraryMember.update({
      where: { id: member.id },
      data: { leftAt: new Date(), stageRequested: false, stageInvited: false },
    })
    const room = await db.virtualLibrary.findUnique({ where: { id }, select: { name: true } })
    await logRoomActivity({
      kind: 'library',
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

// PATCH /api/student/virtual-libraries/[id] - heartbeat
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.virtualLibraryMember.updateMany({
    where: { roomId: id, studentId: auth.id, leftAt: null },
    data: { lastActiveAt: new Date(), ipAddress: getClientIp(_req) },
  })
  return NextResponse.json({ success: true })
}