import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET /api/admin/groups - List all study groups with member counts
export async function GET(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const groups = await db.studyGroup.findMany({
      include: {
        _count: { select: { members: true, messages: true } },
        subject: { select: { name: true } },
        members: {
          where: { leftAt: null },
          include: { student: { select: { id: true, fullName: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return Response.json({
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        maxCapacity: g.maxCapacity,
        isActive: g.isActive,
        subjectId: g.subjectId,
        subjectName: g.subject?.name || null,
        totalMembers: g._count.members,
        activeMembers: g.members.length,
        totalMessages: g._count.messages,
        members: g.members.map(m => ({
          id: m.id,
          studentId: m.studentId,
          studentName: m.student.fullName,
          studentEmail: m.student.email,
          joinedAt: m.joinedAt
        })),
        createdAt: g.createdAt,
        updatedAt: g.updatedAt
      }))
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/groups - Create a new study group
export async function POST(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, maxCapacity, subjectId } = body

    if (!name || !name.trim()) {
      return Response.json({ error: 'Group name is required' }, { status: 400 })
    }

    const group = await db.studyGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        maxCapacity: maxCapacity || 10,
        subjectId: subjectId || null,
      },
      include: {
        _count: { select: { members: true, messages: true } },
        subject: { select: { name: true } }
      }
    })

    return Response.json({ group }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
