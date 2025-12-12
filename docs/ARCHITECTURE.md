# Architecture

## Overview
Local-only app with a TypeScript Fastify backend and Vite + React frontend. The backend mediates all SSH traffic to the VPS and exposes REST + SSE endpoints. The frontend consumes those endpoints for dashboards, project views, logs, and resource controls. No direct Docker access locally.

## Backend (Fastify)
- **Entry (`backend/src/index.ts`):** Boot Fastify, load env/config, register routes, enable CORS (localhost only), and start HTTP + SSE endpoints.
- **Config (`backend/config`):** Reads `.env.local` using `dotenv` and provides a typed `AppConfig` (host, port, username, key path, password/optional, timeout).
- **SSH Service (`backend/src/services/sshClient.ts`):** Thin wrapper over `ssh2` that opens exec sessions, streams stdout/stderr, enforces timeouts, and ensures cleanup. All VPS commands go through here.
- **Docker Service (`backend/src/services/dockerService.ts`):** Uses the SSH client to run Docker CLI commands: list containers, inspect, stats, logs (tail/follow), start/stop/restart, update resource limits, and compose project discovery via labels.
- **Projects Store (`backend/src/services/projectStore.ts`):** Manages `data/projects.json` for manual grouping/metadata. Provides CRUD + assignments of containers to user-defined projects.
- **Routes (`backend/src/routes/*.ts`):**
  - `projects`: list/create/update/delete manual projects, merge with auto-discovered compose groups.
  - `containers`: list containers (grouped), start/stop/restart, inspect env vars, stats, resource limits update.
  - `logs`: REST for tail, SSE for follow (cancellable).
  - `settings`: health check and connection test endpoint.
- **Types (`backend/src/types`):** Shared DTOs for containers, projects, stats, env vars, and request/response schemas.

## Frontend (Vite + React)
- **Entry:** `frontend/src/main.tsx` bootstraps the app with routing and theme.
- **Pages:** Dashboard, Project Detail (overview/env/logs/resource tabs), Logs view, Settings.
- **Components:** 
  - Project cards, container list/status badges, resource limit form with confirmation, logs viewer with tail/follow and monospaced view.
  - Modals for start/stop/restart confirmation and resource updates (showing the exact Docker command).
- **Data Layer:** Simple API client using `fetch` with typed helpers and SSE hooks for live logs/stats.
- **State:** React Query (or lightweight hooks) for caching list/detail; SSE for streaming logs.

## Data & Persistence
- **VPS state:** Real-time via Docker CLI over SSH.
- **Local state:** `data/projects.json` for manual grouping; `.env.local` for SSH credentials (ignored by git).

## Security & Boundaries
- Backend binds to localhost only; no public exposure.
- Secrets never logged; sensitive fields masked in responses.
- No destructive commands; only Docker CLI for inspect, start/stop/restart/update/logs/stats.
- All Docker commands executed through SSH to the VPS; never against local Docker.
