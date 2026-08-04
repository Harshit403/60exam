import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// DELETE /api/admin/realtime/rooms/[roomId]/messages/[messageId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string; messageId: string }> },
) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId, messageId } = await params

    const message = await db.roomMessage.findFirst({
      where: { id: messageId, roomId },
    })
    if (!message) return Response.json({ error: 'Message not found' }, { status: 404 })

    await db.roomMessage.delete({ where: { id: messageId } })

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}