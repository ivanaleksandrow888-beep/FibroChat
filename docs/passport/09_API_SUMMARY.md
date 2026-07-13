# API Summary

Existing API remains compatible. New endpoints in v0.4.0:

- `POST /api/account/password` — change the authenticated user's password.
- `GET /api/device-approvals/status?token=...` — check a pending QR approval.
- `POST /api/device-approvals/confirm` — approve a QR challenge from a trusted authenticated device.

Health endpoint reports database mode and cluster readiness.
