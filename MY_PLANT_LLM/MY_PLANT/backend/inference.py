import os
import json
import numpy as np
from PIL import Image

try:
    import tensorflow as tf
except ImportError:
    tf = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'leaf_model.h5')
CLASS_NAMES_PATH = os.path.join(SCRIPT_DIR, 'models', 'class_names.json')

IMG_SIZE = (224, 224)

# Global variables for caching
model = None
class_names = []

def load_model():
    """
    Loads the trained model into memory dynamically only when needed.
    """
    global model, class_names
    if tf is None or not os.path.exists(MODEL_PATH) or not os.path.exists(CLASS_NAMES_PATH):
        print("WARNING: TensorFlow or the model .h5 file is missing. Using MOCK inference mode for demo purposes.")
        return False

    if model is None:
        model = tf.keras.models.load_model(MODEL_PATH)
        with open(CLASS_NAMES_PATH, 'r') as f:
            class_names = json.load(f)
            
    return True

def predict_image(image_bytes, plant_type="Unknown"):
    """
    Given the raw bytes of an image, preprocesses it, runs model inference, 
    and returns a dictionary containing the label and confidence score.
    Strictly adheres to the user-provided plant_type if available.
    """
    has_model = load_model()
    
    if not has_model:
        # Fallback to simulated prediction while TensorFlow sets up
        import random
        demo_classes = ["Healthy", "Tomato___Bacterial_spot", "Apple___Apple_scab", "Potato___Late_blight", "Unknown", "coffee_dataset___leaf_rust", "coffee_dataset___phoma"]
        
        # Enforce user trust
        if plant_type and plant_type.lower() != "unknown":
            filtered = [c for c in demo_classes if plant_type.lower() in c.lower() or c == "Healthy"]
            demo_label = random.choice(filtered) if filtered else random.choice(demo_classes)
        else:
            demo_label = random.choice(demo_classes)
            
        return {
            "label": demo_label,
            "is_healthy": "healthy" in demo_label.lower(),
            "confidence": 0.85 + (random.random() * 0.14)
        }
        
    # Preprocess image
    from io import BytesIO
    img = Image.open(BytesIO(image_bytes)).convert('RGB')
    img = img.resize(IMG_SIZE)
    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0) # Add batch dimension
    
    predictions = model.predict(img_array)
    
    # Determine the confidence vector properly based on the model's last layer
    if not hasattr(model.layers[-1], 'activation') or model.layers[-1].activation.__name__ != 'softmax':
        confidence_scores = tf.nn.softmax(predictions[0])
    else:
        confidence_scores = predictions[0]

    # TRUST THE USER: Restrict output exclusively to the selected plant type if provided
    valid_indices = []
    if plant_type and plant_type.lower() != "unknown":
        for i, cls_name in enumerate(class_names):
            if plant_type.lower() in cls_name.lower() or "healthy" in cls_name.lower():
                valid_indices.append(i)
                
    # If no matches found or user didn't specify, allow all classes
    if not valid_indices:
        valid_indices = list(range(len(class_names)))

    # Find the maximum confidence score ONLY among valid indices allowed by the user
    best_index = max(valid_indices, key=lambda idx: confidence_scores[idx])
    
    disease_label = class_names[best_index]
    confidence = float(confidence_scores[best_index])
    
    # Healthy vs Diseased heuristic
    # Assumes your class names have "healthy" in them if it represents a healthy leaf.
    is_healthy = "healthy" in disease_label.lower()

    return {
        "label": disease_label,
        "is_healthy": is_healthy,
        "confidence": confidence
    }
