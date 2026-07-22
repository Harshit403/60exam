import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/student/discussions
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const discussions = await db.discussion.findMany({
    where: { parentReplyId: null },
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, fullName: true } },
      replies: {
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  const mapped = discussions.map(d => ({
    ...d,
    student: d.student ? { ...d.student, name: d.student.fullName } : undefined,
    replies: d.replies.map(r => ({
      ...r,
      student: r.student ? { ...r.student, name: r.student.fullName } : undefined
    }))
  }))

  return NextResponse.json({ discussions: mapped })
}

// POST /api/student/discussions
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { title, content, parentReplyId } = await req.json()
  
  const discussion = await db.discussion.create({
    data: {
      studentId: auth.id,
      title,
      content,
      parentReplyId: parentReplyId || null
    },
    include: { student: { select: { fullName: true } } }
  })
  
  return NextResponse.json({ discussion })
}
