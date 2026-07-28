#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Start MongoDB
echo -e "${GREEN}[1/3] Starting MongoDB...${NC}"
if command -v mongosh &>/dev/null || command -v mongo &>/dev/null; then
  mongosh --eval "db.adminCommand('ping')" --quiet 2>/dev/null && {
    echo -e "  ${GREEN}MongoDB already running${NC}"
  } || {
    if command -v mongod &>/dev/null; then
      mkdir -p /tmp/cloud-mongodb
      mongod --dbpath /tmp/cloud-mongodb --logpath /tmp/cloud-mongodb/mongo.log --fork 2>&1
      echo -e "  ${GREEN}MongoDB started${NC}"
    else
      echo -e "  ${YELLOW}mongod not found — trying systemctl...${NC}"
      sudo systemctl start mongod 2>/dev/null || sudo service mongod start 2>/dev/null || {
        echo -e "  ${RED}Could not start MongoDB. Start it manually.${NC}"
      }
    fi
  }
else
  # Check if running via systemctl
  if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "  ${GREEN}MongoDB already running${NC}"
  else
    sudo systemctl start mongod 2>/dev/null || {
      echo -e "  ${YELLOW}Trying mongod directly...${NC}"
      mkdir -p /tmp/cloud-mongodb
      mongod --dbpath /tmp/cloud-mongodb --logpath /tmp/cloud-mongodb/mongo.log --fork 2>&1 || {
        echo -e "  ${RED}Failed to start MongoDB. Start it manually.${NC}"
      }
    }
  fi
fi

# 2. Start Backend
echo -e "${GREEN}[2/3] Starting backend...${NC}"
cd "$BACKEND_DIR"
if [ ! -d node_modules ]; then
  echo -e "  ${YELLOW}Installing backend dependencies...${NC}"
  npm install --silent
fi
node server.js &
BACKEND_PID=$!
echo -e "  ${GREEN}Backend started (PID: $BACKEND_PID)${NC}"

sleep 2

# 3. Start Frontend
echo -e "${GREEN}[3/3] Starting frontend...${NC}"
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  echo -e "  ${YELLOW}Installing frontend dependencies (this may take a while)...${NC}"
  npm install
fi
BROWSER=none HOST=0.0.0.0 npm start &
FRONTEND_PID=$!
echo -e "  ${GREEN}Frontend starting (PID: $FRONTEND_PID)${NC}"

LAN_IP=$(ip -4 addr show | grep -oP 'inet \K[\d.]+' | grep -v '127.0.0.1' | head -1)
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Cloud Manager is starting up${NC}"
echo -e "${GREEN}  Backend:  http://localhost:5000${NC}"
echo -e "${GREEN}           http://${LAN_IP}:5000${NC}"
echo -e "${GREEN}  Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}           http://${LAN_IP}:3000${NC}"
echo -e "${GREEN}  Press Ctrl+C to stop all services${NC}"
echo -e "${GREEN}========================================${NC}"

wait
