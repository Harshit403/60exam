import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// PUT /api/admin/discussions/[id]/reply
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params
  const { adminReply } = await req.json()
  const discussion = await db.discussion.update({ where: { id }, data: { adminReply } })
  return NextResponse.json({ discussion })
}
