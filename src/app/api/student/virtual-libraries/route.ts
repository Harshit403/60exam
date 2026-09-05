import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { ensureVirtualLibraryStageColumns, ensureRoomLockColumns } from '@/lib/ensure-columns'

// GET /api/student/virtual-libraries - list active video rooms with presence + capacity
export async function GET(req: NextRequest) {
  const auth = verifyAuth(req)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = auth.id
  await ensureVirtualLibraryStageColumns()
  await ensureRoomLockColumns()

  const currentMember = await db.virtualLibraryMember.findFirst({
    where: { studentId, leftAt: null },
    include: { room: true },
  })

  const rooms = await db.virtualLibrary.findMany({
    where: { isActive: true },
    include: { members: { where: { leftAt: null }, select: { studentId: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const list = rooms.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    maxCapacity: r.maxCapacity,
    present: r.members.length,
    isFull: r.members.length >= r.maxCapacity,
    isLocked: r.isLocked,
    lockVotes: Array.isArray(r.lockVotes) ? (r.lockVotes as string[]) : [],
    isCurrentUserMember: r.members.some(m => m.studentId === studentId),
    createdAt: r.createdAt,
  }))

  return NextResponse.json({
    currentRoom: currentMember ? {
      id: currentMember.room.id,
      name: currentMember.room.name,
      description: currentMember.room.description,
      maxCapacity: currentMember.room.maxCapacity,
    } : null,
    rooms: list,
  })
}