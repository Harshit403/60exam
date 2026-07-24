import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const student = await db.student.findUnique({
    where: { id: auth.id },
    select: { studyReminderEnabled: true },
  })

  return NextResponse.json({ studyReminderEnabled: student?.studyReminderEnabled ?? true })
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { enabled } = await req.json()

  await db.student.update({
    where: { id: auth.id },
    data: { studyReminderEnabled: enabled },
  })

  return NextResponse.json({ studyReminderEnabled: enabled })
}
