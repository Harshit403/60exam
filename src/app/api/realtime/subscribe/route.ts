import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { initSSE, sendSSE, sendHeartbeat } from '@/lib/sse'

const LIVE_ROOM_ID = 'mission-cs-public'
const POLL_INTERVAL = 3000
const HEARTBEAT_INTERVAL = 30000

function computeTimerState(timerState: any, timerStartedAt: string | Date | null): any {
  if (!timerState || !timerState.running || !timerStartedAt) return timerState
  const startedAt = new Date(timerStartedAt).getTime()
  const elapsed = Math.floor((Date.now() - startedAt) / 1000)
  const remaining = Math.max(0, (timerState.total || 0) - elapsed)
  return { ...timerState, remaining, running: remaining > 0 }
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get('channel') || ''
  const token = req.nextUrl.searchParams.get('token') || ''
  const authHeader = req.headers.get('authorization') || ''

  let auth = verifyToken(token)
  if (!auth) {
    const bearerToken = authHeader.replace('Bearer ', '')
    auth = verifyToken(bearerToken)
  }
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const userId = auth.id
  const userName = auth.email?.split('@')[0] || 'User'
  const userRole = auth.role || 'student'

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let pollTimer: ReturnType<typeof setInterval> | null = null
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null
      let lastPoll = Date.now()

      const write = (chunk: string) => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(chunk)) } catch { /* ignore */ }
        }
      }

      const res = { writeHead: () => {}, write }

      initSSE(res)

      if (channel === 'notifications') {
        sendSSE(res, 'message', { type: 'connected' })
        heartbeatTimer = setInterval(() => sendHeartbeat(res), HEARTBEAT_INTERVAL)
        req.signal.addEventListener('abort', () => { closed = true })
        return
      }

      // Room channel: discussion live chat
      if (channel.startsWith('room:')) {
        const roomId = channel.slice(5)

        ;(async () => {
          const messages = await db.roomMessage.findMany({
            where: { roomId },
            orderBy: { createdAt: 'asc' },
            take: 50,
          })
          sendSSE(res, 'room-history', { messages: messages.map(m => ({
            id: m.id, roomId: m.roomId, userId: m.userId, userName: m.userName,
            userRole: m.userRole, content: m.content, type: m.type, timestamp: m.createdAt.getTime(),
          })) })
        })()

        pollTimer = setInterval(async () => {
          if (closed) return
          try {
            const newMessages = await db.roomMessage.findMany({
              where: { roomId, createdAt: { gt: new Date(lastPoll) } },
              orderBy: { createdAt: 'asc' },
            })
            if (newMessages.length > 0) {
              for (const m of newMessages) {
                sendSSE(res, 'new-message', {
                  id: m.id, roomId: m.roomId, userId: m.userId, userName: m.userName,
                  userRole: m.userRole, content: m.content, type: m.type, timestamp: m.createdAt.getTime(),
                })
              }
            }
            lastPoll = Date.now()
          } catch { /* ignore */ }
        }, POLL_INTERVAL)

        heartbeatTimer = setInterval(() => sendHeartbeat(res), HEARTBEAT_INTERVAL)
      }

      // Group channel
      if (channel.startsWith('group:')) {
        const groupId = channel.slice(6)

        ;(async () => {
          const messageWhere: any = { groupId }
          if (userRole !== 'admin') {
            messageWhere.OR = [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ]
          }
          const [messages, members] = await Promise.all([
            db.groupMessage.findMany({
              where: messageWhere,
              orderBy: { createdAt: 'asc' },
              take: 50,
              include: { student: { select: { fullName: true } } },
            }),
            db.groupMember.findMany({
              where: { groupId, leftAt: null },
              include: { student: { select: { id: true, fullName: true, email: true } } },
            }),
          ])
          sendSSE(res, 'group-history', {
            messages: messages.map(m => ({
              id: m.id, userId: m.studentId,
              userName: m.anonymousName || m.student.fullName.split(' ')[0],
              content: m.content, type: m.type === 'text' ? 'text' : 'system',
              timestamp: m.createdAt.getTime(),
              ipAddress: m.ipAddress, gender: m.anonymousGender,
              disappearAfter: m.disappearAfter, expiresAt: m.expiresAt?.getTime() || null,
            })),
          })
          sendSSE(res, 'group-members', {
            members: members.map(m => ({
              userId: m.studentId, name: m.student.fullName.split(' ')[0],
              email: userRole === 'admin' ? m.student.email : undefined,
              timerState: computeTimerState(m.timerState, (m as any).timerStartedAt),
            })),
          })
        })()

        pollTimer = setInterval(async () => {
          if (closed) return
          try {
            // Auto-exit members inactive for > 1 hour
            const inactiveThreshold = new Date(Date.now() - 60 * 60 * 1000)
            await db.groupMember.updateMany({
              where: { groupId, leftAt: null, lastActiveAt: { lt: inactiveThreshold } },
              data: { leftAt: new Date() },
            })

            const whereNew: any = { groupId, createdAt: { gt: new Date(lastPoll) } }
            if (userRole !== 'admin') {
              whereNew.OR = [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ]
            }
            const [newMessages, currentMembers] = await Promise.all([
              db.groupMessage.findMany({
                where: whereNew,
                orderBy: { createdAt: 'asc' },
                include: { student: { select: { fullName: true } } },
              }),
              db.groupMember.findMany({
                where: { groupId, leftAt: null },
                include: { student: { select: { id: true, fullName: true, email: true } } },
              }),
            ])
            if (newMessages.length > 0) {
              for (const m of newMessages) {
                if (m.studentId === userId) continue
                sendSSE(res, 'group-chat-message', {
                  id: m.id, userId: m.studentId,
                  userName: m.anonymousName || m.student.fullName.split(' ')[0],
                  content: m.content, type: m.type === 'text' ? 'text' : 'system',
                  timestamp: m.createdAt.getTime(),
                  ipAddress: m.ipAddress, gender: m.anonymousGender,
                  disappearAfter: m.disappearAfter, expiresAt: m.expiresAt?.getTime() || null,
                })
              }
            }
            const currentMembersData = currentMembers.map(m => ({
              userId: m.studentId, name: m.student.fullName.split(' ')[0],
              email: userRole === 'admin' ? m.student.email : undefined,
              timerState: computeTimerState(m.timerState, (m as any).timerStartedAt),
            }))
            sendSSE(res, 'group-members', { members: currentMembersData })
            lastPoll = Date.now()
          } catch { /* ignore */ }
        }, POLL_INTERVAL)

        heartbeatTimer = setInterval(() => sendHeartbeat(res), HEARTBEAT_INTERVAL)
      }

      req.signal.addEventListener('abort', () => {
        closed = true
        if (pollTimer) clearInterval(pollTimer)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
