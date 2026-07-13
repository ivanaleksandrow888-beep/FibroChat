# Security

Passwords use Node.js scrypt with per-user random salt. Password change requires the current password and revokes other sessions. Refresh tokens are stored as SHA-256 hashes. Private conversation keys stay in the browser and can be moved with encrypted Key Vault files.

Important limitations: the project has not undergone an independent security audit; current E2EE is not a ratcheting protocol and does not yet provide Signal-style forward secrecy; the Coolify panel must receive HTTPS and access restrictions.
