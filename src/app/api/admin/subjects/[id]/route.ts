import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// PUT /api/admin/subjects/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params
  const data = await req.json()
  const subject = await db.subject.update({ where: { id }, data, include: { course: true } })
  return NextResponse.json({ subject })
}

// DELETE /api/admin/subjects/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params
  await db.subject.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
