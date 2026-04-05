import io
import os
import sys

backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from plant_validator import PlantValidator, NotAPlantError
from PIL import Image

def test_real_validation():
    validator = PlantValidator()
    
    print("Testing with real plant image...")
    plant_img_path = "/home/mikodereje03/MY_PLANT/PLANT-DISEASE-CLASSIFIER-WEB-APP-TENSORFLOWJS/test-dataset/PotatoHealthy1.jpg"
    if os.path.exists(plant_img_path):
        with open(plant_img_path, "rb") as f:
            plant_bytes = f.read()
        try:
            validator.validate_image(plant_bytes)
            print("PASS: Correctly identified plant image.")
        except NotAPlantError as e:
            print(f"FAIL: Wrongly rejected plant image: {e}")
    else:
        print(f"SKIPPED: Plant image not found at {plant_img_path}")

    print("\nTesting with non-plant image (black square)...")
    
    black_img = Image.new('RGB', (200, 200), (0, 0, 0))
    buf = io.BytesIO()
    black_img.save(buf, format='JPEG')
    non_plant_bytes = buf.getvalue()
    
    try:
        validator.validate_image(non_plant_bytes)
        print("FAIL: Expected NotAPlantError for black square but none raised.")
    except NotAPlantError as e:
        print(f"PASS: Correctly rejected non-plant: {e}")
    except Exception as e:
        print(f"FAIL: Unexpected exception: {e}")

if __name__ == "__main__":
    test_real_validation()
