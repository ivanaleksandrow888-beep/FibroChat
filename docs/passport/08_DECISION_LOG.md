# Decision Log

- One superadministrator per network.
- Administrators may create invitations.
- Only the superadministrator approves users and assigns administrators.
- PostgreSQL is the production source of truth.
- Private message content remains encrypted client-side.
- New-device approval uses short-lived one-time QR challenges; QR contains no password or private key.
- Infrastructure must remain provider-independent and later support multiple VPS providers.
- Every major release includes an updated project passport.
