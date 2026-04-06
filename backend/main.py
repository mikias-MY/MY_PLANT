from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from model_service import PlantDiseasePredictor
import uvicorn

app = FastAPI(title="MY Plant Disease Detection API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Predictor
predictor = PlantDiseasePredictor()

@app.get("/")
async def root():
    return {"message": "MY Plant Backend is running", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "ResNet-50 (Simulated)"}

@app.post("/predict")
async def predict_disease(file: UploadFile = File(...), plant_type: str = Form("Unknown", alias="plantType"), language: str = Form("en")):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    
    try:
        content = await file.read()
        prediction_result = predictor.predict(content, plant_type, language)
        return prediction_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/history")
async def get_scan_history(limit: int = 10):
    return predictor.get_history(limit=limit)

@app.delete("/history")
async def clear_scan_history():
    predictor.clear_history()
    return {"message": "History cleared"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
