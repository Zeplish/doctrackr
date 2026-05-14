# DocTrackr — Self-Hosting Deployment Guide

This guide covers every step required to get DocTrackr running on your own server,
starting from zero. Two options are provided:

- **Option A — Docker Compose** (manual, full control, good if you are comfortable in a terminal)
- **Option B — Coolify** (recommended — web UI, automatic SSL, easy redeployments)

---

## Part 1 — Get the code onto GitHub

Both deployment options require the code to live in a GitHub repository on your own account.

### Step 1.1 — Create a GitHub account (skip if you already have one)

1. Go to [github.com](https://github.com) and click **Sign up**.
2. Follow the prompts to create a free account.

### Step 1.2 — Create a Personal Access Token (PAT)

You need this to push code from Replit to GitHub.

1. Log into GitHub → click your avatar (top-right) → **Settings**.
2. Scroll to the bottom of the left sidebar → **Developer settings**.
3. Click **Personal access tokens** → **Tokens (classic)**.
4. Click **Generate new token (classic)**.
5. Give it a name (e.g. `doctrackr-push`), set expiration to **No expiration** (or 90 days).
6. Tick the **repo** checkbox.
7. Click **Generate token** → **copy the token immediately** (you cannot see it again).

### Step 1.3 — Create a new GitHub repository

1. On GitHub, click the **+** icon (top-right) → **New repository**.
2. Name it `doctrackr`.
3. Set it to **Private**.
4. **Do not** tick "Add a README file" or any other initialisation option.
5. Click **Create repository**.
6. Copy the HTTPS URL shown (e.g. `https://github.com/your-username/doctrackr.git`).

### Step 1.4 — Get the code out of Replit

You have two ways to do this. Pick whichever feels easier.

---

#### Method A — Push directly from Replit Shell to GitHub (simplest)

In Replit, open the **Shell** tab and run these commands one at a time.
When Git asks for a password, paste the Personal Access Token from Step 1.2.

```bash
# If the repo isn't initialised yet (run git status first to check):
# git init && git add -A && git commit -m "initial commit"

git remote add origin https://github.com/YOUR-USERNAME/doctrackr.git
git push -u origin main
```

If you see an error saying the remote already exists, use this instead:

```bash
git remote set-url origin https://github.com/YOUR-USERNAME/doctrackr.git
git push -u origin main
```

Your code is now on GitHub. Verify by refreshing the repository page on GitHub.

---

#### Method B — Download a bundle file, then push from your own computer

Use this if Replit's Shell cannot reach GitHub (e.g. network restrictions).

**On Replit — create the bundle:**

Open the Replit **Shell** tab and run:

```bash
git bundle create doctrackr.bundle --all
```

This creates a single file `doctrackr.bundle` in the project root.  
Download it: in the Replit **Files** panel on the left, right-click `doctrackr.bundle` → **Download**.

**On your own computer — push to GitHub:**

Open a terminal on your computer (Terminal on Mac/Linux, Git Bash on Windows).

```bash
# Clone from the bundle into a local folder
git clone doctrackr.bundle doctrackr
cd doctrackr

# Point it at your GitHub repository
git remote set-url origin https://github.com/YOUR-USERNAME/doctrackr.git

# Push to GitHub (use your Personal Access Token as the password when prompted)
git push -u origin main
```

Your code is now on GitHub.

---

## Part 2 — Prepare your server

These steps apply to both Option A and Option B.

### Step 2.1 — Recommended server specs

| | Minimum | Recommended |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 10 GB | 20 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

Oracle Cloud's **Always Free** tier (AMD or ARM64) works well.

### Step 2.2 — SSH into your server

From your local machine:

```bash
ssh ubuntu@YOUR-SERVER-IP
```

All commands below are run on the server unless stated otherwise.

### Step 2.3 — Open firewall ports

| Port | Purpose |
|------|---------|
| 22 | SSH |
| 80 | HTTP (DocTrackr app / Coolify proxy) |
| 443 | HTTPS (if using SSL) |
| 8000 | Coolify web UI (Option B only) |

On Oracle Cloud, you must also update the **Security List** in the VCN to allow these ports.

---

## Option A — Direct Docker Compose

### Step A.1 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify: `docker --version`

### Step A.2 — Clone your repository

```bash
git clone https://github.com/YOUR-USERNAME/doctrackr.git
cd doctrackr
```

If your repository is private, Git will prompt for your username and the Personal
Access Token from Step 1.2.

### Step A.3 — Create your environment file

```bash
cp .env.example .env
nano .env
```

Fill in the values:

| Variable | What to set |
|---|---|
| `POSTGRES_PASSWORD` | A strong random password — e.g. run `openssl rand -hex 24` |
| `SESSION_SECRET` | A long random string — e.g. run `openssl rand -hex 32` |
| `AUTH_USERNAME` | Your login username for the DocTrackr app |
| `AUTH_PASSWORD` | Your login password for the DocTrackr app |
| `EXPOSE_PORT` | Leave as `80`, or change to `8080` if port 80 is taken |

> For a complete description of every variable (including optional ones), see `DOCKER.md`.

Save and exit nano: `Ctrl+O` then `Enter` then `Ctrl+X`.

### Step A.4 — Build and start

```bash
docker compose up --build -d
```

This builds all images and starts the four services. It can take 3–5 minutes the
first time. Follow progress with:

```bash
docker compose logs -f
```

Press `Ctrl+C` to stop following logs (the app keeps running).

### Step A.5 — Verify

Open a browser and go to `http://YOUR-SERVER-IP`. You should see the DocTrackr login page.

### Step A.6 — Add HTTPS (recommended)

Install Caddy on the server for automatic Let's Encrypt certificates:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Edit the Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Replace the contents with:

```
yourdomain.com {
    reverse_proxy localhost:80
}
```

Restart Caddy:

```bash
sudo systemctl reload caddy
```

Your app is now accessible at `https://yourdomain.com`.
If using a subdomain, point it to your server IP with an A record first.

### Step A.7 — Update the app in the future

```bash
cd doctrackr
git pull origin main
docker compose up --build -d
```

---

## Option B — Coolify (Recommended)

Coolify is a free, open-source self-hosting platform with a web UI. It handles
Docker builds, environment variables, SSL certificates, and redeployments automatically.

### Step B.1 — Install Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Wait a minute for installation to complete, then open:

```
http://YOUR-SERVER-IP:8000
```

Complete the setup wizard — create your Coolify admin account.

### Step B.2 — Connect GitHub

1. In Coolify, click **Sources** in the left sidebar → **Add** → **GitHub App**.
2. Click **Register GitHub App** — this opens GitHub where you authorise Coolify.
3. Follow the OAuth prompts and allow access to your `doctrackr` repository.
4. Return to Coolify — the GitHub source should now show as connected.

### Step B.3 — Create a new project

1. Click **Projects** → **Add** → give it a name (e.g. `DocTrackr`).
2. Click **Add New Resource** → **Docker Compose**.
3. Select your GitHub source and choose the `doctrackr` repository, branch `main`.
4. Set **Docker Compose Location** to `docker-compose.yml`.
5. Click **Save**.

### Step B.4 — Set environment variables

In the resource settings, click **Environment Variables** and add each variable:

| Variable | Value |
|---|---|
| `POSTGRES_DB` | `doctrackr` |
| `POSTGRES_USER` | `doctrackr` |
| `POSTGRES_PASSWORD` | A strong random password |
| `DATABASE_URL` | `postgresql://doctrackr:YOUR_PASSWORD@db:5432/doctrackr` |
| `SESSION_SECRET` | A long random string |
| `AUTH_USERNAME` | Your login username |
| `AUTH_PASSWORD` | Your login password |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `EXPOSE_PORT` | `80` |

To generate random secrets: `openssl rand -hex 32`

### Step B.5 — Add your domain and enable SSL

1. In the resource settings, click **Domains**.
2. Enter your domain (e.g. `https://doctrackr.yourdomain.com`).
3. Enable **Let's Encrypt** — Coolify handles the certificate automatically.

Point your domain's A record to your server IP before this step.

### Step B.6 — Deploy

Click **Deploy**. Coolify will clone the repo, build all four Docker services,
and start them. Watch the build logs in the Coolify UI.

Once done, your app will be live at your domain.

### Step B.7 — Update the app in the future

1. Push changes to GitHub (from Replit Shell: `git push origin main`).
2. In Coolify, click **Redeploy** on your DocTrackr resource.

Or enable **Auto Deploy** in Coolify settings to redeploy automatically on every push.

---

## Part 3 — First-run data setup

After the app is running for the first time, seed the document types:

**Option A:**
```bash
docker compose exec api sh -c "pnpm --filter @workspace/scripts run seed-document-types"
```

**Option B (Coolify):**
In Coolify, go to your resource → **Terminal** → select the `api` container and run:
```bash
pnpm --filter @workspace/scripts run seed-document-types
```

---

## Part 4 — Quick reference

### Useful Docker commands (Option A)

```bash
# View logs for a specific service
docker compose logs -f api

# Restart the API service
docker compose restart api

# Stop all services
docker compose down

# Stop and delete all data (irreversible)
docker compose down -v

# Open a shell inside the API container
docker compose exec api sh
```

### Backup the database

```bash
docker compose exec db pg_dump -U doctrackr doctrackr > backup-$(date +%Y%m%d).sql
```

### Restore from backup

```bash
cat backup-20240101.sql | docker compose exec -T db psql -U doctrackr doctrackr
```

---

## Troubleshooting

**App not accessible on port 80**
- Check the container is running: `docker compose ps`
- Check the firewall/security group allows port 80
- Try `curl http://localhost` from the server itself

**Database connection errors**
- Verify `DATABASE_URL` in `.env` matches `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`
- Wait 15–20 seconds after first start for the database to initialise

**Build fails with out-of-memory error**
- The build requires ~1.5 GB RAM. If your server has 1 GB, add a swap file:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```

**Forgot the login password**
- Update `AUTH_PASSWORD` in `.env` (or Coolify env vars) and restart the API service.
