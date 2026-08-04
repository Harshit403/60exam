import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { randomAnonymousIdentity } from '@/lib/anonymous-identity'

// GET /api/student/virtual-libraries/[id] - room detail + presence (anonymized)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

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

  const room = await db.virtualLibrary.findUnique({ where: { id } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (!room.isActive) return NextResponse.json({ error: 'Room is inactive' }, { status: 403 })

  const blocked = await db.blockedUser.findFirst({ where: { studentId } })
  if (blocked) return NextResponse.json({ error: 'You are blocked from joining rooms' }, { status: 403 })

  const existing = await db.virtualLibraryMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId } },
  })
  if (existing && !existing.leftAt) {
    return NextResponse.json({ member: {
      userId: existing.studentId,
      displayName: existing.displayName,
      color: existing.color,
      onStage: existing.onStage,
      gender: existing.gender,
    } })
  }

  const activeCount = await db.virtualLibraryMember.count({ where: { roomId: id, leftAt: null } })
  if (activeCount >= room.maxCapacity) {
    return NextResponse.json({ error: 'This room is full' }, { status: 400 })
  }

  const taken = await db.virtualLibraryMember.findMany({
    where: { roomId: id, leftAt: null },
    select: { displayName: true, color: true },
  })
  const identity = randomAnonymousIdentity(null, taken.map(t => ({ name: t.displayName, color: t.color })))

  // In video library everyone is a speaker by default (onStage=true); no fixed moderator
  const member = await db.virtualLibraryMember.upsert({
    where: { roomId_studentId: { roomId: id, studentId } },
    update: {
      leftAt: null,
      displayName: identity.name,
      color: identity.color,
      gender: identity.gender,
      onStage: true,
      removalVotes: [],
      lastActiveAt: new Date(),
    },
    create: {
      roomId: id,
      studentId,
      displayName: identity.name,
      color: identity.color,
      gender: identity.gender,
      onStage: true,
    },
  })

  return NextResponse.json({ member: {
    userId: member.studentId,
    displayName: member.displayName,
    color: member.color,
    onStage: member.onStage,
    gender: member.gender,
  } })
}

// DELETE /api/student/virtual-libraries/[id] - leave room
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(_req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await db.virtualLibraryMember.findUnique({
    where: { roomId_studentId: { roomId: id, studentId: auth.id } },
  })
  if (member && !member.leftAt) {
    await db.virtualLibraryMember.update({ where: { id: member.id }, data: { leftAt: new Date() } })
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
    data: { lastActiveAt: new Date() },
  })
  return NextResponse.json({ success: true })
}