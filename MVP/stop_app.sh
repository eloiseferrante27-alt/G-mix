#!/usr/bin/env bash
# G-MIX — Stop script

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; RESET='\033[0m'

log() { echo -e "${CYAN}[G-MIX]${RESET} $*"; }
ok()  { echo -e "${GREEN}[OK]${RESET}    $*"; }

stop_pid_file() {
  local file="$1" label="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid=$(cat "$file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && ok "$label arrêté (PID $pid)"
    fi
    rm -f "$file"
  fi
}

stop_port() {
  local port="$1" label="$2"
  local pid
  pid=$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | awk '{print $NF}' | head -1)
  if [[ -n "$pid" ]]; then
    taskkill //PID "$pid" //F &>/dev/null && ok "$label (port $port, PID $pid) arrêté"
  fi
}

log "Arrêt de G-MIX..."
stop_pid_file /tmp/gmix_next.pid   "Frontend Next.js"
stop_pid_file /tmp/gmix_django.pid "Backend Django"
stop_port 3000 "Frontend"
stop_port 3001 "Frontend (alt)"
stop_port 8000 "Backend Django"

echo ""
ok "G-MIX arrêté."
