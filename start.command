#!/bin/bash
# Double-click this file to start Discipline.
cd "$(dirname "$0")" || exit 1

PORT=4747
# If something is already on the port, just open it.
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  open "http://localhost:$PORT"
  exit 0
fi

echo "Starting Discipline…"
node server.js &
SERVER_PID=$!

# Wait for the server, then open the browser.
for i in $(seq 1 40); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/api/stats"; then break; fi
  sleep 0.25
done
open "http://localhost:$PORT"

echo
echo "Discipline is running at http://localhost:$PORT"
echo "Close this window or press Ctrl-C to stop it."
wait $SERVER_PID
