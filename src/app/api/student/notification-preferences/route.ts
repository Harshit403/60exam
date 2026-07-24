import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const student = await db.student.findUnique({
    where: { id: auth.id },
    select: {
      studyReminderEnabled: true,
      pushNotificationsEnabled: true,
      dailyPlanReminderEnabled: true,
      dailyPlanReminderTime: true,
    },
  })

  return NextResponse.json({
    studyReminderEnabled: student?.studyReminderEnabled ?? true,
    pushNotificationsEnabled: student?.pushNotificationsEnabled ?? true,
    dailyPlanReminderEnabled: student?.dailyPlanReminderEnabled ?? true,
    dailyPlanReminderTime: student?.dailyPlanReminderTime ?? '09:00',
  })
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data: any = {}

  if (typeof body.pushNotificationsEnabled === 'boolean') data.pushNotificationsEnabled = body.pushNotificationsEnabled
  if (typeof body.dailyPlanReminderEnabled === 'boolean') data.dailyPlanReminderEnabled = body.dailyPlanReminderEnabled
  if (typeof body.dailyPlanReminderTime === 'string') data.dailyPlanReminderTime = body.dailyPlanReminderTime

  await db.student.update({ where: { id: auth.id }, data })

  const student = await db.student.findUnique({
    where: { id: auth.id },
    select: {
      studyReminderEnabled: true,
      pushNotificationsEnabled: true,
      dailyPlanReminderEnabled: true,
      dailyPlanReminderTime: true,
    },
  })

  return NextResponse.json({
    studyReminderEnabled: student?.studyReminderEnabled ?? true,
    pushNotificationsEnabled: student?.pushNotificationsEnabled ?? true,
    dailyPlanReminderEnabled: student?.dailyPlanReminderEnabled ?? false,
    dailyPlanReminderTime: student?.dailyPlanReminderTime ?? '09:00',
  })
}
