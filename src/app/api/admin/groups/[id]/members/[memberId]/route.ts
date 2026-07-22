import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// DELETE /api/admin/groups/[id]/members/[memberId] - Remove a member from a group
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: groupId, memberId } = await params

    const membership = await db.groupMember.findFirst({
      where: { id: memberId, groupId, leftAt: null }
    })
    if (!membership) return Response.json({ error: 'Group member not found' }, { status: 404 })

    await db.groupMember.update({
      where: { id: memberId },
      data: { leftAt: new Date() }
    })

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
