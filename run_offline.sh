#!/bin/bash
# Master Start Script for MY Plant (100% Offline)

# 1. Kill any existing processes on required ports
echo "[!] Cleaning up ports 5000 and 8765..."
fuser -k 5000/tcp 2>/dev/null
fuser -k 8765/tcp 2>/dev/null
sleep 2

# 2. Start Offline Backend
echo "[!] Starting Offline AI Backend (Port 5000)..."
cd /home/mikodereje03/MY_PLANT/MY_PLANT_LLM/MY_PLANT
./start.sh > backend.log 2>&1 &

# 3. Start Frontend
echo "[!] Starting Mobile Frontend (Port 8765)..."
cd /home/mikodereje03/MY_PLANT/frontend
python3 -m http.server 8765 > frontend.log 2>&1 &

echo "========================================"
echo "   MY Plant is now running 100% Offline!"
echo "   Backend: http://localhost:5000"
echo "   Frontend: http://localhost:8765"
echo "========================================"
echo "Check backend.log and frontend.log for output."
