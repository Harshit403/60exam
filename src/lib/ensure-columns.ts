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
    vlibStageReady = true
  } catch { /* table may not exist yet; the rest of the flow will surface it */ }
}
