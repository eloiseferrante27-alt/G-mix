#!/usr/bin/env bash
# G-MIX — Start script
# Usage:
#   ./start_app.sh              → Supabase (default)
#   ./start_app.sh supabase     → Supabase explicitly
#   ./start_app.sh django       → Django backend + frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
DJANGO_DIR="$SCRIPT_DIR/backend/django_alternative"

BACKEND="${1:-supabase}"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[G-MIX]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
err()  { echo -e "${RED}[ERR]${RESET}   $*"; }

# ── Validate backend choice ───────────────────────────────────────────────────
if [[ "$BACKEND" != "supabase" && "$BACKEND" != "django" ]]; then
  err "Backend inconnu : '$BACKEND'. Utilise 'supabase' ou 'django'."
  exit 1
fi

echo ""
echo -e "${BOLD}  ██████╗       ███╗   ███╗██╗██╗  ██╗${RESET}"
echo -e "${BOLD}  ██╔════╝      ████╗ ████║██║╚██╗██╔╝${RESET}"
echo -e "${BOLD}  ██║  ███╗     ██╔████╔██║██║ ╚███╔╝ ${RESET}"
echo -e "${BOLD}  ██║   ██║     ██║╚██╔╝██║██║ ██╔██╗ ${RESET}"
echo -e "${BOLD}  ╚██████╔╝     ██║ ╚═╝ ██║██║██╔╝ ██╗${RESET}"
echo -e "${BOLD}   ╚═════╝      ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝${RESET}"
echo ""
echo -e "  Backend : ${BOLD}$BACKEND${RESET}"
echo ""

# ── Kill previous processes on target ports ───────────────────────────────────
kill_port() {
  local port="$1"
  local pid
  pid=$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | awk '{print $NF}' | head -1)
  if [[ -n "$pid" ]]; then
    taskkill //PID "$pid" //F &>/dev/null && warn "Port $port libéré (PID $pid)"
  fi
}

log "Libération des ports..."
kill_port 3000
kill_port 8000

# ── .env.local setup ─────────────────────────────────────────────────────────
ENV_FILE="$FRONTEND_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  warn ".env.local introuvable — copie depuis .env.example"
  cp "$FRONTEND_DIR/.env.example" "$ENV_FILE"
fi

# Update BACKEND_TYPE in .env.local (create or replace the line)
if grep -q "^BACKEND_TYPE=" "$ENV_FILE"; then
  sed -i "s/^BACKEND_TYPE=.*/BACKEND_TYPE=$BACKEND/" "$ENV_FILE"
else
  echo "BACKEND_TYPE=$BACKEND" >> "$ENV_FILE"
fi

ok ".env.local → BACKEND_TYPE=$BACKEND"

# ── Django backend ────────────────────────────────────────────────────────────
if [[ "$BACKEND" == "django" ]]; then
  log "Démarrage du backend Django..."

  if [[ ! -d "$DJANGO_DIR" ]]; then
    err "Dossier Django introuvable : $DJANGO_DIR"
    exit 1
  fi

  # Detect Python
  PYTHON=""
  for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
      PYTHON="$cmd"
      break
    fi
  done

  if [[ -z "$PYTHON" ]]; then
    err "Python introuvable. Installe Python 3.10+."
    exit 1
  fi

  # Check/activate venv
  VENV_DIR="$DJANGO_DIR/venv"
  if [[ -f "$VENV_DIR/Scripts/activate" ]]; then
    source "$VENV_DIR/Scripts/activate"
    ok "venv activé"
  elif [[ -f "$VENV_DIR/bin/activate" ]]; then
    source "$VENV_DIR/bin/activate"
    ok "venv activé"
  else
    warn "Aucun venv trouvé — utilisation du Python système"
  fi

  # Apply migrations
  log "Vérification des migrations Django..."
  (cd "$DJANGO_DIR" && $PYTHON manage.py migrate --run-syncdb 2>&1 | grep -v "^No migrations") || true

  # Start Django in background
  log "Lancement Django sur http://localhost:8000 ..."
  (cd "$DJANGO_DIR" && $PYTHON manage.py runserver 8000 > /tmp/django.log 2>&1) &
  DJANGO_PID=$!
  echo "$DJANGO_PID" > /tmp/gmix_django.pid

  sleep 2
  if kill -0 "$DJANGO_PID" 2>/dev/null; then
    ok "Django démarré (PID $DJANGO_PID)"
  else
    err "Django a planté. Logs : /tmp/django.log"
    cat /tmp/django.log
    exit 1
  fi
else
  log "Backend Supabase — pas de serveur local à démarrer."
  ok "Vérifie que NEXT_PUBLIC_SUPABASE_URL et les clés sont dans .env.local"
fi

# ── Frontend ──────────────────────────────────────────────────────────────────
log "Démarrage du frontend Next.js sur http://localhost:3000 ..."

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  warn "node_modules absent — installation des dépendances..."
  (cd "$FRONTEND_DIR" && npm install)
fi

(cd "$FRONTEND_DIR" && npm run dev > /tmp/next.log 2>&1) &
NEXT_PID=$!
echo "$NEXT_PID" > /tmp/gmix_next.pid

# Wait for Next.js to be ready (up to 30s)
log "Attente du démarrage de Next.js..."
for i in $(seq 1 30); do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200\|307"; then
    ok "Frontend prêt sur http://localhost:3000"
    break
  fi
  if [[ $i -eq 30 ]]; then
    warn "Frontend pas encore prêt après 30s — vérifie /tmp/next.log"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  ─────────────────────────────────────${RESET}"
echo -e "${BOLD}  G-MIX démarré${RESET}"
echo -e "  Frontend  → ${GREEN}http://localhost:3000${RESET}"
if [[ "$BACKEND" == "django" ]]; then
echo -e "  Backend   → ${GREEN}http://localhost:8000${RESET} (Django)"
else
echo -e "  Backend   → ${CYAN}Supabase cloud${RESET}"
fi
echo -e "${BOLD}  ─────────────────────────────────────${RESET}"
echo ""
echo -e "  Pour arrêter : ${YELLOW}./stop_app.sh${RESET}  ou  ${YELLOW}Ctrl+C${RESET} ici"
echo ""

# Keep script alive so Ctrl+C stops everything
trap 'echo ""; log "Arrêt..."; kill $NEXT_PID 2>/dev/null; [[ -n "$DJANGO_PID" ]] && kill $DJANGO_PID 2>/dev/null; exit 0' INT TERM

wait $NEXT_PID
