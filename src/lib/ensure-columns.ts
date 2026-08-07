import { db } from '@/lib/db'

// DiscussionRoomMember gained a `stageInvited` column after the app was first
// deployed. Migrations are not reliably run on the live DB, so lazily add the
// column on first use (idempotent). Run this before any query on the member
// table from a route that touches stage invitations.
let stageInvitedReady = false

export async function ensureStageInvitedColumn() {
  if (stageInvitedReady) return
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "DiscussionRoomMember" ADD COLUMN IF NOT EXISTS "stageInvited" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "DiscussionRoomMember" ADD COLUMN IF NOT EXISTS "micOff" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "DiscussionRoomMember" ADD COLUMN IF NOT EXISTS "speaking" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "DiscussionRoomMember" ADD COLUMN IF NOT EXISTS "stageApproveVotes" JSONB NOT NULL DEFAULT '[]'::jsonb`,
    )
    stageInvitedReady = true
  } catch { /* table may not exist yet; the rest of the flow will surface it */ }
}

// VirtualLibraryMember gained stage-management columns (role, stageRequested,
// stageInvited, onStageSince) after the app was first deployed. Add them lazily
// and idempotently so the video room stage system works without a migration.
let vlibStageReady = false

export async function ensureVirtualLibraryStageColumns() {
  if (vlibStageReady) return
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'audience'`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "stageRequested" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "stageInvited" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "onStageSince" TIMESTAMP(3)`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "videoOff" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "micOff" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "speaking" BOOLEAN NOT NULL DEFAULT false`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "stageApproveVotes" JSONB NOT NULL DEFAULT '[]'::jsonb`,
    )
    vlibStageReady = true
  } catch { /* table may not exist yet; the rest of the flow will surface it */ }
}

// StudyMaterial gained a `sharedById` column so students can publish their own
// notes to the shared materials page. Add it lazily and idempotently.
let studyMaterialSharedReady = false

export async function ensureStudyMaterialSharedColumn() {
  if (studyMaterialSharedReady) return
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "StudyMaterial" ADD COLUMN IF NOT EXISTS "sharedById" TEXT`,
    )
    studyMaterialSharedReady = true
  } catch { /* table may not exist yet; the rest of the flow will surface it */ }
}

// StudySession gained server-authoritative "lecture mode" columns (mode,
// plannedMin, startedAt) so the Pomodoro timer can run on the server and its
// elapsed study time is stored in the DB even if the tab is in the background.
let studySessionLectureReady = false

export async function ensureStudySessionLectureColumns() {
  if (studySessionLectureReady) return
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "StudySession" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'client'`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "StudySession" ADD COLUMN IF NOT EXISTS "plannedMin" INTEGER`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "StudySession" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3)`,
    )
    studySessionLectureReady = true
  } catch { /* table may not exist yet; the rest of the flow will surface it */ }
}

// DiscussionRoomMember / VirtualLibraryMember gained an `ipAddress` column so
// room activity logs can attribute a connect IP even for auto-leave events
// (inactivity timeout) that happen without a network request.
let roomMemberIpReady = false

export async function ensureRoomMemberIpColumn() {
  if (roomMemberIpReady) return
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "DiscussionRoomMember" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT`,
    )
    await db.$executeRawUnsafe(
      `ALTER TABLE "VirtualLibraryMember" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT`,
    )
    roomMemberIpReady = true
  } catch { /* table may not exist yet; the rest of the flow will surface it */ }
}

// Append-only RoomActivityLog table created lazily (CREATE TABLE IF NOT EXISTS)
// so the admin join/leave history works on the live DB without a migration.
let roomActivityReady = false

export async function ensureRoomActivityTable() {
  if (roomActivityReady) return
  try {
    await db.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "RoomActivityLog" (
        "id" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "roomId" TEXT NOT NULL,
        "roomName" TEXT NOT NULL,
        "studentId" TEXT,
        "displayName" TEXT NOT NULL,
        "color" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "ipAddress" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RoomActivityLog_pkey" PRIMARY KEY ("id")
      )`,
    )
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "RoomActivityLog_kind_roomId_createdAt_idx" ON "RoomActivityLog" ("kind", "roomId", "createdAt")`,
    )
    roomActivityReady = true
  } catch { /* DB may be down; the rest of the flow will surface it */ }
}

// Log a join/leave event in a discussion/video room. Safe to call anywhere; the
// table is ensured lazily so no route has to remember to bootstrap it.
export async function logRoomActivity(data: {
  kind: 'discussion' | 'library'
  roomId: string
  roomName: string
  studentId: string
  displayName: string
  color: string
  action: 'join' | 'leave'
  ipAddress?: string | null
}) {
  try {
    await ensureRoomActivityTable()
    await db.roomActivityLog.create({ data })
  } catch { /* best-effort: never block the room flow on logging */ }
}
