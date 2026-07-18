#!/usr/bin/env bash
# Robust dev server starter for Apna Cricket
# - fully detaches into its own session (setsid)
# - writes directly to dev.log (no tee pipeline that can break)
# - kills any stale instance first
# - waits until port 3000 accepts connections before returning
set -u

PORT=3000
LOG="/home/z/my-project/dev.log"
PIDFILE="/home/z/my-project/.dev.pid"

# 1. Kill any stale next/tee processes
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "tee dev.log" 2>/dev/null
sleep 1

# 2. Start next dev directly (no tee pipe) in a new detached session
cd /home/z/my-project
NEXT_BIN="/home/z/my-project/node_modules/.bin/next"
setsid bash -c "exec '${NEXT_BIN}' dev -p ${PORT} > ${LOG} 2>&1" &
echo $! > "$PIDFILE"
disown 2>/dev/null || true

# 3. Wait until the port accepts connections (max ~30s)
for i in $(seq 1 30); do
  if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/" 2>/dev/null; then
    echo "OK: server up on port ${PORT} after ${i}s (pid $(cat "$PIDFILE"))"
    exit 0
  fi
  sleep 1
done

echo "FAIL: server did not come up within 30s"
tail -20 "$LOG"
exit 1
