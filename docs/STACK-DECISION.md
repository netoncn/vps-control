# Stack Decision

## Chosen Stack
- **Backend:** Node.js (TypeScript) + Fastify
  - Fast startup, lightweight routing, easy plugins for CORS, websockets/SSE.
  - Excellent SSH support via `ssh2` and streaming APIs for logs.
  - Easy to shell out to Docker commands over SSH and parse structured output.
- **Frontend:** Vite + React + TypeScript
  - Fast local dev with HMR; simple build output for a local-only app.
  - Rich ecosystem for hooks and state; easy integration with SSE/WebSockets for log streaming and stats.
- **UI Library:** Mantine (React) with a custom theme
  - Provides responsive layout primitives, modals, forms, and a code/monospace component for logs.
  - Quick to implement dialogs and validation while keeping styling consistent.
- **Local Persistence:** Lightweight JSON file (`backend/data/projects.json`) managed through a small abstraction; easy to swap for SQLite later.

## Alternatives Considered
- **Next.js full-stack:** Would merge API + UI, but more boilerplate for a small local tool. Separate backend keeps the SSH/Docker surface isolated.
- **Express instead of Fastify:** Familiar but lacks built-in decorators for types and lower-overhead handlers; Fastify plugins cover CORS, validation, and SSE cleanly.
- **Python (FastAPI):** Great typing/story but slower to iterate on Node-based SSH streaming and would introduce virtualenv management alongside a JS frontend.

## Notes
- The app is strictly local-only; no public endpoints.
- All secrets (host/user/port/key/password) live in `.env.local` (git-ignored) and are passed to the backend only.
- Docker commands are **only** executed through SSH on the VPS; local Docker is never touched.
