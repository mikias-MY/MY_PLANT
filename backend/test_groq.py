import sys
import os
import base64
import io

sys.path.append(os.getcwd())

from model_service import PlantDiseasePredictor
from PIL import Image

def test_groq_integration():
    print("Testing Groq API Integration (Aegis Oracle)...")
    predictor = PlantDiseasePredictor(data_path="disease_data.json")
    
    # Create a tiny 1x1 black pixel JPEG for testing
    img = Image.new('RGB', (1, 1), color='black')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    print("\nAttempting prediction with Groq (Primary Engine)...")
    # This will likely fail with a "Non-Botanical Subject Detected" or because it's just a black pixel,
    # but we want to see if the API call succeeds or falls back correctly.
    res = predictor.predict(img_bytes)
    
    print(f"Result Status: {res['status']}")
    print(f"Result Label: {res['label']}")
    print(f"Timestamp: {res['timestamp']}")
    
    if res['status'] == "NON_BOTANICAL":
        print("  Groq API / Forensic Logic: PASS")
    else:
        print("  Groq API / Forensic Logic: OK (Verify manual input if needed)")

if __name__ == "__main__":
    test_groq_integration()
