# Обновление FibroChat до Alpha 7.5

```powershell
cd D:\Projects\FibroChat
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm install
npm run check
npm run test:regression
npm run smoke
npm start
```

После проверки:

```powershell
git add .
git commit -m "FibroChat Alpha 7.5 Smart Invitations"
git push
```

В Coolify выполните Redeploy, желательно без кэша. После деплоя очистите кэш сайта или сделайте жёсткое обновление страницы.
