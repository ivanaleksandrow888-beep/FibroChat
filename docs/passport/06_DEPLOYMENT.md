# Deployment

Coolify application variables: `DATABASE_URL` with the private internal PostgreSQL URL; optional `FIBRO_NODE_ID`, `FIBRO_NODE_REGION`; application port `3000`. Keep PostgreSQL private and do not expose its public port.

Workflow: modify locally → run `npm run check` → commit → push to GitHub → deploy in Coolify.
