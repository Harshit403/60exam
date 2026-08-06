import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { ensureStageInvitedColumn } from '@/lib/ensure-columns'

// GET /api/admin/discussion-rooms - list audio rooms with live members (real identity)
export async function GET(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureStageInvitedColumn()

    const rooms = await db.discussionRoom.findMany({
      include: {
        members: {
          where: { leftAt: null },
          include: { student: { select: { id: true, fullName: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        maxCapacity: r.maxCapacity,
        isActive: r.isActive,
        present: r.members.length,
        members: r.members.map(m => ({
          id: m.id,
          studentId: m.studentId,
          studentName: m.student.fullName,
          studentEmail: m.student.email,
          displayName: m.displayName,
          color: m.color,
          role: m.role,
          onStage: m.onStage,
          stageRequested: m.stageRequested,
          joinedAt: m.joinedAt,
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/discussion-rooms - create an audio room
export async function POST(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, maxCapacity } = body
    if (!name || !name.trim()) return Response.json({ error: 'Room name is required' }, { status: 400 })

    const room = await db.discussionRoom.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        maxCapacity: maxCapacity || 10,
        createdBy: auth.id,
      },
    })
    return Response.json({ room }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}