# API

Основные группы маршрутов:
- `/api/health`, `/api/protocol`, `/api/network/*`;
- `/api/register`, `/api/login`, `/api/session/refresh`, `/api/logout`;
- `/api/me`, `/api/account/password`;
- `/api/devices/*`;
- `/api/messages`, `/api/contacts`, `/api/events`;
- `/api/notifications`, `/api/support`;
- `/api/push/*`;
- `/api/admin/*`.

Точный перечень необходимо сверять с `server/application.js`; этот файл является источником истины для маршрутов.
