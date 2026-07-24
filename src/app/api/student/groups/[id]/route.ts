import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// POST /api/student/groups/[id] - Join a group (or rejoin after leaving)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'student') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const studentId = auth.id
    const { id: groupId } = await params

    // Check if student is blocked
    const isBlocked = await db.blockedUser.findFirst({
      where: { studentId }
    })
    if (isBlocked) {
      return Response.json({ error: 'You are blocked from group study', reason: isBlocked.reason }, { status: 403 })
    }

    // Check group exists and is active
    const group = await db.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: { where: { leftAt: null } }
      }
    })
    if (!group) return Response.json({ error: 'Group not found' }, { status: 404 })
    if (!group.isActive) return Response.json({ error: 'Group is not active' }, { status: 400 })

    // Check if already an active member of THIS group
    const existingActiveInGroup = group.members.find(m => m.studentId === studentId)
    if (existingActiveInGroup) {
      return Response.json({ error: 'You are already a member of this group' }, { status: 400 })
    }

    // Check if already in another active group
    const existingActiveMembership = await db.groupMember.findFirst({
      where: { studentId, leftAt: null }
    })
    if (existingActiveMembership) {
      return Response.json({ error: 'You are already in another group. Please leave it first.' }, { status: 400 })
    }

    // Check capacity
    if (group.members.length >= group.maxCapacity) {
      return Response.json({ error: 'Group is at maximum capacity' }, { status: 400 })
    }

    // Find ANY previous membership record for this student-group pair
    // This handles the rejoin case: student left and wants to rejoin the same group
    const previousMembership = await db.groupMember.findFirst({
      where: { studentId, groupId }
    })

    let membership
    if (previousMembership) {
      // Re-join same group: update the existing record (reset leftAt and update joinedAt)
      membership = await db.groupMember.update({
        where: { id: previousMembership.id },
        data: { leftAt: null, joinedAt: new Date() },
        include: {
          group: { select: { name: true } }
        }
      })
    } else {
      // First time joining this group (create new record)
      membership = await db.groupMember.create({
        data: { groupId, studentId },
        include: {
          group: { select: { name: true } }
        }
      })
    }

    return Response.json({
      membership: {
        id: membership.id,
        groupId: membership.groupId,
        groupName: membership.group.name,
        joinedAt: membership.joinedAt
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Join group error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/student/groups/[id] - Leave the current group
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'student') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const studentId = auth.id
    const { id: groupId } = await params

    // Find active membership
    const membership = await db.groupMember.findFirst({
      where: { studentId, groupId, leftAt: null }
    })
    if (!membership) {
      return Response.json({ error: 'You are not a member of this group' }, { status: 400 })
    }

    // Leave the group — set leftAt timestamp
    await db.groupMember.update({
      where: { id: membership.id },
      data: { leftAt: new Date() }
    })

    return Response.json({ success: true, message: 'Left the group successfully' })
  } catch (error: any) {
    console.error('Leave group error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/student/groups/[id] - Mark messages as read
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'student') return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const studentId = auth.id
    const { id: groupId } = await params

    const membership = await db.groupMember.findFirst({
      where: { studentId, groupId, leftAt: null }
    })
    if (!membership) {
      return Response.json({ error: 'Not a member of this group' }, { status: 400 })
    }

    await db.groupMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() }
    })

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
