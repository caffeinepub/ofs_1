# OFS

## Current State
- App has 4 tabs: Home, Scanner, Devices, History
- ProfileTab.tsx exists but is not accessible from the bottom nav
- ProfileTab stores user display name in localStorage under `ofs_display_name`
- History tab shows transfer history but no dedicated Received section
- Devices tab scans for Bluetooth devices; tapping a device opens a Send dialog

## Requested Changes (Diff)

### Add
- **Received Files Section**: In the History tab, add a clearly labeled "Received" section at the top showing only received files, each with a Download button and a Delete button
- **Personal Tab**: Add a 5th bottom-nav tab labeled "Personal" (User icon). Reuse/repurpose ProfileTab.tsx for this. The tab lets users save their display name in localStorage
- **My Device card in Devices tab**: In the Devices tab (Nearby sub-tab), show a glowing "My Device" card at the top displaying the user's saved name (from `ofs_display_name`). When tapped, it shows a slide-up menu or dialog with a "Transfer File" option (triggers the existing upload/send flow)

### Modify
- App.tsx: Add "personal" as a 5th tab using the User icon; wire it to ProfileTab
- HistoryTab.tsx: Add a "Received Files" section at the top filtering entries where type === 'received' or direction === 'received', each row has Download and Delete buttons
- DevicesTab.tsx: Read `ofs_display_name` from localStorage and show a "My Device" card above the device list; tapping it opens a dialog/menu with "Transfer File" button that triggers the file send/upload flow

### Remove
- Nothing removed

## Implementation Plan
1. App.tsx: Import User icon and ProfileTab; add `personal` to Tab type and TABS array with User icon
2. HistoryTab.tsx: Add received files section at top; filter entries by direction/type 'received'; add download (anchor download) and delete (remove from state) buttons per row
3. DevicesTab.tsx: Read name from localStorage; render "My Device" card with user's name and a Bluetooth badge; tapping shows a small bottom sheet with "Transfer File" button that opens the existing UploadDialog or triggers file input
4. ProfileTab.tsx: Ensure it is self-contained and works as the Personal tab (rename section header to "Personal" if needed)
