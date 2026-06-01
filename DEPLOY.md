# Publish Quantum Route Online

Your app is a **single service**: FastAPI serves the API and the built React UI. Use **GitHub** for code and **Render** (free) for a live demo URL.

## Step 1 — Push code to GitHub

Repo: `https://github.com/Pradeep007-pixel/Quantum-Route-Optimization`

```powershell
cd c:\Users\Dell\Desktop\quantum_route_project
git add .
git commit -m "Add deployment config for online hosting"
git push origin main
```

If the repo is new or empty on GitHub, create it first (same name), then:

```powershell
git remote add origin https://github.com/Pradeep007-pixel/Quantum-Route-Optimization.git
git branch -M main
git push -u origin main
```

## Step 2 — Deploy live demo (Render, free)

1. Sign in at [render.com](https://render.com) (GitHub login is easiest).
2. **New** → **Blueprint**.
3. Connect **Pradeep007-pixel/Quantum-Route-Optimization** and approve access.
4. Render reads `render.yaml` automatically. Click **Apply**.
5. Wait for the build (~5–10 min first time: `npm ci`, `npm run build`, `pip install`).
6. Open your live URL: `https://quantum-route-pyce.onrender.com`.

**Note:** Free tier sleeps after ~15 minutes idle; the first request may take 30–60 seconds to wake up.

### Alternative: Docker (Railway, Fly.io, any VPS)

```powershell
docker build -t quantum-route .
docker run -p 8000:8000 -e PORT=8000 quantum-route
```

Visit `http://localhost:8000`.

## Step 3 — Resume & portfolio links

| Use | URL |
|-----|-----|
| Source code | `https://github.com/Pradeep007-pixel/Quantum-Route-Optimization` |
| Live demo | Your Render URL from Step 2 |
| Label on resume | `Live Demo` or `GitHub Repository` |

## Step 4 — Make the GitHub repo look professional

1. **About** (gear on repo home): add description, website = live demo URL, topics: `quantum-computing`, `vrp`, `fastapi`, `react`, `optimization`.
2. Add a **screenshot**: run locally, capture the dashboard, save as `docs/screenshot.png`, reference it in README.
3. Enable **Public** repo (Settings → Danger zone) if it is private.

## Local test before deploying

```powershell
cd frontend
npm install
npm run build
cd ..
pip install -r requirements.txt
$env:OPEN_BROWSER="0"
python main.py
```

Open `http://localhost:8000` and run an optimization.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Frontend build not found" | Run `cd frontend && npm run build` before start, or use Render build (see `render.yaml`). |
| Build fails on Render | Check build logs; ensure `frontend/package-lock.json` is committed. |
| API timeout | Large `n_nodes` / `annealing_steps` are slow on free CPU; use defaults for demos. |
