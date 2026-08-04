import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET /api/admin/live-study - Students currently in an active Pomodoro session
export async function GET(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const activeThreshold = new Date(Date.now() - 5 * 60 * 1000)

    const members = await db.groupMember.findMany({
      where: { leftAt: null, lastActiveAt: { gte: activeThreshold } },
      include: {
        student: { select: { id: true, fullName: true, email: true, course: { select: { title: true } } } },
        group: { select: { id: true, name: true } },
      },
    })

    const now = Date.now()
    const liveStudents = members
      .map(m => {
        const ts = m.timerState as any
        if (!ts || ts.running !== true || ts.paused === true) return null

        const total = Number(ts.total) || 0
        let remaining = Number(ts.remaining) || total
        if (m.timerStartedAt) {
          const startedAt = new Date(m.timerStartedAt).getTime()
          remaining = Math.max(0, total - Math.floor((now - startedAt) / 1000))
        }

        return {
          studentId: m.student.id,
          name: m.student.fullName,
          email: m.student.email,
          courseTitle: m.student.course?.title || null,
          groupId: m.group.id,
          groupName: m.group.name,
          phase: ts.phase || 'work',
          phaseLabel: ts.phaseLabel || (ts.phase === 'break' ? 'Break' : 'Focus'),
          subjectName: ts.subjectName || null,
          chapterName: ts.chapterName || null,
          total,
          remaining: Math.max(0, remaining),
          running: remaining > 0,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null && m.running)

    return Response.json({
      liveStudents,
      total: liveStudents.length,
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}