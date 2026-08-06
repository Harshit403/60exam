import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { randomAnonymousIdentity } from '@/lib/anonymous-identity'
import { ensureStageInvitedColumn } from '@/lib/ensure-columns'

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

  const room = await db.discussionRoom.findUnique({ where: { id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (!room.isActive) return NextResponse.json({ error: 'Room is inactive' }, { status: 403 })

  // Blocked check
  const blocked = await db.blockedUser.findFirst({ where: { studentId } })
  if (blocked) return NextResponse.json({ error: 'You are blocked from joining rooms' }, { status: 403 })

  const existing = await db.discussionRoomMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId } },
  })
  if (existing && !existing.leftAt) {
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

  // Capacity check (active members only)
  const activeCount = await db.discussionRoomMember.count({ where: { roomId: id, leftAt: null } })
  if (activeCount >= room.maxCapacity) {
    return NextResponse.json({ error: 'This room is full' }, { status: 400 })
  }

  const taken = await db.discussionRoomMember.findMany({
    where: { roomId: id, leftAt: null },
    select: { displayName: true, color: true },
  })

  const identity = randomAnonymousIdentity(gender, taken.map(t => ({ name: t.displayName, color: t.color })))

  // First two joiners become moderators (and go on stage); everyone else is audience
  let role = 'audience'
  let onStage = false
  if (activeCount < 2) {
    role = 'moderator'
    onStage = true
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
    },
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

  const member = await db.discussionRoomMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId: auth.id } },
  })
  if (member && !member.leftAt) {
    await db.discussionRoomMember.update({
      where: { id: member.id },
      data: { leftAt: new Date(), stageRequested: false, stageInvited: false },
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
    data: { lastActiveAt: new Date() },
  })

  return NextResponse.json({ success: true })
}