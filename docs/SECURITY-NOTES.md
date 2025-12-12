# Security Notes

- App is **local-only**: backend binds to `127.0.0.1`, frontend proxies locally.
- Secrets are never committed. Use `backend/.env.local` for:
  - `VPS_HOST`, `VPS_PORT`, `VPS_USERNAME`, `VPS_PRIVATE_KEY_PATH`, optional `VPS_PASSWORD`.
  - File is git-ignored.
- SSH handling:
  - All commands go through a fresh SSH session using `ssh2`.
  - Timeouts are enforced; errors surfaced to the UI.
  - No secrets are logged; outputs from commands are returned only to the local UI.
- Docker safety:
  - Only safe Docker CLI commands are used: `ps`, `inspect`, `stats`, `logs`, `start/stop/restart`, `update`, and compose-project discovery via labels.
  - No destructive filesystem commands (`rm -rf`, package upgrades, etc.).
  - Docker commands run on the VPS through SSH; local Docker is never touched.
- Manual project metadata is stored locally in `backend/data/projects.json` (git-ignored).
- Resource updates show the exact `docker update` command in the UI before execution.
