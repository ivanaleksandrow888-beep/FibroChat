# Test report — FibroChat v0.7.0-alpha7.7

Проверки выполнены после внесения изменений:

- `npm run check` — успешно.
- `npm run test:regression` — успешно (`Alpha 3–7.7 regression assertions: true`).
- `npm run smoke` — успешно (`Smoke test: true 0.7.0-alpha7.7 json-development-fallback`).
- ZIP проверен командой `zip -T` после сборки.

Проверено статически и регрессионными assertions:

- глобальный API rate limit;
- отдельный anti-spam для публичных invite requests;
- лимит JSON body;
- CSP / Permissions-Policy / защитные HTTP-заголовки;
- `/api/admin/diagnostics`;
- граница полномочий admin → user и super_admin → admin;
- диагностический UI;
- бессрочная подписка super_admin из Alpha 7.6.1.

После production-deploy отдельно проверьте, что панель диагностики показывает PostgreSQL, Push и TURN в соответствии с реальной конфигурацией Coolify.
