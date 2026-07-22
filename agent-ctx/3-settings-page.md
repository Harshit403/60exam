# Task 3: Settings Page with SMTP Configuration

## Summary
Added a "Settings" page to the admin panel with SMTP configuration and migrated the signup approval toggle from the Approvals page.

## Changes Made

### File: `/home/z/my-project/src/components/admin/AdminPanel.tsx`

1. **Imports** - Added `Settings`, `Eye`, `EyeOff` icons from `lucide-react`

2. **PageKey type** - Added `'settings'` to the union type:
   ```
   type PageKey = '...' | 'settings'
   ```

3. **Navigation** - Added a "System" section to `navSections`:
   ```
   { label:'System', items:[
     { key:'settings', label:'Settings', icon:Settings, color:'bg-slate-500/10 text-slate-600' },
   ]}
   ```

4. **renderPage()** - Added case for settings:
   ```
   case 'settings': return <SettingsPage />
   ```

5. **SettingsPage component** - Created new component (before AdminPanel) with:
   - **SMTP Configuration Card**: Dark gradient header (slate-800/900) with Mail icon and status indicator (Configured/Not Configured)
   - SMTP fields: Host, Port (default 587), Username, Password (with show/hide eye toggle), From Email/Name
   - "Save Configuration" button calling `api.adminUpdateSettings()`
   - "Test SMTP Connection" section with test email recipient input and "Send Test Email" button calling `api.adminTestSmtp()`
   - Loading states for save and test operations
   - Toast notifications for success/error feedback
   - **Signup Approval Card**: Migrated from ApprovalsPage with toggle switch and status display

6. **ApprovalsPage** - Removed:
   - Settings fetch (`adminGetSettings`)
   - `approvalEnabled` useMemo
   - `handleToggle` function
   - Approval toggle Card UI
   - Simplified return from `space-y-6` to `space-y-4` (removed wrapper div)

## Verification
- `bun run lint` passed with no errors
- Dev server running successfully
