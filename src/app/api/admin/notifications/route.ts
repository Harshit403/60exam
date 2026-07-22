import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/notifications
// Returns counts of items requiring admin attention:
//   - pendingApprovals: students with status='pending'
//   - pendingReviews: reviews with status='pending'
//   - unreadDiscussions: top-level discussions without an admin reply
//   - total: sum of the above
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [pendingApprovals, pendingReviews, unreadDiscussions] = await Promise.all([
    db.student.count({ where: { status: 'pending' } }),
    db.review.count({ where: { status: 'pending' } }),
    // Only top-level discussion threads (not replies) without an admin reply
    db.discussion.count({
      where: {
        parentReplyId: null,
        adminReply: null,
      },
    }),
  ])

  const total = pendingApprovals + pendingReviews + unreadDiscussions

  return NextResponse.json({
    pendingApprovals,
    pendingReviews,
    unreadDiscussions,
    total,
  })
}
