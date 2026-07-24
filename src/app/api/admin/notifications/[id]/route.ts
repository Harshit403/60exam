import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await db.adminNotification.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  await db.adminNotification.delete({ where: { id } })

  return NextResponse.json({ success: true })
}