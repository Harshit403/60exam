import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// PUT /api/student/study-plan/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await db.studyPlan.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  if (existing.studentId !== auth.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { chapterId, notes, plannedDate } = await req.json()

  const plan = await db.studyPlan.update({
    where: { id },
    data: {
      chapterId: chapterId || null,
      notes: notes ?? null,
      plannedDate: plannedDate ? new Date(plannedDate) : undefined,
    },
    include: { chapter: { include: { subject: true } } },
  })

  return NextResponse.json({ plan })
}

// DELETE /api/student/study-plan/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await db.studyPlan.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  if (existing.studentId !== auth.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.studyPlan.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
