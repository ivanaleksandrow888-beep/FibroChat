# Changelog
## v0.4.7 — Docker-only deployment

- Prepared a clean repository Dockerfile for Coolify.
- Uses Node.js 20 and `npm install --omit=dev`; Nixpacks is no longer required.
- Updated client, server, Service Worker cache, and package versions to v0.4.7.
- Added exact Coolify Dockerfile settings and deployment verification notes.
- Tightened `.dockerignore` so local secrets, archives, caches, and JSON data are not copied into the image.


## 0.4.0 — PostgreSQL Core

- PostgreSQL became the primary persistent store.
- Added automatic SQL migrations.
- Added one-superadministrator database constraint.
- Administrators retain permission to issue invitations.
- Added password change inside the account; other sessions are revoked.
- Added server-side QR device approval challenge API.
- Added cluster node registry and multi-node cache refresh groundwork.
- Replaced the monolithic entry point with a small launcher plus configuration and storage modules.
- Removed production JSON data from version control.

## v0.4.5

- Added a production Dockerfile based on Node.js 20.
- Added `.dockerignore`.
- Replaced Nixpacks dependency installation with a deterministic Docker build.
- Preserved PostgreSQL, PWA, Web Push, PIN, and session fixes from v0.4.4.

## v0.4.4
- Fixed 6-digit PIN setup: no longer attempts to export non-extractable CryptoKey objects.
- Keeps the decrypted identity bundle in sessionStorage so a normal page refresh no longer logs the user out.
- PIN vault now stores the original JWK identity bundle and restores it after browser restart.
- Updated package-lock.json and verified `npm ci` plus syntax checks.
