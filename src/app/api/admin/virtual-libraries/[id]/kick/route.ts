import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// DELETE /api/admin/virtual-libraries/[id]/kick?memberId=xxx - kick a member from a video room
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) return Response.json({ error: 'memberId query parameter is required' }, { status: 400 })

    const member = await db.virtualLibraryMember.findFirst({
      where: { id: memberId, roomId: id, leftAt: null },
    })
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

    await db.virtualLibraryMember.update({
      where: { id: member.id },
      data: { leftAt: new Date(), onStage: false },
    })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}