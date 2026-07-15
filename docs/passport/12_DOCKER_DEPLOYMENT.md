# Docker deployment — v0.4.5

FibroChat v0.4.5 deploys through the repository Dockerfile instead of Nixpacks.

## Coolify settings

1. Open the FibroChat application.
2. In Configuration → General set **Build Pack** to **Dockerfile**.
3. Dockerfile location: `/Dockerfile`.
4. Port: `3000`.
5. Keep the existing `DATABASE_URL` environment variable unchanged.
6. Remove the custom Install Command previously added for Nixpacks; Dockerfile handles dependencies.
7. Save and run Redeploy.

PostgreSQL is a separate Coolify resource. Redeploying the application does not erase users, sessions, messages, invites, or push subscriptions.
