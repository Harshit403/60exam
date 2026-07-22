import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders, hashPassword } from '@/lib/auth'

// PUT /api/admin/students/[id]/password
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { id } = await params
  const { password } = await req.json()
  
  const hashedPassword = await hashPassword(password)
  await db.student.update({ where: { id }, data: { password: hashedPassword } })
  
  return NextResponse.json({ success: true })
}
