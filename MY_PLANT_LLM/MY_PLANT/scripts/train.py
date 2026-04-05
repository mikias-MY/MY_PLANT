import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Rescaling
import os
import json

# Define absolute paths based on the project structure
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ORIGINAL_DATASET_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '../../plant_dataset'))
DATASET_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '../backend/training_data'))
MODEL_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '../backend/models'))
MODEL_SAVE_PATH = os.path.join(MODEL_DIR, 'leaf_model.h5')
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, 'class_names.json')

IMG_HEIGHT = 224
IMG_WIDTH = 224
BATCH_SIZE = 32
EPOCHS = 10

def create_model(num_classes):
    """
    Creates a simple Convolutional Neural Network for image classification.
    """
    model = Sequential([
        Rescaling(1./255, input_shape=(IMG_HEIGHT, IMG_WIDTH, 3)),
        Conv2D(32, 3, padding='same', activation='relu'),
        MaxPooling2D(),
        Conv2D(64, 3, padding='same', activation='relu'),
        MaxPooling2D(),
        Conv2D(128, 3, padding='same', activation='relu'),
        MaxPooling2D(),
        Flatten(),
        Dense(128, activation='relu'),
        Dropout(0.5),
        Dense(num_classes, activation='softmax')
    ])
    
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model

def prepare_flat_dataset():
    if not os.path.exists(ORIGINAL_DATASET_DIR):
        print(f"Original dataset not found at {ORIGINAL_DATASET_DIR}")
        return False
        
    os.makedirs(DATASET_DIR, exist_ok=True)
    print("Preparing flattened dataset for TensorFlow via symlinks to ensure 'coffee' and nested items are read correctly...")
    for root, dirs, files in os.walk(ORIGINAL_DATASET_DIR):
        image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if image_files:
            class_name = os.path.basename(root)
            parent_name = os.path.basename(os.path.dirname(root))
            
            if parent_name != "plant_dataset":
                class_name = f"{parent_name}___{class_name}".replace(" ", "_")
                
            target_class_dir = os.path.join(DATASET_DIR, class_name)
            os.makedirs(target_class_dir, exist_ok=True)
            
            for file in image_files:
                src_file_path = os.path.join(root, file)
                dst_file_path = os.path.join(target_class_dir, file)
                if not os.path.exists(dst_file_path):
                    try:
                        os.symlink(os.path.abspath(src_file_path), dst_file_path)
                    except OSError:
                        import shutil
                        shutil.copy2(src_file_path, dst_file_path)
    return True

def main():
    if not prepare_flat_dataset():
        print("Please place the dataset images in this location (organized by subfolders representing classes).")
        return

    print(f"Loading dataset from: {DATASET_DIR}")
    
    # Create dataset generators for training and validation
    train_ds = tf.keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=(IMG_HEIGHT, IMG_WIDTH),
        batch_size=BATCH_SIZE
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=(IMG_HEIGHT, IMG_WIDTH),
        batch_size=BATCH_SIZE
    )

    class_names = train_ds.class_names
    print(f"Found {len(class_names)} classes: {class_names}")

    # Ensure model directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Save class names for the backend inference and TF.js
    with open(CLASS_NAMES_PATH, 'w') as f:
        json.dump(class_names, f)
    print(f"Saved class names to {CLASS_NAMES_PATH}")

    # Build and summarize model
    model = create_model(len(class_names))
    model.summary()

    # Train the model
    print("Starting training...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS
    )

    # Save the trained model
    model.save(MODEL_SAVE_PATH)
    print(f"Training completed. Model saved to {MODEL_SAVE_PATH}")

if __name__ == "__main__":
    main()
