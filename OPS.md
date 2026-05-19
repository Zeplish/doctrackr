# DocTrackr — Operations Guide

Day-to-day management reference for the running DocTrackr app.
For the initial installation, see **DEPLOY.md** instead.

---

## 1. Development → Production Workflow

DocTrackr uses a three-stage pipeline:

```
Replit (develop & stage)  →  GitHub  →  Coolify (production)
```

### Making and deploying a change

1. Switch Replit to **Build mode** (toggle in the top bar).
2. Describe the change to the Replit agent — it writes and tests the code.
3. Once satisfied, open the Replit **Shell** tab and push to GitHub:
   ```bash
   git push origin main
   ```
4. In Coolify, open your DocTrackr resource and click **Redeploy**.
   - Or enable **Auto Deploy** in Coolify to redeploy automatically on every push.

### Keeping Replit in sync with GitHub

If changes were made directly to GitHub (e.g. by Codex or another tool), pull them
into Replit before making further edits:

Open the Replit **Shell** tab and run:
```bash
git pull origin main
```

> **Rule of thumb:** Always pull before you start a new change session if anything
> might have been pushed to GitHub outside of Replit.

---

## 2. Daily Operations in Coolify

### View live logs

1. Open Coolify → your DocTrackr project.
2. Click the resource (e.g. `api` or `frontend`).
3. Click the **Logs** tab to see live output.

Or from the server terminal:
```bash
docker compose logs -f api        # API server logs
docker compose logs -f frontend   # Frontend logs
docker compose logs -f db         # Database logs
docker compose logs -f            # All services
```
Press `Ctrl+C` to stop following.

### Redeploy after a code push

- **Coolify UI:** Open your resource → click **Redeploy**.
- **Auto Deploy:** Enable in the resource settings to trigger on every GitHub push.

### Update an environment variable

1. Coolify → resource → **Environment Variables** tab.
2. Edit the value → click **Save**.
3. Click **Restart** (or **Redeploy** if a full rebuild is needed).

> Changes to `AUTH_USERNAME`, `AUTH_PASSWORD`, or `SESSION_SECRET` require a
> restart of the API service to take effect.

### Restart a single service

- **Coolify UI:** resource → **Restart** button.
- **Server terminal:**
  ```bash
  docker compose restart api
  docker compose restart frontend
  docker compose restart db
  ```

### Stop and start all services

```bash
docker compose down       # Stop all (data is preserved)
docker compose up -d      # Start all again
```

---

## 3. Database

### Manual backup

Run from the server (or Coolify terminal → `db` container):

```bash
docker compose exec db pg_dump -U doctrackr doctrackr > backup-$(date +%Y%m%d-%H%M).sql
```

Copy the backup off the server to a safe location:
```bash
scp ubuntu@YOUR-SERVER-IP:~/doctrackr/backup-*.sql ./
```

### Restore from backup

```bash
cat backup-20240101-0900.sql | docker compose exec -T db psql -U doctrackr doctrackr
```

> The API service should be stopped before restoring to avoid conflicts:
> `docker compose stop api` — restore — `docker compose start api`

### Run the seed script (fresh install only)

After a brand-new installation before any data has been entered:
```bash
# Coolify terminal (api container):
pnpm --filter @workspace/scripts run seed-document-types

# Server terminal:
docker compose exec api pnpm --filter @workspace/scripts run seed-document-types
```

### Connect to the database directly

```bash
docker compose exec db psql -U doctrackr doctrackr
```

---

## 4. Credentials

### Change the login password (recommended method)

Log into DocTrackr → **Settings** (left sidebar) → **Login Credentials**.
Enter the current password and set a new one. Takes effect immediately, no restart needed.

### Reset a forgotten password via Coolify

1. Coolify → resource → **Environment Variables**.
2. Update `AUTH_PASSWORD` to a new value.
3. Clear `authPasswordHash` from the database so the env var takes precedence:
   ```bash
   docker compose exec db psql -U doctrackr doctrackr \
     -c "UPDATE organization SET auth_password_hash = NULL, auth_username = NULL;"
   ```
4. Restart the API service.

> After logging in with the env-var password, go to Settings → Login Credentials
> to set a proper stored password (which will override the env var going forward).

---

## 5. SSL / Domain

### Change or add a domain

1. Update your DNS A record to point to the server IP.
2. Coolify → resource → **Domains** tab → enter the new domain.
3. Enable **Let's Encrypt** — Coolify renews the certificate automatically.
4. Click **Save** → **Redeploy**.

### Let's Encrypt renewal

Coolify handles renewals automatically. No manual action is needed.
If a certificate fails to renew, check that ports 80 and 443 are open in the firewall
and Oracle Cloud Security List.

---

## 6. Fresh Server Installation

For a complete new-server installation from scratch, follow **DEPLOY.md** (Option B — Coolify is recommended).

Quick summary:
1. Provision an Ubuntu 22.04 server (Oracle Cloud Always Free ARM works well).
2. Open ports 22, 80, 443, 8000 in the firewall and Oracle Security List.
3. Install Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
4. Connect GitHub, create the project, set env vars, add domain, deploy.
5. Run the seed script once.

---

## 7. Troubleshooting

### App not loading
- Check the container status: `docker compose ps`
- Check logs: `docker compose logs -f`
- Confirm ports 80/443 are open in the Oracle Cloud Security List
- Try: `curl http://localhost` from the server itself

### Email not sending (SMTP errors)
- Go to **Settings → SMTP** in the DocTrackr UI and verify your settings.
- Gmail and Zoho require an **App Password**, not your regular account password.
  - Gmail: myaccount.google.com → Security → App Passwords
  - Zoho: mail.zoho.com → Settings → Security → App Passwords
- Port 465 uses implicit TLS (`secure: true`); port 587 uses STARTTLS.

### Reminder emails not firing
- Check **Settings → Reminders** — confirm the cron schedule and interval are correct.
- The scheduler reads the cron expression from the database **on startup**. After
  changing the schedule, the API service must be restarted:
  ```bash
  docker compose restart api
  ```

### Database errors on startup
- The API runs migrations automatically on boot.
- If you see `relation does not exist`, the migration may have failed — check API logs.
- Ensure `DATABASE_URL` matches `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

### Build fails on Coolify
- Check the Coolify build logs for the specific error.
- Out-of-memory during build: add a swap file on the server (see DEPLOY.md Troubleshooting).
- pnpm version mismatch: both Dockerfiles pin `pnpm@10.26.1` — do not change this.

### Forgot Coolify admin password
```bash
# On the server:
docker exec -it coolify sh -c "php artisan tinker --execute=\"\\\$u=\App\Models\User::first(); \\\$u->password=bcrypt('newpassword'); \\\$u->save();\""
```

---

## 8. Useful One-Liners

```bash
# Check all running containers
docker compose ps

# Follow all logs
docker compose logs -f

# Open shell in API container
docker compose exec api sh

# Open shell in database
docker compose exec db psql -U doctrackr doctrackr

# Backup database
docker compose exec db pg_dump -U doctrackr doctrackr > backup-$(date +%Y%m%d).sql

# Hard restart everything
docker compose down && docker compose up -d

# Check disk usage
df -h

# Check memory
free -h
