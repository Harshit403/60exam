import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { filterContent, hasBlockedContent } from '@/lib/content-filter'

// GET /api/student/groups/[id]/messages - Get recent messages for a group
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'student') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const studentId = auth.id
    const { id: groupId } = await params

    // Check if student is a member of this group
    const membership = await db.groupMember.findFirst({
      where: { studentId, groupId, leftAt: null }
    })
    if (!membership) {
      return Response.json({ error: 'You are not a member of this group' }, { status: 403 })
    }

    // Get last 100 messages
    const messages = await db.groupMessage.findMany({
      where: { groupId },
      include: {
        student: { select: { id: true, fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Return in chronological order (oldest first)
    return Response.json({
      messages: messages.reverse().map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        senderId: m.studentId,
        senderName: m.student.fullName,
        createdAt: m.createdAt
      }))
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/student/groups/[id]/messages - Send a message to group chat
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'student') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const studentId = auth.id
    const { id: groupId } = await params

    // Check if student is a member of this group
    const membership = await db.groupMember.findFirst({
      where: { studentId, groupId, leftAt: null }
    })
    if (!membership) {
      return Response.json({ error: 'You are not a member of this group' }, { status: 403 })
    }

    const body = await request.json()
    const { content, type = 'text' } = body

    if (!content || !content.trim()) {
      return Response.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Apply content filter
    const filteredContent = filterContent(content.trim())
    const hadBlockedContent = hasBlockedContent(content.trim())

    const message = await db.groupMessage.create({
      data: {
        groupId,
        studentId,
        content: filteredContent,
        type
      },
      include: {
        student: { select: { id: true, fullName: true } }
      }
    })

    return Response.json({
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        senderId: message.studentId,
        senderName: message.student.fullName,
        createdAt: message.createdAt,
        wasFiltered: hadBlockedContent
      }
    }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
