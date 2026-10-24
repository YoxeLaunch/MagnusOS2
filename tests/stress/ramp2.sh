#!/bin/bash
# Rampa de carga en estado estable con corte preventivo si se degrada el SLA
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REP_PID=${1:-$(cat /tmp/replica_pid.txt 2>/dev/null || pgrep -f "node server/index.js" | head -1)}

for N in 50 100 150 200 300 500; do
  echo "=== $(date +%H:%M:%S) | $N usuarios ==="
  OUT=$(node "$SCRIPT_DIR/load2.mjs" "$N" 60 2>/dev/null)
  echo "$OUT"
  ERR=$(echo "$OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error_pct', 0))" 2>/dev/null || echo 100)
  P95=$(echo "$OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('latencia_ms', {}).get('p95', 0))" 2>/dev/null || echo 99999)
  
  if [ -n "$REP_PID" ] && [ -d "/proc/$REP_PID" ]; then
    RSS=$(grep VmRSS "/proc/$REP_PID/status" 2>/dev/null | awk '{printf "%.0f MiB", $2/1024}')
  else
    RSS="N/A"
  fi
  
  echo "  [recursos] réplica RSS: $RSS | loadavg: $(cut -d' ' -f1-3 /proc/loadavg) | host libre: $(free -m | awk '/Mem:/{print $7}') MiB"
  
  if (( $(echo "$ERR > 2" | bc -l 2>/dev/null || echo 0) )) || (( $(echo "$P95 > 2500" | bc -l 2>/dev/null || echo 0) )); then
    echo ">>> UMBRAL DE DEGRADACIÓN SUPERADO (err=${ERR}% p95=${P95}ms) — deteniendo rampa preventivamente"
    break
  fi
done
