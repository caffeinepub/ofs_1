# OFS

## Current State
The Scanner tab has two modes: "Scan" (camera-based QR scanning) and "My Code" (generate QR for others to scan). In My Code mode, a QR code is generated with an `ofs:file:filename:size:deviceId` code. Receivers must scan the QR code with a camera to initiate the transfer.

## Requested Changes (Diff)

### Add
- In the **Scan** mode, add a collapsible "Enter Code Manually" section below the camera view. Contains a text input where the receiver types the OFS code (e.g. `ofs:file:photo.jpg:2.3 MB:OFS-Device-4521`) and a "Receive" button to trigger the same transfer flow as a QR scan.
- In the **My Code** mode (QR step), display the full OFS code as a copyable text string below the QR image, so the sender can share it via chat/text when QR scanning isn't possible.

### Modify
- `ScanMode`: Add manual code entry UI that parses the typed OFS code and triggers the existing `incomingTransfer` + accept/decline flow.

### Remove
- Nothing removed.

## Implementation Plan
1. In `ScanMode`, add a toggle button "Enter Code Manually" that expands a text input + submit button.
2. On submit, run the typed value through `parseOFSData()`. If valid, set `incomingTransfer` state and show the accept/decline card.
3. In `MyCodeMode` QR step, display the `ofsCode` string with a copy button below the QR image.
