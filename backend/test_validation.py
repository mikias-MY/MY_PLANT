import io
from plant_validator import PlantValidator, NotAPlantError

def test_validation():
    validator = PlantValidator()
    
    
    print("Testing PlantValidator logic...")
    
    from unittest.mock import MagicMock
    from PIL import Image

    # Case 1: Mocking a "Non-Plant" detection
    class MockModel:
        def __init__(self):
            self.names = {0: 'person', 1: 'car'}
        def __call__(self, img, verbose=False):
            class MockBox:
                def __init__(self, cls):
                    self.cls = [cls]
            class MockResult:
                def __init__(self):
                    self.boxes = [MockBox(0), MockBox(1)]
            return [MockResult()]

    original_load = validator._load_model
    validator._load_model = lambda: True
    validator.model = MockModel()
    
    # Mock Image.open to avoid actually reading bytes
    original_image_open = Image.open
    Image.open = MagicMock(return_value=Image.new('RGB', (10, 10)))
    
    try:
        validator.validate_image(b"dummy_bytes")
        print("FAIL: Expected NotAPlantError for 'person/car' but none raised.")
    except NotAPlantError as e:
        print(f"PASS: Correctly caught non-plant: {e}")
    except Exception as e:
        print(f"FAIL: Unexpected exception: {e}")

    class MockModelPlant:
        def __init__(self):
            self.names = {2: 'potted plant'}
        def __call__(self, img, verbose=False):
            class MockBox:
                def __init__(self, cls):
                    self.cls = [cls]
            class MockResult:
                def __init__(self):
                    self.boxes = [MockBox(2)]
            return [MockResult()]
    
    validator.model = MockModelPlant()
    
    try:
        validator.validate_image(b"dummy_bytes")
        print("PASS: Correctly validated plant image.")
    except NotAPlantError as e:
        print(f"FAIL: Unexpected NotAPlantError for 'potted plant': {e}")
    except Exception as e:
        print(f"FAIL: Unexpected exception: {e}")

    # Restore original
    validator._load_model = original_load
    Image.open = original_image_open

if __name__ == "__main__":
    test_validation()
