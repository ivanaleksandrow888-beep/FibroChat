# Changelog

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
