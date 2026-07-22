# Task 6a - Group Study + Security API Routes

## Summary
Created all Group Study and Security API routes for the MISSION CS TEST SERIES project.

## Files Created/Modified

### New Files
1. `src/lib/content-filter.ts` - Content filter utility blocking 9 social media platforms
2. `src/app/api/admin/groups/route.ts` - GET (list groups), POST (create group)
3. `src/app/api/admin/groups/[id]/route.ts` - PUT (update group), DELETE (delete group)
4. `src/app/api/admin/groups/[id]/block/route.ts` - POST (block student), DELETE (unblock student)
5. `src/app/api/admin/blocked-users/route.ts` - GET (list blocked users)
6. `src/app/api/student/groups/route.ts` - GET (list available groups for student)
7. `src/app/api/student/groups/[id]/route.ts` - POST (join group), DELETE (leave group)
8. `src/app/api/student/groups/[id]/messages/route.ts` - GET (messages), POST (send message with content filter)
9. `src/app/api/ip-log/route.ts` - POST (log visitor IP)
10. `src/app/api/admin/quiz/[id]/chapters/route.ts` - GET (linked chapters), PUT (set linked chapters)

### Modified Files
1. `src/lib/auth.ts` - Added `verifyAuth(request)` helper function
2. `src/app/api/student/quiz/route.ts` - Updated GET to include chapter-based unlock logic (isLocked, lockedChapters)
3. `worklog.md` - Appended task completion log

## Key Features
- All admin routes use `verifyAuth(request)` with role check
- Student routes validate auth and extract studentId from token
- Group join validates: not blocked, not already member, not in another group, capacity check
- Content filter applied on message POST before saving to DB
- IP logging extracts from x-forwarded-for / x-real-ip headers
- Quiz unlock system checks ChapterCompletion for all linked chapters
- All routes use `request` param (Next.js 16), `Response.json()`, try/catch with proper error responses
