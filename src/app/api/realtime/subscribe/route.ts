import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { initSSE, sendSSE, sendHeartbeat } from '@/lib/sse'
import { hubSubscribe, hubPublish } from '@/lib/realtime-hub'
import { ensureVirtualLibraryStageColumns } from '@/lib/ensure-columns'

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
      let signalTimer: ReturnType<typeof setInterval> | null = null
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

      // Discussion room (audio) WebRTC channel
      let unsubHub: (() => void) | null = null
      if (channel.startsWith('droom:')) {
        const roomId = channel.slice(6)
        const MOD_INACTIVE_MS = 5 * 60 * 1000
        const MOD_ROTATION_MS = 5 * 60 * 1000

        const buildDroomState = async () => {
          const room = await db.discussionRoom.findUnique({
            where: { id: roomId },
            include: { members: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' } } },
          })
          if (!room) return null
          return {
            room: {
              id: room.id, name: room.name, present: room.members.length, maxCapacity: room.maxCapacity,
            },
            members: room.members.map(m => ({
              userId: m.studentId, displayName: m.displayName, color: m.color, gender: m.gender,
              role: m.role, onStage: m.onStage, stageRequested: m.stageRequested,
              stageInvited: m.stageInvited,
              onStageSince: m.onStageSince?.getTime() || null,
              micOff: !!m.micOff,
              speaking: !!m.speaking,
              stageApproveVotes: Array.isArray(m.stageApproveVotes) ? (m.stageApproveVotes as string[]) : [],
            })),
          }
        }

        const emitDroomState = async () => {
          const s = await buildDroomState()
          if (s) sendSSE(res, 'droom-state', s)
        }

        const maintainDroom = async () => {
          if (closed) return
          try {
            const now = Date.now()
            const members = await db.discussionRoomMember.findMany({ where: { roomId, leftAt: null } })
            let changed = false
            for (const m of members) {
              const lastActive = new Date(m.lastActiveAt || m.joinedAt).getTime()
              // Add/modify: promote on-stage members to moderator after 5 minutes
              if (m.onStage && m.role !== 'moderator' && m.onStageSince && (now - new Date(m.onStageSince).getTime()) >= MOD_ROTATION_MS) {
                await db.discussionRoomMember.update({ where: { id: m.id }, data: { role: 'moderator' } })
                changed = true
              }
              // Inactive removal (mirrors study-group auto-exit)
              if ((now - lastActive) >= MOD_INACTIVE_MS) {
                await db.discussionRoomMember.update({ where: { id: m.id }, data: { leftAt: new Date(), onStage: false, stageRequested: false, stageInvited: false } })
                changed = true
              }
            }
            if (changed) await emitDroomState()
          } catch { /* ignore */ }
        }

        // Make sure the stageInvited column exists before any member query runs.
        const bootDroom = async () => {
          await ensureStageInvitedColumn()
          await emitDroomState()
        }
        bootDroom()
        unsubHub = hubSubscribe(`droom:${roomId}`, (event, data) => {
          if (event === 'refresh') { emitDroomState(); return }
          sendSSE(res, event, data)
        })

        // Start the cursor from a short window so a reconnecting client never
        // replays ancient offers/answers (which could tear down a live media
        // connection); fresh joins generate their own new signals anyway.
        let lastDroomSignal = new Date(Date.now() - 30 * 1000)
        const sentDroomSignalIds = new Set<string>()
        signalTimer = setInterval(async () => {
          try {
            const sigs = await db.roomSignal.findMany({
              where: { channel: `droom:${roomId}`, createdAt: { gte: lastDroomSignal } },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            })
            for (const sig of sigs) {
              // `gte` re-fetches the boundary millisecond; skip rows we already
              // sent so same-timestamp signals are never dropped.
              if (sentDroomSignalIds.has(sig.id)) continue
              sentDroomSignalIds.add(sig.id)
              sendSSE(res, 'signal', { id: sig.id, from: sig.from, to: sig.to, data: sig.data })
              if (sig.createdAt > lastDroomSignal) lastDroomSignal = sig.createdAt
            }
            if (sentDroomSignalIds.size > 2000) sentDroomSignalIds.clear()
          } catch { /* ignore */ }
        }, 900)

        pollTimer = setInterval(async () => {
          await maintainDroom()
          const s = await buildDroomState()
          if (s) sendSSE(res, 'droom-state', s)
        }, POLL_INTERVAL)

        heartbeatTimer = setInterval(() => sendHeartbeat(res), HEARTBEAT_INTERVAL)
      }

      // Virtual library (video) WebRTC channel
      if (channel.startsWith('vroom:')) {
        const roomId = channel.slice(6)
        const LIB_INACTIVE_MS = 5 * 60 * 1000
        const MOD_ROTATION_MS = 5 * 60 * 1000

        const buildVroomState = async () => {
          const room = await db.virtualLibrary.findUnique({
            where: { id: roomId },
            include: { members: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' } } },
          })
          if (!room) return null
          return {
            room: {
              id: room.id, name: room.name, present: room.members.length, maxCapacity: room.maxCapacity,
            },
            members: room.members.map(m => ({
              userId: m.studentId, displayName: m.displayName, color: m.color, gender: m.gender,
              role: m.role, onStage: m.onStage, stageRequested: m.stageRequested, stageInvited: m.stageInvited,
              onStageSince: m.onStageSince?.getTime() || null,
              videoOff: m.videoOff,
              micOff: !!m.micOff,
              speaking: !!m.speaking,
              stageApproveVotes: Array.isArray(m.stageApproveVotes) ? (m.stageApproveVotes as string[]) : [],
              removalVotes: Array.isArray(m.removalVotes) ? m.removalVotes as string[] : [],
            })),
          }
        }

        const emitVroomState = async () => {
          const s = await buildVroomState()
          if (s) sendSSE(res, 'vroom-state', s)
        }

        const maintainVroom = async () => {
          if (closed) return
          try {
            const now = Date.now()
            const members = await db.virtualLibraryMember.findMany({ where: { roomId, leftAt: null } })
            const activeCount = members.length
            const needed = Math.ceil((2 / 3) * activeCount)
            let changed = false

            // If no moderator remains, promote the longest-standing member and
            // put them on stage so the room always has a host.
            const mods = members.filter(m => m.role === 'moderator')
            if (mods.length === 0) {
              const candidates = members
                .filter(m => m.role !== 'moderator')
                .sort((a, b) => new Date(a.onStageSince || a.joinedAt).getTime() - new Date(b.onStageSince || b.joinedAt).getTime())
              if (candidates.length > 0) {
                await db.virtualLibraryMember.update({
                  where: { id: candidates[0].id },
                  data: { role: 'moderator', onStage: true, stageRequested: false, stageInvited: false, onStageSince: candidates[0].onStageSince || new Date() },
                })
                changed = true
              }
            }

            for (const m of members) {
              // Add/modify: promote on-stage members to moderator after 5 minutes
              if (m.onStage && m.role !== 'moderator' && m.onStageSince && (now - new Date(m.onStageSince).getTime()) >= MOD_ROTATION_MS) {
                await db.virtualLibraryMember.update({ where: { id: m.id }, data: { role: 'moderator' } })
                changed = true
              }
              // Inactive removal
              const lastActive = new Date(m.lastActiveAt || m.joinedAt).getTime()
              if ((now - lastActive) >= LIB_INACTIVE_MS) {
                await db.virtualLibraryMember.update({ where: { id: m.id }, data: { leftAt: new Date(), onStage: false, stageRequested: false, stageInvited: false } })
                changed = true
                continue
              }
              // 2/3 majority vote to remove (excludes the target's own vote naturally)
              const votes = Array.isArray(m.removalVotes) ? m.removalVotes as string[] : []
              if (votes.length >= needed && activeCount >= 2) {
                await db.virtualLibraryMember.update({ where: { id: m.id }, data: { leftAt: new Date(), onStage: false, stageRequested: false, stageInvited: false } })
                hubPublish(`vroom:${roomId}`, 'user-removed', { userId: m.studentId })
                changed = true
              }
            }
            if (changed) await emitVroomState()
          } catch { /* ignore */ }
        }

        // Make sure the stage columns exist before any member query runs.
        const bootVroom = async () => {
          await ensureVirtualLibraryStageColumns()
          await emitVroomState()
        }
        bootVroom()
        unsubHub = hubSubscribe(`vroom:${roomId}`, (event, data) => {
          if (event === 'refresh') { emitVroomState(); return }
          sendSSE(res, event, data)
        })

        let lastVroomSignal = new Date(Date.now() - 30 * 1000)
        const sentVroomSignalIds = new Set<string>()
        signalTimer = setInterval(async () => {
          try {
            const sigs = await db.roomSignal.findMany({
              where: { channel: `vroom:${roomId}`, createdAt: { gte: lastVroomSignal } },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            })
            for (const sig of sigs) {
              if (sentVroomSignalIds.has(sig.id)) continue
              sentVroomSignalIds.add(sig.id)
              sendSSE(res, 'signal', { id: sig.id, from: sig.from, to: sig.to, data: sig.data })
              if (sig.createdAt > lastVroomSignal) lastVroomSignal = sig.createdAt
            }
            if (sentVroomSignalIds.size > 2000) sentVroomSignalIds.clear()
          } catch { /* ignore */ }
        }, 900)

        pollTimer = setInterval(async () => {
          await maintainVroom()
          const s = await buildVroomState()
          if (s) sendSSE(res, 'vroom-state', s)
        }, POLL_INTERVAL)

        heartbeatTimer = setInterval(() => sendHeartbeat(res), HEARTBEAT_INTERVAL)
      }

      req.signal.addEventListener('abort', () => {
        closed = true
        if (pollTimer) clearInterval(pollTimer)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        if (signalTimer) clearInterval(signalTimer)
        if (unsubHub) unsubHub()
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
