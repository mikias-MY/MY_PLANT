import io
import os
import sys

backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from plant_validator import PlantValidator, NotAPlantError
from PIL import Image

def test_heuristic_green_image():
    """A green image should pass heuristic validation."""
    validator = PlantValidator()
    
    # Create a green image (simulating a plant leaf)
    green_img = Image.new('RGB', (200, 200), (50, 150, 50))
    buf = io.BytesIO()
    green_img.save(buf, format='JPEG')
    green_bytes = buf.getvalue()
    
    try:
        result = validator.validate_image(green_bytes)
        print(f"PASS: Green image correctly validated as plant (result={result})")
    except NotAPlantError as e:
        print(f"FAIL: Green image wrongly rejected: {e}")
    except Exception as e:
        print(f"FAIL: Unexpected exception: {e}")

def test_heuristic_black_image():
    """A solid black image should be rejected (no green)."""
    validator = PlantValidator()
    
    black_img = Image.new('RGB', (200, 200), (0, 0, 0))
    buf = io.BytesIO()
    black_img.save(buf, format='JPEG')
    black_bytes = buf.getvalue()
    
    try:
        validator.validate_image(black_bytes)
        print("FAIL: Expected NotAPlantError for black square but none raised.")
    except NotAPlantError as e:
        print(f"PASS: Correctly rejected non-plant (black): {e}")
    except Exception as e:
        print(f"FAIL: Unexpected exception: {e}")

def test_heuristic_red_image():
    """A solid red image should be rejected (no green dominance)."""
    validator = PlantValidator()
    
    red_img = Image.new('RGB', (200, 200), (200, 30, 30))
    buf = io.BytesIO()
    red_img.save(buf, format='JPEG')
    red_bytes = buf.getvalue()
    
    try:
        validator.validate_image(red_bytes)
        print("FAIL: Expected NotAPlantError for red image but none raised.")
    except NotAPlantError as e:
        print(f"PASS: Correctly rejected non-plant (red): {e}")
    except Exception as e:
        print(f"FAIL: Unexpected exception: {e}")

def test_real_plant_image():
    """Test with an actual plant image if available."""
    validator = PlantValidator()
    
    plant_img_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "PLANT-DISEASE-CLASSIFIER-WEB-APP-TENSORFLOWJS", "test-dataset", "PotatoHealthy1.jpg"
    )
    
    if os.path.exists(plant_img_path):
        with open(plant_img_path, "rb") as f:
            plant_bytes = f.read()
        try:
            validator.validate_image(plant_bytes)
            print("PASS: Correctly identified real plant image.")
        except NotAPlantError as e:
            print(f"FAIL: Wrongly rejected plant image: {e}")
    else:
        print(f"SKIPPED: Plant image not found at {plant_img_path}")

if __name__ == "__main__":
    print("=== Plant Validator Tests (MediaPipe-compatible) ===\n")
    test_heuristic_green_image()
    test_heuristic_black_image()
    test_heuristic_red_image()
    test_real_plant_image()
    print("\n=== Done ===")
