import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// POST /api/admin/room-blocks - block a student from all discussion/video rooms
export async function POST(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { studentId, reason } = await request.json()
    if (!studentId) return Response.json({ error: 'studentId is required' }, { status: 400 })

    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 })

    const existingBlock = await db.blockedUser.findFirst({ where: { studentId } })
    if (existingBlock) return Response.json({ error: 'Student is already blocked' }, { status: 400 })

    const blocked = await db.blockedUser.create({
      data: { studentId, reason: reason?.trim() || null },
      include: { student: { select: { id: true, fullName: true, email: true } } },
    })

    // Kick the student out of all active discussion rooms and virtual libraries
    await db.discussionRoomMember.updateMany({
      where: { studentId, leftAt: null },
      data: { leftAt: new Date(), onStage: false, stageRequested: false },
    })
    await db.virtualLibraryMember.updateMany({
      where: { studentId, leftAt: null },
      data: { leftAt: new Date(), onStage: false },
    })

    return Response.json({ blocked }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/room-blocks?studentId=xxx - unblock a student
export async function DELETE(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) return Response.json({ error: 'studentId query parameter is required' }, { status: 400 })

    const blocked = await db.blockedUser.findFirst({ where: { studentId } })
    if (!blocked) return Response.json({ error: 'Student is not blocked' }, { status: 404 })

    await db.blockedUser.delete({ where: { id: blocked.id } })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}