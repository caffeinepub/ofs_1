# OFS

## Current State
App has four bottom tabs: Home, Files, Devices, History. The Files tab shows a file explorer.

## Requested Changes (Diff)

### Add
- New ScannerTab: QR scanner with two modes: Scan (camera) and My Code (show own QR code for others to scan).
- Scanning a valid QR triggers a simulated receive flow with accept/decline and animated progress.

### Modify
- App.tsx: Replace files tab with scanner tab (QrCode icon).

### Remove
- Files tab from bottom navigation.

## Implementation Plan
1. Create ScannerTab.tsx using useQRScanner hook.
2. Update App.tsx to swap files tab for scanner tab.
