# Usage

## Prerequisites
- Node.js 18+ installed locally.
- SSH access to your Hostinger VPS (key or password).

## Configure secrets (never commit)
1. Copy `backend/.env.example` to `backend/.env.local`.
2. Fill:
   - `VPS_HOST`
   - `VPS_PORT` (default 22)
   - `VPS_USERNAME`
   - `VPS_PRIVATE_KEY_PATH` (preferred) or `VPS_PASSWORD` (optional)
   - `CORS_ORIGIN` if you run the frontend on a different port.
3. `.env.local` is git-ignored.

## Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

## Run the app (local-only)
Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

Frontend will proxy API requests to `http://localhost:4000`.

## Features
- Dashboard of projects (auto from compose labels, manual from local store).
- Project actions: start/stop/restart all containers in the project.
- Container actions: start/stop/restart, inspect env vars, view/update resource limits, view stats.
- Logs: fetch last N lines or follow live via SSE.
- Settings: SSH connection test (uses your `.env.local`), reminder about secret handling.

## Manual projects store
- Stored at `backend/data/projects.json` (git-ignored).
- Create/update/delete via UI; reassignment happens by container ID.
