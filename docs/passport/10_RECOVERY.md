# Recovery

The source ZIP alone does not contain production database records or browser private keys. Back up PostgreSQL separately through Coolify and keep Key Vault exports for user keys. To restore: create PostgreSQL, set `DATABASE_URL`, deploy source, restore database backup, then verify `/api/health`.
