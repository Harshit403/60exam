import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { initSSE, sendSSE, sendHeartbeat } from '@/lib/sse'

const LIVE_ROOM_ID = 'mission-cs-public'
const POLL_INTERVAL = 3000
const HEARTBEAT_INTERVAL = 30000

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
          const [messages, members] = await Promise.all([
            db.groupMessage.findMany({
              where: { groupId },
              orderBy: { createdAt: 'asc' },
              take: 50,
              include: { student: { select: { fullName: true } } },
            }),
            db.groupMember.findMany({
              where: { groupId, leftAt: null },
              include: { student: { select: { id: true, fullName: true } } },
            }),
          ])
          sendSSE(res, 'group-history', {
            messages: messages.map(m => ({
              id: m.id, userId: m.studentId, userName: m.student.fullName,
              content: m.content, type: m.type === 'text' ? 'text' : 'system',
              timestamp: m.createdAt.getTime(),
            })),
          })
          sendSSE(res, 'group-members', {
            members: members.map(m => ({
              userId: m.studentId, name: m.student.fullName,
              timerState: m.timerState as any,
            })),
          })
        })()

        pollTimer = setInterval(async () => {
          if (closed) return
          try {
            const [newMessages, currentMembers] = await Promise.all([
              db.groupMessage.findMany({
                where: { groupId, createdAt: { gt: new Date(lastPoll) } },
                orderBy: { createdAt: 'asc' },
                include: { student: { select: { fullName: true } } },
              }),
              db.groupMember.findMany({
                where: { groupId, leftAt: null },
                include: { student: { select: { id: true, fullName: true } } },
              }),
            ])
            if (newMessages.length > 0) {
              for (const m of newMessages) {
                sendSSE(res, 'group-chat-message', {
                  id: m.id, userId: m.studentId, userName: m.student.fullName,
                  content: m.content, type: m.type === 'text' ? 'text' : 'system',
                  timestamp: m.createdAt.getTime(),
                })
              }
            }
            const currentMembersData = currentMembers.map(m => ({
              userId: m.studentId, name: m.student.fullName,
              timerState: m.timerState as any,
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
