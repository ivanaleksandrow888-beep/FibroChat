# Upgrade 0.5.2 → 0.6.0

1. Replace project files while preserving production environment variables and persistent database volume.
2. Run `npm install`, `npm run check`, `npm run smoke`.
3. Commit and push to `main`.
4. In Coolify use Force Rebuild & Redeploy.
5. Verify admin search, temporary suspension, session revocation, security activity and invite revocation.

PostgreSQL migrations run automatically at application startup.
