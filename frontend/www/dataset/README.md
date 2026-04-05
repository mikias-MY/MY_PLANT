# Dataset layer (PlantDoc + model bridge)

This folder ships **structured knowledge** from the **PlantDoc** research dataset (real-world leaves, bounding-box labels, APS-guided curation) while the app’s default **neural network** is still the bundled **PlantVillage 38-class** MobileNet export.

## What is included

| File | Purpose |
|------|---------|
| `plantdoc/plantdoc_classes.json` | All **29 PlantDoc leaf categories** with crop, pathogen/condition type, symptoms, management hints, and approximate image counts. |
| `plantdoc/plantdoc_village_map.json` | Maps each **PlantVillage** label string to the closest PlantDoc `id` (or `null`). |
| `plantdoc/dataset_manifest.json` | Paper metadata, license (CC BY 4.0), DOI, splits, and links to Hugging Face / upstream repos. |
| `plantdoc/plantdoc_locale.json` | Amharic, Afaan Oromo, and Arabic strings for every PlantDoc class (symptoms, management, labels). Generated with `tools/build_plantdoc_locale.py`. |
| `plantdoc/plantdoc_source_index.json` | Maps each class `id` to folder names used in the **PlantDoc-Dataset** checkout (`test/…`, `train/…`). |

The UI uses this to **enrich scan results** and powers the **PlantDoc library** screen.

### Full image folder on disk

If you have **`MY_PLANT/PlantDoc-Dataset`** (classification folders with train/test images), the app exposes it via a symlink at **`frontend/plantdoc-dataset/`** (create with `ln -sfn ../PlantDoc-Dataset frontend/plantdoc-dataset` from `frontend/`). Then open e.g. `http://localhost:8080/plantdoc-dataset/test/Apple%20Scab%20Leaf/…` while serving from `frontend/`.

## Using the full Hugging Face dataset (optional)

The parquet mirror `agyaatcoder/PlantDoc` on Hugging Face contains **images + bounding boxes + category strings** (~900 MB downloaded). You typically:

1. Create a Python virtual environment.
2. `pip install datasets tensorflow tensorflowjs` (versions pinned in `tools/requirements-train.txt`).
3. Run `tools/train_plantdoc_classifier.py` (see script header) to crop leaves, train a classifier, and export a new `tensorflowjs-model/` + `class_indices.json`.

After export, replace the files under `frontend/tensorflowjs-model/` and update `frontend/class_indices.json` and `frontend/model_config.json` to match your new class count.

## License

Respect **CC BY 4.0** for PlantDoc: keep attribution (authors, paper, license) when redistributing data or derivatives.
