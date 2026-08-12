# Test Report — FibroChat v0.7.0-alpha7.6

## Automated checks

- `npm run check` — PASS
- `npm run test:regression` — PASS
- `npm run smoke` — PASS

Smoke output confirmed application version `0.7.0-alpha7.6` and successful startup with JSON development fallback when `DATABASE_URL` is absent.

## Regression assertions
The regression script verifies earlier Alpha 3–7.5 functionality plus Alpha 7.6 markers for:
- multi-file payload support;
- decrypted attachment preview;
- voice waveform and speed controls;
- progressive older-message rendering;
- realtime typing/recording activity endpoint and event;
- Alpha 7.6 UI styles.

## Manual validation still required after deployment
- multi-file upload against production attachment storage;
- image/video/PDF preview in Chrome Android and Safari iOS;
- drag & drop on desktop browsers;
- typing indicator between two accounts;
- voice playback-rate behavior on mobile Safari;
- large-history interaction on a real account;
- previously deferred two-device WebRTC/TURN test.
