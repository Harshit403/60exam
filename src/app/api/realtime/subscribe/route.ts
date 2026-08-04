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

        const resolveRoomUserNames = async (messages: { userId: string; userName: string }[]) => {
          const studentIds = [...new Set(messages.map(m => m.userId).filter(Boolean))]
          if (studentIds.length === 0) return new Map<string, string>()
          const students = await db.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, fullName: true },
          })
          return new Map(students.map(s => [s.id, s.fullName]))
        }

        const mapRoomMessage = (m: any, nameMap: Map<string, string>) => ({
          id: m.id, roomId: m.roomId, userId: m.userId,
          userName: nameMap.get(m.userId) || m.userName || 'User',
          userRole: m.userRole, content: m.content, type: m.type, timestamp: m.createdAt.getTime(),
        })

        ;(async () => {
          const messages = await db.roomMessage.findMany({
            where: { roomId },
            orderBy: { createdAt: 'asc' },
            take: 50,
          })
          const nameMap = await resolveRoomUserNames(messages)
          sendSSE(res, 'room-history', { messages: messages.map(m => mapRoomMessage(m, nameMap)) })
        })()

        pollTimer = setInterval(async () => {
          if (closed) return
          try {
            const newMessages = await db.roomMessage.findMany({
              where: { roomId, createdAt: { gt: new Date(lastPoll) } },
              orderBy: { createdAt: 'asc' },
            })
            if (newMessages.length > 0) {
              const nameMap = await resolveRoomUserNames(newMessages)
              for (const m of newMessages) {
                sendSSE(res, 'new-message', mapRoomMessage(m, nameMap))
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

        const lastAchievementsOf = async (studentIds: string[]) => {
          const uniq = [...new Set(studentIds.filter(Boolean))]
          if (uniq.length === 0) return new Map<string, string>()
          const rows = await db.studentAchievement.findMany({
            where: { studentId: { in: uniq } },
            include: { achievement: { select: { name: true } } },
          })
          const ordered = rows.sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
          const map = new Map<string, string>()
          for (const r of ordered) {
            if (!map.has(r.studentId)) map.set(r.studentId, r.achievement.name)
          }
          return map
        }

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
          const nameMap = await lastAchievementsOf([
            ...messages.map(m => m.studentId),
            ...members.map(m => m.studentId),
          ])
          sendSSE(res, 'group-history', {
            messages: messages.map(m => ({
              id: m.id, userId: m.studentId,
              userName: m.anonymousName || m.student.fullName.split(' ')[0],
              content: m.content, type: m.type === 'text' ? 'text' : 'system',
              timestamp: m.createdAt.getTime(),
              ipAddress: m.ipAddress, gender: m.anonymousGender,
              disappearAfter: m.disappearAfter, expiresAt: m.expiresAt?.getTime() || null,
              anonymous: !!m.anonymousName,
              lastAchievement: nameMap.get(m.studentId) || null,
            })),
          })
          sendSSE(res, 'group-members', {
            members: members.map(m => ({
              userId: m.studentId, name: m.student.fullName.split(' ')[0],
              email: userRole === 'admin' ? m.student.email : undefined,
              timerState: computeTimerState(m.timerState, (m as any).timerStartedAt),
              lastAchievement: nameMap.get(m.studentId) || null,
            })),
          })
        })()

        pollTimer = setInterval(async () => {
          if (closed) return
          try {
            // Auto-exit members inactive for > 1 hour (skip if timer is running)
            const inactiveThreshold = new Date(Date.now() - 60 * 60 * 1000)
            const staleMembers = await db.groupMember.findMany({
              where: { groupId, leftAt: null, lastActiveAt: { lt: inactiveThreshold } },
            })
            const toExit = staleMembers.filter(m => {
              if (!m.timerState) return true
              const ts = m.timerState as any
              return !(ts.running && !ts.paused)
            })
            if (toExit.length > 0) {
              await db.groupMember.updateMany({
                where: { id: { in: toExit.map(m => m.id) } },
                data: { leftAt: new Date() },
              })
            }

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
              const nameMap = await lastAchievementsOf(newMessages.map(m => m.studentId))
              for (const m of newMessages) {
                if (m.studentId === userId) continue
                sendSSE(res, 'group-chat-message', {
                  id: m.id, userId: m.studentId,
                  userName: m.anonymousName || m.student.fullName.split(' ')[0],
                  content: m.content, type: m.type === 'text' ? 'text' : 'system',
                  timestamp: m.createdAt.getTime(),
                  ipAddress: m.ipAddress, gender: m.anonymousGender,
                  disappearAfter: m.disappearAfter, expiresAt: m.expiresAt?.getTime() || null,
                  anonymous: !!m.anonymousName,
                  lastAchievement: nameMap.get(m.studentId) || null,
                })
              }
            }
            const nameMap = await lastAchievementsOf(currentMembers.map(m => m.studentId))
            const currentMembersData = currentMembers.map(m => ({
              userId: m.studentId, name: m.student.fullName.split(' ')[0],
              email: userRole === 'admin' ? m.student.email : undefined,
              timerState: computeTimerState(m.timerState, (m as any).timerStartedAt),
              lastAchievement: nameMap.get(m.studentId) || null,
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
