# Docker Deployment Guide

## Overview

DocTrackr ships as four Docker services orchestrated by `docker-compose.yml`:

| Service  | Image / Build              | Purpose                                  |
|----------|----------------------------|------------------------------------------|
| `db`     | `postgres:16-alpine`       | PostgreSQL 16 database                   |
| `api`    | `artifacts/api-server/Dockerfile` | Express API + auto-migration on start |
| `frontend` | `artifacts/doctrackr/Dockerfile` | Nginx serving the built React SPA   |
| `proxy`  | `nginx:alpine`             | Root reverse proxy (`/api` → api, `/` → frontend) |

### Startup order

`db` (healthy) → `api` (runs `drizzle-kit push` then starts) → `proxy` + `frontend`

---

## Quick start

```bash
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD, SESSION_SECRET, AUTH_USERNAME, AUTH_PASSWORD

docker compose up --build -d
```

The app will be available at `http://localhost` (or `http://localhost:<EXPOSE_PORT>` if customised).

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable          | Default         | Description                                      |
|-------------------|-----------------|--------------------------------------------------|
| `POSTGRES_DB`     | `doctrackr`     | PostgreSQL database name                         |
| `POSTGRES_USER`   | `doctrackr`     | PostgreSQL username                              |
| `POSTGRES_PASSWORD` | `changeme`    | **Change this** — PostgreSQL password            |
| `DATABASE_URL`    | *(derived)*     | Full Postgres connection string for the API      |
| `SESSION_SECRET`  | *(placeholder)* | **Change this** — long random string for sessions |
| `AUTH_USERNAME`   | `admin`         | Login username                                   |
| `AUTH_PASSWORD`   | `changeme`      | **Change this** — login password                 |
| `NODE_ENV`        | `production`    | Node environment                                 |
| `PORT`            | `8080`          | Internal API port (do not change)               |
| `EXPOSE_PORT`     | `80`            | Host port the proxy binds to                    |

---

## Database migrations

Migrations run automatically when the `api` container starts (`drizzle-kit push`).
For manual runs:

```bash
docker compose run --rm api sh -c "pnpm --filter @workspace/db run push"
```

---

## Oracle Cloud ARM64 deployment

DocTrackr runs well on Oracle Cloud's free-tier ARM64 (Ampere) instances.

1. **Provision** an OCI Compute instance with Ubuntu 22.04 Minimal ARM64.
2. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker ubuntu
   ```
3. **Clone the repo** and copy `.env.example` to `.env`, filling in secrets.
4. **Build and start**:
   ```bash
   docker compose up --build -d
   ```
5. **Firewall**: open port 80 (and 443 if using a TLS terminator in front).

> **Note**: The `postgres:16-alpine` image is multi-arch and runs natively on ARM64. No `platform:` override is needed.

---

## TLS / HTTPS

The proxy service listens on plain HTTP. For production HTTPS, place a TLS-terminating reverse proxy (Caddy, Traefik, Nginx on the host) in front and forward to `localhost:<EXPOSE_PORT>`.

Example with Caddy on the host:

```
yourdomain.com {
    reverse_proxy localhost:80
}
```

---

## Useful commands

```bash
# View live logs
docker compose logs -f api

# Restart the API (picks up env changes)
docker compose restart api

# Stop everything
docker compose down

# Stop and remove volumes (destroys data)
docker compose down -v
```
