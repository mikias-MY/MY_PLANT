# MY Plant App - Offline Botanical Diagnostics

MY Plant is a mobile-first web application enabling offline-capable plant disease detection using a TensorFlow convolutional neural network and a Python backend API.

## Project Structure

```
MY_PLANT/
├── backend/
│   ├── app.py             # Flask API serving predictions
│   ├── inference.py       # TensorFlow model loading & prediction logic
│   ├── disease_db.json    # PlantDoc-style mapping of labels to symptoms/treatments
│   └── models/            # Directory to store the trained .h5 and class names
├── frontend/
│   └── www/               # Mobile-first web interface
│       ├── index.html     
│       ├── style.css      
│       ├── app.js         
│       └── tfjs_model/    # Output directory for the TF.js exported model
├── scripts/
│   ├── train.py           # Builds and trains the Keras CNN
│   └── export_tfjs.py     # Converts the .h5 model to a TF.js browser-ready format
└── README.md
```

## Setup & Training Pipeline

1. **Prepare Dataset**: Ensure your `plant_dataset` directory is physically located at `~/MY_PLANT_LLM/plant_dataset` containing subfolders for each class (e.g., `Healthy`, `Apple___Apple_scab`).
2. **Environment & Dependencies**: Ensure Python 3.9+ and pip are installed.
   ```bash
   # Recommended: Create a virtual environment first
   python3 -m venv venv
   source venv/bin/activate
   pip install tensorflow flask flask-cors Pillow numpy
   ```
3. **Train Model**: Run the training script.
   ```bash
   cd ~/MY_PLANT_LLM/MY_PLANT/scripts
   python3 train.py
   ```
4. **(Optional) Export to TF.js**: To run inference entirely inside the browser without Python:
   ```bash
   pip install tensorflowjs
   python3 export_tfjs.py
   ```

## Running the Application

Serving the Flask API now handles both formatting images, inference, and serving the frontend UI natively!

```bash
cd ~/MY_PLANT_LLM/MY_PLANT/backend
python3 app.py
```
*The server will start on `http://127.0.0.1:5000`.*

Open a web browser and visit: `http://localhost:5000` to interact with the MY Plant application. 
*(For testing on mobile, ensure your phone and computer are on the same WiFi network, and navigate to your computer's local IP address, e.g., `http://192.168.1.X:5000`).*

## Extending the Diagnostic Database

You can manually map new model output classes to detailed symptoms by modifying `backend/disease_db.json`. Ensure the JSON key matches the exact class folder name from your training set.


# use this to run 

cd ~/MY_PLANT_LLM/MY_PLANT/scripts
../start.sh  # Or just python3 train.py once TF is ready
