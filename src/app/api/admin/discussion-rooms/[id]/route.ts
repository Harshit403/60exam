import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET /api/admin/discussion-rooms/[id] - room detail with live members
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const room = await db.discussionRoom.findUnique({
      where: { id },
      include: {
        members: {
          where: { leftAt: null },
          include: { student: { select: { id: true, fullName: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })
    if (!room) return Response.json({ error: 'Room not found' }, { status: 404 })

    return Response.json({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        maxCapacity: room.maxCapacity,
        isActive: room.isActive,
        members: room.members.map(m => ({
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
      },
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/admin/discussion-rooms/[id] - update room
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const existing = await db.discussionRoom.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Room not found' }, { status: 404 })

    const allowed: Record<string, any> = {}
    if (body.name !== undefined) allowed.name = body.name.trim()
    if (body.description !== undefined) allowed.description = body.description?.trim() || null
    if (body.maxCapacity !== undefined) allowed.maxCapacity = Number(body.maxCapacity)
    if (body.isActive !== undefined) allowed.isActive = Boolean(body.isActive)

    const room = await db.discussionRoom.update({ where: { id }, data: allowed })
    return Response.json({ room })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/discussion-rooms/[id] - delete room
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await db.discussionRoom.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Room not found' }, { status: 404 })

    await db.discussionRoom.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}