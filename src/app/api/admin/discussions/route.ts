import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/discussions
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const search = req.nextUrl.searchParams.get('search') || ''
  const where: any = { parentReplyId: null }
  if (search) where.OR = [{ title: { contains: search } }, { content: { contains: search } }]
  
  const discussions = (await db.discussion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      replies: { include: { student: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } }
    }
  })).map(d => ({
    ...d,
    student: d.student ? { ...d.student, name: d.student.fullName } : undefined,
    replies: d.replies?.map(r => ({
      ...r,
      student: r.student ? { ...r.student, name: r.student.fullName } : undefined
    }))
  }))
  return NextResponse.json({ discussions })
}
