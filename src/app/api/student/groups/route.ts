import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET /api/student/groups - List available groups with member counts
export async function GET(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'student') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const studentId = auth.id

    // Check if student is blocked
    const isBlocked = await db.blockedUser.findFirst({
      where: { studentId }
    })

    // Get student's current active group membership
    const currentMembership = await db.groupMember.findFirst({
      where: { studentId, leftAt: null },
      include: { group: true }
    })

    // Get all active groups with active member counts
    const groups = await db.studyGroup.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { members: true } },
        subject: { select: { name: true } },
        members: {
          where: { leftAt: null },
          select: {
            student: { select: { id: true, fullName: true } },
            joinedAt: true,
            lastReadAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Compute unread counts for groups where user is a member
    const groupsWithUnread = await Promise.all(groups.map(async (g) => {
      const myMembership = g.members.find(m => m.student.id === studentId)
      let unreadCount = 0
      if (myMembership) {
        const since = myMembership.lastReadAt || myMembership.joinedAt
        unreadCount = await db.groupMessage.count({
          where: { groupId: g.id, createdAt: { gt: since } },
        })
      }
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        maxCapacity: g.maxCapacity,
        subjectId: g.subjectId,
        subjectName: g.subject?.name || null,
        activeMembers: g.members.length,
        totalMembers: g._count.members,
        isFull: g.members.length >= g.maxCapacity,
        isCurrentUserMember: !!myMembership,
        unreadCount,
        members: g.members.map(m => ({
          studentId: m.student.id,
          studentName: m.student.fullName,
          joinedAt: m.joinedAt
        })),
        createdAt: g.createdAt
      }
    }))

    return Response.json({
      isBlocked: !!isBlocked,
      blockReason: isBlocked?.reason || null,
      currentGroup: currentMembership ? {
        id: currentMembership.group.id,
        name: currentMembership.group.name,
        description: currentMembership.group.description,
        joinedAt: currentMembership.joinedAt
      } : null,
      groups: groupsWithUnread
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
