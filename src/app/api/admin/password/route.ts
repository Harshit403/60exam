import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders, comparePassword, hashPassword } from '@/lib/auth'

// PUT /api/admin/password
export async function PUT(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { currentPassword, newPassword } = await req.json()
  const admin = await db.admin.findUnique({ where: { id: auth.id } })
  if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
  
  const valid = await comparePassword(currentPassword, admin.password)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  
  const hashedPassword = await hashPassword(newPassword)
  await db.admin.update({ where: { id: auth.id }, data: { password: hashedPassword } })
  
  return NextResponse.json({ success: true })
}
