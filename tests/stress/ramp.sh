#!/bin/bash
# Rampa de carga MagnusOS2 - captura de métricas del sistema por paso de usuarios
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REP_PID=${1:-$(pgrep -f "node server/index.js" | head -1)}

snapshot() {
  local label="$1"
  if [ -n "$REP_PID" ] && [ -d "/proc/$REP_PID" ]; then
    RSS=$(grep VmRSS /proc/$REP_PID/status 2>/dev/null | awk '{print $2/1024 " MiB"}')
  else
    RSS="N/A"
  fi
  LOAD=$(cut -d' ' -f1-3 /proc/loadavg)
  MEMAV=$(free -m | awk '/Mem:/{print $7 " MiB libres"}')
  PG=$(docker stats --no-stream --format "{{.CPUPerc}} CPU, {{.MemUsage}}" magnus_postgres_test 2>/dev/null || echo "N/A")
  APPCPU=$(docker stats --no-stream --format "{{.CPUPerc}}" magnus_os2_app 2>/dev/null || echo "N/A")
  echo "  [recursos $label] réplica RSS: $RSS | loadavg: $LOAD | host: $MEMAV | pg_test: $PG | prod app: $APPCPU"
}

for N in 25 50 100 200 400; do
  echo "=== $(date +%H:%M:%S) | $N usuarios virtuales (60s) ==="
  node "$SCRIPT_DIR/load.mjs" browse "$N" 60 2>/dev/null
  snapshot "post-$N"
done
