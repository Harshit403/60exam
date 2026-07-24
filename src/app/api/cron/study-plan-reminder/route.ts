import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getISTTodayStart, getISTTodayEnd } from '@/lib/date-utils'
import { Knock } from '@knocklabs/node'

const knockClient = new Knock(process.env.KNOCK_SECRET_API_KEY || '')
const cronSecret = process.env.CRON_SECRET
const workflowKey = process.env.KNOCK_WORKFLOW_KEY || 'admin-push-notification'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret && authHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const todayStart = getISTTodayStart()
    const todayEnd = getISTTodayEnd()

    const plans = await db.studyPlan.findMany({
      where: { plannedDate: { gte: todayStart, lte: todayEnd } },
      include: {
        student: { select: { id: true, fullName: true } },
        chapter: { include: { subject: { select: { name: true } } } },
      },
    })

    if (plans.length === 0) {
      return NextResponse.json({ sent: 0, total: 0, plans: 0 })
    }

    const studentIds = [...new Set(plans.map(p => p.student?.id).filter(Boolean))] as string[]
    const preferences = studentIds.length > 0
      ? await db.student.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, studyReminderEnabled: true },
        })
      : []
    const disabledSet = new Set(preferences.filter(p => !p.studyReminderEnabled).map(p => p.id))

    const grouped = new Map<string, { studentId: string; fullName: string; subjects: Set<string> }>()
    for (const p of plans) {
      if (!p.student || disabledSet.has(p.student.id)) continue
      let entry = grouped.get(p.student.id)
      if (!entry) {
        entry = { studentId: p.student.id, fullName: p.student.fullName, subjects: new Set() }
        grouped.set(p.student.id, entry)
      }
      if (p.chapter?.subject?.name) entry.subjects.add(p.chapter.subject.name)
    }

    let sent = 0
    let studentsNotified = 0

    for (const [, student] of grouped) {
      const subjectList = [...student.subjects].join(', ')
      const title = 'Study Reminder'
      const message = subjectList
        ? `You planned to study ${subjectList} today. Please start studying — exams are coming!`
        : `You have study plans for today. Please start studying — exams are coming!`

      await db.student.update({
        where: { id: student.studentId },
        data: { lastReminderSentAt: new Date() },
      })

      try {
        await knockClient.workflows.trigger(workflowKey, {
          recipients: [student.studentId],
          data: { title, message, timestamp: Date.now() },
        })
        sent++
        studentsNotified++
      } catch {
        continue
      }
    }

    return NextResponse.json({
      sent,
      totalPlans: plans.length,
      studentsNotified,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}