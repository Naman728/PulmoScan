# X-Ray Model (InceptionResNetV2)

## Requirements

- **TensorFlow** (for X-ray only): `pip install tensorflow` or `pip install -r requirements.txt`
- Model file: `model.inceptionresnetv2.h5` in `app/ai_models/` or project root `ai_models/`

## File location

The loader looks for (in order):

1. `app/ai_models/model.inceptionresnetv2.h5`
2. `app/ai_models/xray_model.h5` or `app/ai_models/model.h5`
3. `ai_models/model.inceptionresnetv2.h5` (project root)

## Loading

- Model is loaded once on first X-ray prediction and cached (same as CT/Brain).
- Uses `compile=False` for TensorFlow 2.16+ compatibility with saved .h5.
- If full model load fails, a weights-only fallback (InceptionResNetV2 + load_weights) is tried.

## Preprocessing (in predict.py)

- Image: RGB, 256×256, scale 0–1, then sample-wise mean/std normalization.
- Output: `prediction`, `confidence`, `conditions` (per-class probability and status).
