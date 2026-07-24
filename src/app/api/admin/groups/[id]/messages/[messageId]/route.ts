import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: groupId, messageId } = await params

    const message = await db.groupMessage.findFirst({
      where: { id: messageId, groupId },
    })
    if (!message) return Response.json({ error: 'Message not found' }, { status: 404 })

    await db.groupMessage.delete({ where: { id: messageId } })

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}