import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// DELETE /api/admin/discussions/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params
  // Delete replies first
  await db.discussion.deleteMany({ where: { parentReplyId: id } })
  await db.discussion.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
