# Структура проекта

- `client/index.html` — DOM и формы.
- `client/ui-shell.js` — разделение интерфейса и клиентская навигация 0.5.0.
- `client/app.js` — клиентское функциональное ядро, криптография, API, сообщения.
- `client/sw.js` — PWA-кэш и обработчик push.
- `server/server.js` — минимальная точка входа.
- `server/application.js` — HTTP/API-приложение.
- `server/storage/store.js` — слой PostgreSQL.
- `database/migrations` — SQL-миграции.
- `Dockerfile` — production-сборка.
- `docs/passport` — официальный контекст проекта.
