#!/usr/bin/env bash
# deploy.sh — DocTrackr automated Docker Compose deployment
# Run this on your Ubuntu 22.04+ server as a non-root user with sudo access.
# Usage: bash deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
prompt()  { echo -e "${YELLOW}[INPUT]${NC} $1"; }

echo ""
echo "========================================"
echo "  DocTrackr — Automated Deployment"
echo "========================================"
echo ""

# ── Step 1: Install Docker if missing ──────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  info "Docker installed. You may need to log out and back in for group changes."
  info "Re-run this script after logging back in if Docker commands fail."
else
  info "Docker is already installed ($(docker --version))"
fi

if ! docker compose version &>/dev/null 2>&1; then
  error "Docker Compose plugin not found. Please install Docker Compose v2 and re-run."
fi

# ── Step 2: Clone the repository ───────────────────────────────────────────────
echo ""
prompt "Enter your GitHub repository URL"
prompt "Example: https://github.com/your-username/doctrackr.git"
read -rp "Repo URL: " REPO_URL

if [[ -z "$REPO_URL" ]]; then
  error "Repository URL cannot be empty."
fi

REPO_DIR=$(basename "$REPO_URL" .git)

if [[ -d "$REPO_DIR" ]]; then
  warn "Directory '$REPO_DIR' already exists. Pulling latest changes..."
  cd "$REPO_DIR"
  git pull origin main
else
  info "Cloning repository..."
  git clone "$REPO_URL"
  cd "$REPO_DIR"
fi

# ── Step 3: Configure environment ──────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
  info "Creating .env from .env.example..."
  cp .env.example .env

  echo ""
  info "Please set your secrets. Press Enter to keep the default shown in brackets."
  echo ""

  prompt "Admin login username [admin]:"
  read -rp "AUTH_USERNAME: " AUTH_USERNAME
  AUTH_USERNAME="${AUTH_USERNAME:-admin}"

  prompt "Admin login password (required — do not leave as 'changeme'):"
  read -rsp "AUTH_PASSWORD: " AUTH_PASSWORD
  echo ""
  if [[ -z "$AUTH_PASSWORD" || "$AUTH_PASSWORD" == "changeme" ]]; then
    error "You must set a real password. Re-run the script to try again."
  fi

  # Generate strong random secrets automatically
  PG_PASS=$(openssl rand -hex 20 2>/dev/null || LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 40)
  SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)

  # Write values into .env
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${PG_PASS}/" .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://doctrackr:${PG_PASS}@db:5432/doctrackr|" .env
  sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env
  sed -i "s/^AUTH_USERNAME=.*/AUTH_USERNAME=${AUTH_USERNAME}/" .env
  sed -i "s/^AUTH_PASSWORD=.*/AUTH_PASSWORD=${AUTH_PASSWORD}/" .env

  info "Generated a random database password and session secret automatically."
  info ".env written. Keep this file safe — it contains your secrets."
else
  warn ".env already exists — skipping configuration. Edit it manually if needed."
fi

# ── Step 4: Build and start ─────────────────────────────────────────────────────
echo ""
info "Building and starting DocTrackr (this may take 3–5 minutes the first time)..."
docker compose up --build -d

# ── Step 5: Done ────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo -e "${GREEN}  DocTrackr is running!${NC}"
echo "========================================"

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "  URL:      http://${SERVER_IP}"
echo "  Username: $(grep '^AUTH_USERNAME=' .env | cut -d= -f2)"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f       — view live logs"
echo "    docker compose restart api   — restart the API"
echo "    docker compose down          — stop all services"
echo ""
echo "  For HTTPS, see the Caddy section in DEPLOY.md"
echo ""
