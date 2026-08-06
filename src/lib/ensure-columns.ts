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
