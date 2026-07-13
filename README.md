# FibroChat v0.4.0 — PostgreSQL Core

FibroChat is a managed encrypted messaging network with a single superadministrator, delegated administrators, invitation registration, trusted devices, client-side encrypted messages and PostgreSQL persistence.

## Required environment

- `DATABASE_URL` — internal PostgreSQL connection URL from Coolify.
- `PORT` — optional, defaults to `3000`.
- `FIBRO_NODE_ID` — optional stable node identifier.
- `FIBRO_NODE_REGION` — optional region label.
- `DATABASE_SSL=true` only when the database requires TLS.

## First superadministrator

Register the first and only superadministrator with invite code:

`FIBRO-OWNER-2026`

After that, administrators can create ordinary user invitations. Only the superadministrator can approve users and assign or remove administrators.

## Local start

```bash
npm install
npm start
```

Without `DATABASE_URL`, the application uses a JSON development fallback. Production must use PostgreSQL.
