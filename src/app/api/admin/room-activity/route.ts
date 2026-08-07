import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { ensureRoomActivityTable } from '@/lib/ensure-columns'

// GET /api/admin/room-activity?kind=discussion|library&roomId=xxx&page=1&limit=50
// Admin-only join/leave history for discussion rooms and virtual libraries.
export async function GET(request: Request) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureRoomActivityTable()

    const url = new URL(request.url)
    const kind = url.searchParams.get('kind')
    const roomId = url.searchParams.get('roomId')
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100))

    const where: { kind?: string; roomId?: string } = {}
    if (kind === 'discussion' || kind === 'library') where.kind = kind
    if (roomId) where.roomId = roomId

    const [logs, total] = await Promise.all([
      db.roomActivityLog.findMany({
        where,
        include: { student: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.roomActivityLog.count({ where }),
    ])

    return Response.json({
      logs: logs.map(l => ({
        id: l.id,
        kind: l.kind,
        roomId: l.roomId,
        roomName: l.roomName,
        studentId: l.studentId,
        studentName: l.student?.fullName || null,
        studentEmail: l.student?.email || null,
        displayName: l.displayName,
        color: l.color,
        action: l.action,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      total,
      totalPages: Math.ceil(total / limit),
      page,
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
