# VS Code commands — FibroChat v0.7.0-alpha7.6

Run from the project root:

```powershell
npm install
npm run check
npm run test:regression
npm run smoke
git status
git add .
git commit -m "FibroChat v0.7.0-alpha7.6 Messenger Experience"
git push origin main
```

Then redeploy the Git revision in Coolify. A cache-free rebuild is recommended when available. After deployment, refresh the installed PWA/browser page so the new Service Worker cache `fibrochat-shell-v0.7.0-alpha7.6` takes control.
