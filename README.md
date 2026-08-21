# TenMore Audience Growth Dashboard

An interactive dashboard showing the audience and revenue benefits of starting
newsletter growth early, ahead of TenMore's first clinic opening.

Inputs are saved to each visitor's browser (`localStorage`), so anyone who
opens the page, sets their own numbers, and comes back later will see the
same values — until they change them or hit "Reset to defaults."

## Run it locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `tenmore-dashboard`) and push this folder to it.
2. In `vite.config.js`, set `base` to `/your-repo-name/` (already set to
   `/tenmore-dashboard/` — update it if you name the repo differently).
3. In the repo settings on GitHub: **Settings → Pages → Build and deployment
   → Source → GitHub Actions**.
4. Push to `main`. The included workflow (`.github/workflows/deploy.yml`)
   builds and publishes automatically. Your dashboard will be live at
   `https://your-username.github.io/your-repo-name/`.

No local build step is required after the first push — every push to `main`
redeploys automatically.
