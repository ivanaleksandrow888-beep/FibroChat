# Roles and Flows

## Superadministrator
Exactly one per network. Bootstraps the network, approves users, assigns/removes administrators, restores access, manages subscriptions and network settings.

## Administrator
Can issue invitations, inspect administration views, handle support and suspend ordinary users. Cannot approve users or assign administrators.

## User
Registers with an administrator-issued invitation and waits for superadministrator approval.

First superadministrator bootstrap code: `FIBRO-OWNER-2026`.
