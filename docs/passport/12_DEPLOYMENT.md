# Деплой

1. Распаковать новый релиз в `C:\FibroChat` (резервную копию оставить).
2. В VS Code выполнить `npm install`, затем `npm run check`.
3. `git add .`
4. `git commit -m "FibroChat vX.Y.Z"`
5. `git push origin main`
6. В Coolify выбрать Build Pack Dockerfile, `/Dockerfile`, порт 3000.
7. Redeploy; при изменении Dockerfile/зависимостей — force rebuild without cache.
8. Проверить health, вход, F5, PIN, сообщение и роли.
