# Architecture

Client → HTTPS/WSS/SSE reverse proxy → FibroChat Node.js Head Node → private PostgreSQL.

`server/server.js` is a launcher. `server/application.js` owns current HTTP/API compatibility. `server/storage/store.js` owns persistence, migrations, cache refresh and node registration. Future releases should split API domains further without changing public endpoints.

Messages remain client-side encrypted. PostgreSQL stores encrypted envelopes and metadata, not plaintext private messages.
