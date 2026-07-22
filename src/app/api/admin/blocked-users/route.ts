import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET /api/admin/blocked-users - List all blocked users with student details
export async function GET(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const blockedUsers = await db.blockedUser.findMany({
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            course: { select: { title: true } }
          }
        }
      },
      orderBy: { blockedAt: 'desc' }
    })

    return Response.json({
      blockedUsers: blockedUsers.map(b => ({
        id: b.id,
        studentId: b.studentId,
        studentName: b.student.fullName,
        studentEmail: b.student.email,
        studentMobile: b.student.mobile,
        courseTitle: b.student.course?.title || null,
        reason: b.reason,
        blockedAt: b.blockedAt
      }))
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
