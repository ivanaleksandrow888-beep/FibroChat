# Test report — FibroChat v0.6.0

Executed in the release workspace:

- `npm install --package-lock-only --ignore-scripts` — passed;
- `npm run check` — passed;
- `npm run smoke` — passed;
- health endpoint reported version `0.6.0` and JSON development fallback.

Prepared but not executed here: live PostgreSQL/Coolify deployment. Migration `005_admin_security.sql` runs automatically at application startup.
