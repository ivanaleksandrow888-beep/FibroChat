# Docker deployment — v0.4.7

FibroChat v0.4.7 is intended to be built by Coolify directly from the repository `Dockerfile`.

## Required Coolify settings

- Build Pack: `Dockerfile`
- Dockerfile location: `/Dockerfile`
- Base Directory: `/`
- Port Exposes: `3000`
- Install Command: empty
- Build Command: empty
- Start Command: empty
- `DATABASE_URL`: keep the existing PostgreSQL internal URL

After changing the Build Pack, click **Save** and then **Redeploy**. A correct deployment log starts with loading the repository Dockerfile and must not contain `Generating nixpacks configuration`.

The PostgreSQL resource and its persistent volume are separate from the application container. Rebuilding the FibroChat image does not delete users or messages.
