import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/approvals
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const setting = await db.setting.findUnique({ where: { key: 'signup_approval' } })
  const approvalEnabled = setting?.value === 'true'
  
  const pendingStudents = (await db.student.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    include: { course: true }
  })).map(s => ({ ...s, name: s.fullName }))
  
  return NextResponse.json({ approvalEnabled, pendingStudents })
}
