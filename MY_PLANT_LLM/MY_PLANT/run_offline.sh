#!/bin/bash
# MY Plant App launcher
# This script automatically detects the correct Python binary to avoid ModuleNotFoundErrors.

echo "======================================"
echo "    Starting MY Plant Application"
echo "======================================"

# Automatically move into the backend folder relative to where this script is placed
cd "$(dirname "$0")/backend" || exit

# 1. Attempt to use the root `venv` which is known to be functional
if [ -f "../../../venv/bin/python" ]; then
    echo "[!] Active virtual environment detected at (~/MY_PLANT/venv)"
    echo "[!] Starting Server..."
    ../../../venv/bin/python app.py

# 2. Attempt to use the local `.venv` (if it was fixed)
elif [ -f "../../.venv/bin/python" ]; then
    echo "[!] Active virtual environment detected at (~/MY_PLANT_LLM/.venv)"
    echo "[!] Starting Server..."
    ../../.venv/bin/python app.py

# 3. Fallback to system Python
else
    echo "[!] Fallback to system Python3."
    python3 app.py
fi
