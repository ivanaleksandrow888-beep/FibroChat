# FibroChat v0.7.0-alpha2

This alpha introduces Responsive UI 2.0, encrypted replies and encrypted voice messages.

## Highlights
- Mobile composer follows the visible viewport and respects iOS safe areas.
- Reply to any decrypted message and jump back to the original.
- Record, preview, remove, send and play voice messages. Audio uses the existing client-side AES-GCM attachment pipeline.
- Larger touch targets and compact controls for narrow devices.

## Browser requirements
Voice recording requires HTTPS (or localhost), microphone permission, MediaRecorder and getUserMedia support.
