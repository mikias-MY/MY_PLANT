# MY Plant

Mobile-first web app: photograph or upload a leaf, run an accurately offline **TensorFlow / Python backend model** (with mapped symptoms, management, and treatment recommendations from PlantDoc), and render results instantly on your device!

## Architecture

This project runs using a **Dual-Service Architecture**:
1. **The Core ML Backend**: Evaluates leaves accurately based on the custom "Coffee" embedded TensorFlow dataset. Runs locally on port `5000`.
2. **The Frontend Web UI**: A beautiful web app you load in your browser that proxies scanning requests up to the ML Backend.

---

## 🚀 How to Run the Application Correctly

You must start **both** the backend service and the frontend web server to use the full application.

### Step 1: Start the Aegis Offline AI Backend (Native ML)
The backend cleanly leverages the native Python CNN model we built previously entirely offline without using any external APIs like Groq.

Open a terminal and forcefully run the following commands sequentially:
```bash
cd ~/MY_PLANT/MY_PLANT_LLM/MY_PLANT
./start.sh
```
*(Leave this terminal window actively running! It securely hosts the `http://localhost:5000` Engine API)*

### Step 2: Start the Mobile Frontend UI
The frontend interface needs an HTTP server to correctly capture your camera sensors.

Open a **new** terminal window and run:
```bash
cd ~/MY_PLANT/frontend
python3 -m http.server 8765
```

### Step 3: Open in Browser
Now, open your web browser and go exactly to:
👉 **[http://localhost:8765/](http://localhost:8765/)**

*(Do not use `0.0.0.0` as some browsers will aggressively block camera permissions!)*

---

### Using the app

1. Complete the intro screens and open **Home**.
2. **Scan New Plant** → give your browser camera access (or select "Use gallery only").
3. ⚠️ **Select your Plant Type** from the secure dropdown immediately under the camera viewer so the AI focuses!
4. **Capture!** Wait a few moments as the image transmits to your local ML Backend.
5. Review the **Description & Treatment** texts uniquely gathered for your plant.

## Troubleshooting

- **Backend Offline Warning**: If the frontend pops an error about the LLM backend being offline, it means you closed the terminal from **Step 1**, forgot to run `source venv/bin/activate`, or port `8000` is blocked.
- **Camera Black Screen**: Make sure you use `http://localhost:8765` and not a `file:///` path to ensure WebRTC camera security accepts your session!



# use this to run
cd ~/MY_PLANT_LLM/MY_PLANT
./run_offline.sh
# and open it on 
http://localhost:8765