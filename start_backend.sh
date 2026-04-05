#!/bin/bash

echo "Starting MY Plant Backend..."

# Navigate to backend directory
cd "$(dirname "$0")/backend" || exit

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv and install requirements
echo "Activating virtual environment and installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt

# Start the server
echo "Starting FastAPI server on http://localhost:8000"
python3 main.py
