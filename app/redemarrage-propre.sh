#!/bin/bash

echo "===== ARRÊT DES ANCIENNES INSTANCES VITE ====="

# Arrêter les processus Vite associés à ce projet
PIDS=$(pgrep -f '/workspaces/PlannerBuilder/app/node_modules/.bin/vite' || true)

if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs -r kill
  sleep 2
fi

# Vérifier et libérer les ports utilisés par Vite
for PORT in 5173 5174; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)

  if [ -n "$PID" ]; then
    echo "Libération du port $PORT"
    echo "$PID" | xargs -r kill
  fi
done

sleep 2

echo ""
echo "===== VÉRIFICATION DES PORTS ====="

for PORT in 5173 5174; do
  if lsof -ti tcp:$PORT >/dev/null 2>&1; then
    echo "Port $PORT encore occupé."
  else
    echo "Port $PORT libre."
  fi
done

echo ""
echo "===== TERMINÉ ====="
