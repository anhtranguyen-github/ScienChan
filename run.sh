#!/bin/bash

# --- Configuration ---
BACKEND_PORT=8000
FRONTEND_PORT=3000
QDRANT_PORT=6333
MAX_RETRIES=30

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AI Architect Application Runner ===${NC}"

# Function to check port status
check_port() {
    lsof -i :$1 > /dev/null
    return $?
}

# Function to kill process on port
kill_port() {
    local port=$1
    if check_port $port; then
        echo -e "${YELLOW}Port $port is in use. Terminating existing process...${NC}"
        fuser -k $port/tcp > /dev/null 2>&1
        sleep 1
    fi
}

# 1. Cleanup existing processes
echo -e "\n${BLUE}[1/4] Cleaning up existing processes...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# 2. Start Infrastructure (Qdrant & MongoDB)
echo -e "\n${BLUE}[2/4] Starting Infrastructure (Qdrant & MongoDB)...${NC}"
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: docker compose not found. Please install Docker.${NC}"
    exit 1
fi

docker compose up -d

echo -n "Waiting for Infrastructure to be ready..."
count=0
while ! curl -s http://localhost:$QDRANT_PORT/healthz > /dev/null; do
    echo -n "."
    sleep 1
    count=$((count+1))
    if [ $count -ge $MAX_RETRIES ]; then
        echo -e "${RED}\nError: Infrastructure failed to start (Qdrant).${NC}"
        exit 1
    fi
done

# Basic check for MinIO (port 9000)
if ! nc -z localhost 9000; then
    echo -n "Waiting for MinIO..."
    count=0
    while ! nc -z localhost 9000; do
        echo -n "."
        sleep 1
        count=$((count+1))
        if [ $count -ge $MAX_RETRIES ]; then
            echo -e "${RED}\nError: MinIO failed to start.${NC}"
            exit 1
        fi
    done
fi

# Basic check for MongoDB (port 27017)
if ! nc -z localhost 27017; then
    echo -n "Waiting for MongoDB..."
    count=0
    while ! nc -z localhost 27017; do
        echo -n "."
        sleep 1
        count=$((count+1))
        if [ $count -ge $MAX_RETRIES ]; then
            echo -e "${RED}\nError: MongoDB failed to start.${NC}"
            exit 1
        fi
    done
fi

echo -e "${GREEN} READY!${NC}"

# 3. Start Backend
echo -e "\n${BLUE}[3/4] Starting Backend (FastAPI)...${NC}"
if [ ! -d "backend/.venv" ]; then
    echo -e "${YELLOW}Warning: Virtual environment not found. Attempting to create one...${NC}"
    python3 -m venv backend/.venv
    source backend/.venv/bin/activate
    pip install -r backend/requirements.txt
else
    source backend/.venv/bin/activate
fi

export PYTHONPATH=$PYTHONPATH:.
# Run in background
nohup python3 backend/app/main.py > backend.log 2>&1 &
BACKEND_PID=$!

echo -n "Waiting for Backend to be ready..."
count=0
while ! curl -s http://localhost:$BACKEND_PORT/ > /dev/null; do
    if ! ps -p $BACKEND_PID > /dev/null; then
        echo -e "${RED}\nError: Backend process died. Check backend.log for details.${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
    count=$((count+1))
    if [ $count -ge 60 ]; then
        echo -e "${RED}\nError: Backend failed to respond within 60 seconds. Check backend.log${NC}"
        kill $BACKEND_PID
        exit 1
    fi
done
echo -e "${GREEN} READY! (PID: $BACKEND_PID)${NC}"

# 4. Start Frontend
echo -e "\n${BLUE}[4/4] Starting Frontend (Next.js)...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Warning: node_modules not found. Running npm install...${NC}"
    npm install
fi

# Run in background
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo -n "Waiting for Frontend to be ready..."
count=0
while ! curl -s http://localhost:$FRONTEND_PORT > /dev/null; do
    echo -n "."
    sleep 2
    count=$((count+1))
    if [ $count -ge $MAX_RETRIES ]; then
        echo -e "${RED}\nError: Frontend failed to start. Check frontend.log${NC}"
        kill $BACKEND_PID
        kill $FRONTEND_PID
        exit 1
    fi
done
echo -e "${GREEN} READY! (PID: $FRONTEND_PID)${NC}"

echo -e "\n${GREEN}=== Application successfully started! ===${NC}"
echo -e "${BLUE}Frontend:   ${NC} http://localhost:3000"
echo -e "${BLUE}Backend API:${NC} http://localhost:8000"
echo -e "${BLUE}Qdrant UI:  ${NC} http://localhost:6333/dashboard"
echo -e "\n${YELLOW}Logs are available in backend.log and frontend.log${NC}"
echo -e "To stop the app, run: ${CYAN}kill $BACKEND_PID $FRONTEND_PID && docker compose stop${NC}"
