import os
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, '../backend/models/leaf_model.h5'))
TFJS_OUTPUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '../frontend/www/tfjs_model'))

def export_model():
    """
    Converts a saved Keras H5 model into a TensorFlow.js format for offline browser inference.
    Requires: pip install tensorflowjs
    """
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}")
        print("Please run train.py first to generate the model.")
        return

    print("Converting model to TensorFlow.js format...")
    
    # Creates the output directory if it doesn't exist
    os.makedirs(TFJS_OUTPUT_DIR, exist_ok=True)

    try:
        subprocess.run([
            "tensorflowjs_converter",
            "--input_format=keras",
            MODEL_PATH,
            TFJS_OUTPUT_DIR
        ], check=True)
        print(f"Successfully converted model to TF.js format.")
        print(f"Output directory: {TFJS_OUTPUT_DIR}")
        print("You can now load this model in the frontend using tf.loadLayersModel('tfjs_model/model.json').")
    except FileNotFoundError:
        print("Error: tensorflowjs_converter not found.")
        print("Please install it using: 'pip install tensorflowjs'")
    except subprocess.CalledProcessError as e:
        print(f"Conversion failed with error: {e}")

if __name__ == "__main__":
    export_model()
