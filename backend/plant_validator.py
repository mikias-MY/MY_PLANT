import io
import os
from PIL import Image
import numpy as np

try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

class NotAPlantError(Exception):
    """Custom exception raised when no plant is detected in the image."""
    pass

class PlantValidator:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), 'efficientdet_lite0.tflite')
        self.detector = None
        if MEDIAPIPE_AVAILABLE and os.path.exists(self.model_path):
            try:
                base_options = python.BaseOptions(model_asset_path=self.model_path)
                options = vision.ObjectDetectorOptions(base_options=base_options, score_threshold=0.3)
                self.detector = vision.ObjectDetector.create_from_options(options)
                print(f"MediaPipe Validator initialized with {self.model_path}")
            except Exception as e:
                print(f"Failed to initialize MediaPipe: {e}")
                self.detector = None
        else:
            if not MEDIAPIPE_AVAILABLE:
                print("MediaPipe not available. Using heuristic validation.")
            if not os.path.exists(self.model_path):
                print(f"Model file {self.model_path} not found. Using heuristic validation.")

    def validate_image(self, image_bytes):
        """
        Validate if the image contains a plant.
        Raises NotAPlantError if no plant is detected.
        """
        # 1. Advanced Recognition (MediaPipe)
        if self.detector:
            try:
                # Convert bytes to MediaPipe Image
                pil_img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
                numpy_img = np.array(pil_img)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=numpy_img)
                
                detection_result = self.detector.detect(mp_image)
                
                # Check for plant-related labels in COCO/EfficientDet
                plant_keywords = [
                    'plant', 'flower', 'tree', 'leaf', 'potted plant', 'vase',
                    'vegetable', 'fruit', 'broccoli', 'carrot', 'banana', 'apple', 'orange'
                ]
                
                found_plant = False
                for detection in detection_result.detections:
                    for category in detection.categories:
                        label = category.category_name.lower()
                        print(f"Detected: {label} ({category.score:.2f})")
                        if any(kw in label for kw in plant_keywords):
                            found_plant = True
                            break
                    if found_plant: break
                
                if found_plant:
                    return True
                else:
                    # If MediaPipe runs but finds nothing, we check heuristics before failing
                    if self._heuristic_check(image_bytes):
                        return True
                    raise NotAPlantError("Error: No plant detected in the image.")
                    
            except NotAPlantError:
                raise
            except Exception as e:
                print(f"MediaPipe detection failed: {e}. Falling back to heuristic.")

        # 2. Heuristic/Fallback Validation
        if self._heuristic_check(image_bytes):
            return True
            
        raise NotAPlantError("Error: No plant detected in the image.")

    def _heuristic_check(self, image_bytes):
        """
        Fallback logic: check for 'green' dominance or other botanical indicators.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img = img.resize((100, 100)) # Resize for speed
            img_rgb = img.convert('RGB')
            
            pixels = list(img_rgb.getdata())
            greenish_pixels = 0
            for r, g, b in pixels:
                
                if g > r * 1.1 and g > b * 1.1:
                    greenish_pixels += 1
            
            green_ratio = greenish_pixels / len(pixels)
            print(f"Heuristic Green Ratio: {green_ratio:.2f}")
            
            
            return green_ratio > 0.10
        except Exception as e:
            print(f"Heuristic check failed: {e}")
            return True 