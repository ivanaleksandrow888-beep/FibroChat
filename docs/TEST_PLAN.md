# Test Plan v0.3.0

1. `npm run check` завершается без ошибок.
2. `GET /api/health` возвращает `version: 0.3.0`, `protocolVersion: 1.1`.
3. `GET /api/protocol` возвращает capability list.
4. Ответы содержат `X-Trace-Id` и `_protocol.traceId`.
5. Запрос с `X-Fibro-Protocol: 2.0` получает HTTP 426 и `PROTO_INCOMPATIBLE`.
6. Два клиента v0.3.0 входят, переписываются и получают realtime-события.
7. Аккаунты, ключи и сообщения v0.2.0 не теряются.
