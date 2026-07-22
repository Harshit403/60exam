import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, comparePassword, generateToken } from '@/lib/auth'

// POST /api/admin/auth/login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    
    // Check if admin exists, if not create default
    let admin = await db.admin.findFirst()
    if (!admin) {
      const hash = await hashPassword('admin123')
      admin = await db.admin.create({
        data: { email: 'admin@missioncs.com', password: hash, name: 'Admin' }
      })
    }
    
    const targetAdmin = await db.admin.findUnique({ where: { email } })
    if (!targetAdmin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    const valid = await comparePassword(password, targetAdmin.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    const token = generateToken({ id: targetAdmin.id, role: 'admin', email: targetAdmin.email })
    
    return NextResponse.json({
      token,
      user: { id: targetAdmin.id, email: targetAdmin.email, name: targetAdmin.name, role: 'admin' }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
