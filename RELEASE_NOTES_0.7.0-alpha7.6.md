# FibroChat v0.7.0-alpha7.6 — Messenger Experience

Alpha 7.6 focuses on everyday chat usability while preserving the existing security, invitation, onboarding and calling architecture.

## Added
- Date separators inside conversations: Today, Yesterday and calendar dates.
- Progressive message rendering: the latest 150 messages are rendered first; older history can be expanded in batches.
- Search now indexes decrypted text, attachment names, sender names in groups and localized message dates.
- Realtime activity indicators for direct chats: “Typing…” and “Recording voice…”.
- Multi-file attachments: up to 6 files in one message, with the existing 10 MB per-file limit.
- Drag & drop attachments on desktop.
- Encrypted inline preview after decryption for images, videos and PDF documents.
- Full-screen attachment viewer.
- Voice-message waveform presentation and playback speed 1× / 1.5× / 2×.
- Refined chat animations, sticky date chips and attachment/voice layouts.

## Compatibility
- Existing single attachments remain readable.
- Existing voice messages remain readable.
- Existing text-message encryption format remains compatible.
- No database migration is required for this release.
- Calls, TURN, QR invitations and onboarding from Alpha 7.5 are retained.

## Important
WebRTC/TURN call behavior still requires the previously planned two-device production test. Alpha 7.6 does not claim that external-network calling has been validated on real devices.
