// MISSION CS Real-time Service
// Port: 3003
// Features:
//   - Live discussion room (per-discussion channels)
//   - Live notifications (achievements unlocked, quiz passed, admin replies)
//   - Online users counter per room
//   - Live typing indicators
//   - Group Study rooms (join/leave, timer sync, chat, typing)

import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Types ─────────────────────────────────────────────────────────────
interface OnlineUser {
  id: string
  socketId: string
  name: string
  role: 'student' | 'admin'
  joinedAt: number
}

interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  userRole: 'student' | 'admin'
  content: string
  timestamp: number
  type: 'message' | 'system' | 'admin-reply'
}

interface TimerState {
  running: boolean
  paused: boolean
  remaining: number
  total: number
  chapterName?: string
}

interface GroupMember {
  socketId: string
  name: string
  timerState: TimerState | null
}

interface GroupChatMessage {
  id: string
  groupId: string
  userId: string
  userName: string
  content: string
  type: 'message' | 'system'
  timestamp: number
}

// ─── State ─────────────────────────────────────────────────────────────
const onlineUsers = new Map<string, OnlineUser>() // socketId -> user
const roomUsers = new Map<string, Set<string>>() // roomId -> Set of socketIds
const messageHistory = new Map<string, ChatMessage[]>() // roomId -> last 50 messages

// Group Study state
const groupMembers = new Map<string, Map<string, GroupMember>>() // groupId -> Map of userId -> GroupMember
const groupMessageHistory = new Map<string, GroupChatMessage[]>() // groupId -> last 100 messages
const socketGroups = new Map<string, Set<string>>() // socketId -> Set of groupIds the socket has joined

const MAX_HISTORY = 50
const GROUP_MAX_HISTORY = 100
const generateId = () => Math.random().toString(36).substring(2, 11)

// ─── Content Filter ───────────────────────────────────────────────────
const BLOCKED_TERMS = ['instagram', 'telegram', 'whatsapp', 'facebook', 'twitter', 'tiktok', 'snapchat', 'discord', 'youtube']

function filterContent(text: string): string {
  let filtered = text
  BLOCKED_TERMS.forEach(term => {
    const regex = new RegExp(term, 'gi')
    filtered = filtered.replace(regex, '***')
  })
  return filtered
}

function getRoomUsers(roomId: string): OnlineUser[] {
  const socketIds = roomUsers.get(roomId)
  if (!socketIds) return []
  return Array.from(socketIds)
    .map(sid => onlineUsers.get(sid))
    .filter((u): u is OnlineUser => !!u)
}

function addToHistory(roomId: string, msg: ChatMessage) {
  if (!messageHistory.has(roomId)) messageHistory.set(roomId, [])
  const hist = messageHistory.get(roomId)!
  hist.push(msg)
  if (hist.length > MAX_HISTORY) hist.shift()
}

// ─── Group Study Helpers ───────────────────────────────────────────────
function broadcastGroupMembers(groupId: string) {
  const members = groupMembers.get(groupId)
  if (!members) {
    io.to(`group-${groupId}`).emit('group-members', { groupId, members: [] })
    return
  }
  const memberList = Array.from(members.entries()).map(([userId, m]) => ({
    userId,
    name: m.name,
    timerState: m.timerState,
  }))
  io.to(`group-${groupId}`).emit('group-members', { groupId, members: memberList })
}

function addGroupMessage(groupId: string, msg: GroupChatMessage) {
  if (!groupMessageHistory.has(groupId)) groupMessageHistory.set(groupId, [])
  const hist = groupMessageHistory.get(groupId)!
  hist.push(msg)
  if (hist.length > GROUP_MAX_HISTORY) hist.shift()
}

// ─── Connection Handler ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] New connection: ${socket.id}`)

  // ─── Authenticate & set up user ────────────────────────────────────
  socket.on('auth', (data: { userId: string; name: string; role: 'student' | 'admin' }) => {
    const user: OnlineUser = {
      id: data.userId,
      socketId: socket.id,
      name: data.name,
      role: data.role,
      joinedAt: Date.now(),
    }
    onlineUsers.set(socket.id, user)
    socket.emit('auth-ok', { user })
    console.log(`[WS] User authenticated: ${user.name} (${user.role})`)
  })

  // ─── Join discussion room ─────────────────────────────────────────
  socket.on('join-room', (data: { roomId: string }) => {
    const user = onlineUsers.get(socket.id)
    if (!user) return

    const { roomId } = data
    socket.join(roomId)

    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Set())
    roomUsers.get(roomId)!.add(socket.id)

    // Send history to the joining user
    const history = messageHistory.get(roomId) || []
    socket.emit('room-history', { roomId, messages: history })

    // Notify others in the room
    const sysMsg: ChatMessage = {
      id: generateId(),
      roomId,
      userId: 'system',
      userName: 'System',
      userRole: 'admin',
      content: `${user.name} joined the discussion`,
      timestamp: Date.now(),
      type: 'system',
    }
    socket.to(roomId).emit('user-joined', { user, message: sysMsg })

    // Broadcast updated user list to all in the room
    io.to(roomId).emit('room-users', {
      roomId,
      users: getRoomUsers(roomId).map(u => ({ id: u.id, name: u.name, role: u.role })),
    })

    console.log(`[WS] ${user.name} joined room ${roomId} (${getRoomUsers(roomId).length} online)`)
  })

  // ─── Leave room ───────────────────────────────────────────────────
  socket.on('leave-room', (data: { roomId: string }) => {
    const user = onlineUsers.get(socket.id)
    if (!user) return
    const { roomId } = data
    socket.leave(roomId)
    roomUsers.get(roomId)?.delete(socket.id)

    const sysMsg: ChatMessage = {
      id: generateId(),
      roomId,
      userId: 'system',
      userName: 'System',
      userRole: 'admin',
      content: `${user.name} left the discussion`,
      timestamp: Date.now(),
      type: 'system',
    }
    socket.to(roomId).emit('user-left', { user, message: sysMsg })
    io.to(roomId).emit('room-users', {
      roomId,
      users: getRoomUsers(roomId).map(u => ({ id: u.id, name: u.name, role: u.role })),
    })
  })

  // ─── Send chat message ────────────────────────────────────────────
  socket.on('send-message', (data: { roomId: string; content: string }) => {
    const user = onlineUsers.get(socket.id)
    if (!user || !data.content?.trim()) return

    const msg: ChatMessage = {
      id: generateId(),
      roomId: data.roomId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      content: data.content.trim(),
      timestamp: Date.now(),
      type: user.role === 'admin' ? 'admin-reply' : 'message',
    }
    addToHistory(data.roomId, msg)
    io.to(data.roomId).emit('new-message', msg)
    console.log(`[WS] Message in ${data.roomId} from ${user.name}: ${data.content.substring(0, 50)}`)
  })

  // ─── Typing indicator ─────────────────────────────────────────────
  let typingTimeout: any = null
  socket.on('typing', (data: { roomId: string; isTyping: boolean }) => {
    const user = onlineUsers.get(socket.id)
    if (!user) return
    socket.to(data.roomId).emit('user-typing', {
      roomId: data.roomId,
      user: { id: user.id, name: user.name, role: user.role },
      isTyping: data.isTyping,
    })

    // Auto-clear typing after 3s
    if (typingTimeout) clearTimeout(typingTimeout)
    if (data.isTyping) {
      typingTimeout = setTimeout(() => {
        socket.to(data.roomId).emit('user-typing', {
          roomId: data.roomId,
          user: { id: user.id, name: user.name, role: user.role },
          isTyping: false,
        })
      }, 3000)
    }
  })

  // ─── Notification broadcast (admin → student or student → admin) ──
  socket.on('send-notification', (data: {
    targetUserId?: string
    targetRole?: 'student' | 'admin'
    type: 'achievement' | 'quiz-passed' | 'admin-reply' | 'approval' | 'review' | 'discussion-reply'
    title: string
    message: string
    metadata?: any
  }) => {
    const user = onlineUsers.get(socket.id)
    if (!user) return

    const notification = {
      id: generateId(),
      ...data,
      fromUser: { id: user.id, name: user.name, role: user.role },
      timestamp: Date.now(),
    }

    if (data.targetUserId) {
      // Send to specific user (find their socket)
      for (const [sid, u] of onlineUsers.entries()) {
        if (u.id === data.targetUserId) {
          io.to(sid).emit('notification', notification)
        }
      }
    } else if (data.targetRole) {
      // Broadcast to all users with the target role
      for (const [sid, u] of onlineUsers.entries()) {
        if (u.role === data.targetRole) {
          io.to(sid).emit('notification', notification)
        }
      }
    }
    console.log(`[WS] Notification: ${data.title} → ${data.targetUserId || data.targetRole}`)
  })

  // ─── Admin push notification broadcast ───────────────────────────
  socket.on('admin-notification', (data: {
    id: string
    title: string
    message: string
    type: string
    targetRole: string
    targetCourseId?: string | null
  }) => {
    const user = onlineUsers.get(socket.id)
    if (!user || user.role !== 'admin') return

    const notification = {
      id: data.id,
      type: 'admin-notification',
      title: data.title,
      message: data.message,
      timestamp: Date.now(),
    }

    if (data.targetRole === 'all') {
      // Broadcast to all connected students
      for (const [sid, u] of onlineUsers.entries()) {
        if (u.role === 'student') {
          io.to(sid).emit('admin-notification', notification)
        }
      }
      console.log(`[WS] Admin push: "${data.title}" broadcast to all students`)
    } else if (data.targetCourseId) {
      // Broadcast with course targeting metadata - client filters by enrolled course
      for (const [sid, u] of onlineUsers.entries()) {
        if (u.role === 'student') {
          io.to(sid).emit('admin-notification', notification)
        }
      }
      console.log(`[WS] Admin push: "${data.title}" broadcast to students (course-filtered)`)
    }
  })

  // ─── Live online count ────────────────────────────────────────────
  socket.on('get-online-count', () => {
    socket.emit('online-count', { count: onlineUsers.size })
  })

  // ─── Group Study: Join group room ──────────────────────────────────
  socket.on('group-join', (data: { groupId: string; userId: string; userName: string }) => {
    const { groupId, userId, userName } = data
    const socketRoom = `group-${groupId}`
    socket.join(socketRoom)

    // Track socket -> groups mapping
    if (!socketGroups.has(socket.id)) socketGroups.set(socket.id, new Set())
    socketGroups.get(socket.id)!.add(groupId)

    // Track group members
    if (!groupMembers.has(groupId)) groupMembers.set(groupId, new Map())
    groupMembers.get(groupId)!.set(userId, {
      socketId: socket.id,
      name: userName,
      timerState: null,
    })

    // Send message history to the joining user
    const history = groupMessageHistory.get(groupId) || []
    socket.emit('group-history', { groupId, messages: history })

    // System message about join
    const sysMsg: GroupChatMessage = {
      id: generateId(),
      groupId,
      userId: 'system',
      userName: 'System',
      content: `${userName} joined the study group`,
      type: 'system',
      timestamp: Date.now(),
    }
    addGroupMessage(groupId, sysMsg)
    socket.to(socketRoom).emit('group-chat-message', sysMsg)

    // Broadcast updated member list
    broadcastGroupMembers(groupId)

    console.log(`[WS] Group: ${userName} joined group ${groupId} (${groupMembers.get(groupId)!.size} members)`)
  })

  // ─── Group Study: Leave group room ─────────────────────────────────
  socket.on('group-leave', (data: { groupId: string; userId: string }) => {
    const { groupId, userId } = data
    const socketRoom = `group-${groupId}`
    const members = groupMembers.get(groupId)
    const member = members?.get(userId)

    socket.leave(socketRoom)

    // Remove from socket -> groups mapping
    socketGroups.get(socket.id)?.delete(groupId)

    // Remove from group members
    if (members && member) {
      const userName = member.name
      members.delete(userId)

      // System message about leave
      const sysMsg: GroupChatMessage = {
        id: generateId(),
        groupId,
        userId: 'system',
        userName: 'System',
        content: `${userName} left the study group`,
        type: 'system',
        timestamp: Date.now(),
      }
      addGroupMessage(groupId, sysMsg)
      io.to(socketRoom).emit('group-chat-message', sysMsg)

      // Broadcast updated member list
      broadcastGroupMembers(groupId)

      console.log(`[WS] Group: ${userName} left group ${groupId} (${members.size} members)`)
    }
  })

  // ─── Group Study: Timer update ─────────────────────────────────────
  socket.on('group-timer-update', (data: { groupId: string; userId: string; userName: string; timerState: TimerState }) => {
    const { groupId, userId, userName, timerState } = data
    const members = groupMembers.get(groupId)
    if (!members) return

    const member = members.get(userId)
    if (!member) return

    // Update timer state
    member.timerState = timerState
    members.set(userId, member)

    // Broadcast timer update to everyone in the group
    io.to(`group-${groupId}`).emit('group-timer-update', {
      groupId,
      userId,
      userName,
      timerState,
    })
  })

  // ─── Group Study: Chat message ─────────────────────────────────────
  socket.on('group-chat-message', (data: { groupId: string; userId: string; userName: string; content: string; type: string }) => {
    const { groupId, userId, userName, content, type } = data
    if (!content?.trim()) return

    // Apply content filter
    const filteredContent = filterContent(content.trim())

    const msg: GroupChatMessage = {
      id: generateId(),
      groupId,
      userId,
      userName,
      content: filteredContent,
      type: (type === 'system' ? 'system' : 'message'),
      timestamp: Date.now(),
    }
    addGroupMessage(groupId, msg)
    io.to(`group-${groupId}`).emit('group-chat-message', msg)

    console.log(`[WS] Group chat in ${groupId} from ${userName}: ${filteredContent.substring(0, 50)}`)
  })

  // ─── Group Study: Typing indicator ─────────────────────────────────
  let groupTypingTimeout: any = null
  socket.on('group-typing', (data: { groupId: string; userId: string; userName: string; isTyping: boolean }) => {
    const { groupId, userId, userName, isTyping } = data
    socket.to(`group-${groupId}`).emit('group-typing', {
      groupId,
      userId,
      userName,
      isTyping,
    })

    // Auto-clear typing after 3s
    if (groupTypingTimeout) clearTimeout(groupTypingTimeout)
    if (isTyping) {
      groupTypingTimeout = setTimeout(() => {
        socket.to(`group-${groupId}`).emit('group-typing', {
          groupId,
          userId,
          userName,
          isTyping: false,
        })
      }, 3000)
    }
  })

  // ─── Group Study: Comparison request ──────────────────────────────
  socket.on('group-comparison-request', (data: { groupId: string; requesterId: string; requesterName: string }) => {
    const { groupId, requesterId, requesterName } = data
    // Broadcast to all OTHER members in the group room
    socket.to(`group-${groupId}`).emit('group-comparison-requested', {
      groupId,
      requesterId,
      requesterName,
    })
    console.log(`[WS] Comparison request from ${requesterName} in group ${groupId}`)
  })

  // ─── Group Study: Comparison response ─────────────────────────────
  socket.on('group-comparison-response', (data: { groupId: string; userId: string; userName: string; accepted: boolean }) => {
    const { groupId, userId, userName, accepted } = data
    const event = accepted ? 'group-comparison-accepted' : 'group-comparison-declined'
    io.to(`group-${groupId}`).emit(event, {
      groupId,
      userId,
      userName,
    })
    console.log(`[WS] Comparison ${accepted ? 'accepted' : 'declined'} by ${userName} in group ${groupId}`)
  })

  // ─── Disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id)

    // Clean up discussion rooms
    if (user) {
      for (const [roomId, socketSet] of roomUsers.entries()) {
        if (socketSet.has(socket.id)) {
          socketSet.delete(socket.id)
          const sysMsg: ChatMessage = {
            id: generateId(),
            roomId,
            userId: 'system',
            userName: 'System',
            userRole: 'admin',
            content: `${user.name} went offline`,
            timestamp: Date.now(),
            type: 'system',
          }
          socket.to(roomId).emit('user-left', { user, message: sysMsg })
          io.to(roomId).emit('room-users', {
            roomId,
            users: getRoomUsers(roomId).map(u => ({ id: u.id, name: u.name, role: u.role })),
          })
        }
      }
      onlineUsers.delete(socket.id)
      console.log(`[WS] User disconnected: ${user.name}`)
    }

    // Clean up group study rooms
    const groups = socketGroups.get(socket.id)
    if (groups) {
      for (const groupId of groups) {
        const members = groupMembers.get(groupId)
        if (members) {
          // Find the member by socketId and remove them
          for (const [userId, member] of members.entries()) {
            if (member.socketId === socket.id) {
              const userName = member.name
              members.delete(userId)

              // System message about disconnect
              const sysMsg: GroupChatMessage = {
                id: generateId(),
                groupId,
                userId: 'system',
                userName: 'System',
                content: `${userName} went offline`,
                type: 'system',
                timestamp: Date.now(),
              }
              addGroupMessage(groupId, sysMsg)
              io.to(`group-${groupId}`).emit('group-chat-message', sysMsg)

              // Broadcast updated member list
              broadcastGroupMembers(groupId)

              console.log(`[WS] Group: ${userName} disconnected from group ${groupId}`)
              break
            }
          }
        }
      }
      socketGroups.delete(socket.id)
    }
  })

  socket.on('error', (error) => {
    console.error(`[WS] Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[WS] MISSION CS Real-time service running on port ${PORT}`)
})

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[WS] Received ${signal}, shutting down...`)
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
