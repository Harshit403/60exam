import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// POST /api/admin/groups/[id]/block - Block a student from group study
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: groupId } = await params
    const { studentId, reason } = await request.json()

    if (!studentId) {
      return Response.json({ error: 'studentId is required' }, { status: 400 })
    }

    // Check student exists
    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 })

    // Check if already blocked
    const existingBlock = await db.blockedUser.findFirst({
      where: { studentId }
    })
    if (existingBlock) {
      return Response.json({ error: 'Student is already blocked' }, { status: 400 })
    }

    // Block the student
    const blocked = await db.blockedUser.create({
      data: {
        studentId,
        reason: reason?.trim() || null,
      },
      include: {
        student: { select: { id: true, fullName: true, email: true } }
      }
    })

    // Remove student from any active group memberships
    await db.groupMember.updateMany({
      where: { studentId, leftAt: null },
      data: { leftAt: new Date() }
    })

    return Response.json({ blocked }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/groups/[id]/block - Unblock a student
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: groupId } = await params
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId query parameter is required' }, { status: 400 })
    }

    const blocked = await db.blockedUser.findFirst({
      where: { studentId }
    })
    if (!blocked) {
      return Response.json({ error: 'Student is not blocked' }, { status: 404 })
    }

    await db.blockedUser.delete({ where: { id: blocked.id } })

    return Response.json({ success: true, message: 'Student unblocked successfully' })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
