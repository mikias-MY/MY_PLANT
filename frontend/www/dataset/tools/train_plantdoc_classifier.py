#!/usr/bin/env python3
"""
Train a small image classifier from Hugging Face PlantDoc detection data and export to TensorFlow.js.

The HF dataset provides images + bounding boxes + category names. This script:
  1) Loads agyaatcoder/PlantDoc
  2) Crops each annotated leaf to a square patch (saved in memory / optional cache dir)
  3) Trains a MobileNetV2-based head for N classes
  4) Exports SavedModel + tensorflowjs converter output

Run (after pip install -r requirements-train.txt):
  python train_plantdoc_classifier.py --epochs 8 --out-dir ./export

Then copy export/web_model/* to ../../tensorflowjs-model/ and write class_indices.json
matching label order in model.layers[-1].output shape.

This is intentionally a starting point: tune augmentation, class weights, and validation split.
"""

import argparse
import json
import os

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--out-dir", type=str, default="./plantdoc_export")
    args = parser.parse_args()

    try:
        import tensorflow as tf
        from datasets import load_dataset
    except ImportError as e:
        raise SystemExit(
            "Missing dependency. Create a venv and run: pip install -r requirements-train.txt\n" + str(e)
        )

    os.makedirs(args.out_dir, exist_ok=True)
    print("Loading dataset (first run downloads ~1GB)...")
    ds = load_dataset("agyaatcoder/PlantDoc", split="train")

    # Build class list from all object categories
    cats = set()
    for row in ds:
        for c in row["objects"]["category"]:
            cats.add(c)
    labels = sorted(cats)
    label_to_idx = {l: i for i, l in enumerate(labels)}
    print(f"Found {len(labels)} classes:", labels[:5], "...")

    # NOTE: Full training loop with proper crop + batching belongs here.
    # Placeholder writes manifest only so the pipeline is documented.
    manifest = {
        "num_classes": len(labels),
        "labels": labels,
        "epochs_requested": args.epochs,
        "message": "Implement dataset.map(crop) + tf.data + model.fit, then tensorflowjs.converters.save_keras_model.",
    }
    with open(os.path.join(args.out_dir, "train_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote {args.out_dir}/train_manifest.json — extend this script to complete training.")


if __name__ == "__main__":
    main()
