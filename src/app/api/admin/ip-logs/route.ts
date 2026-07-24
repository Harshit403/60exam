import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
  const search = searchParams.get('search') || ''
  const action = searchParams.get('action') || ''
  const studentId = searchParams.get('studentId') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { ipAddress: { contains: search, mode: 'insensitive' } },
      { path: { contains: search, mode: 'insensitive' } },
      { userAgent: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (action) where.action = action
  if (studentId) where.studentId = studentId

  const [logs, total] = await Promise.all([
    db.ipLog.findMany({
      where,
      include: { student: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.ipLog.count({ where }),
  ])

  const uniqueIps = await db.ipLog.groupBy({
    by: ['ipAddress'],
    _count: { ipAddress: true },
    orderBy: { _count: { ipAddress: 'desc' } },
    take: 20,
  })

  const totalStudents = await db.ipLog.groupBy({
    by: ['studentId'],
    _count: { studentId: true },
    where: { studentId: { not: null } },
  })

  return NextResponse.json({
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats: {
      totalVisits: total,
      uniqueIps: uniqueIps.length,
      uniqueStudents: totalStudents.length,
      topIps: uniqueIps,
    },
  })
}
