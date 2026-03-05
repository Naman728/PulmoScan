"""
Prediction functions for CT Scan and X-Ray images.
Preprocesses image, runs model, returns label and confidence.
"""
import os
import numpy as np
from PIL import Image

# Image sizes
CT_SIZE = (224, 224)
XRAY_SIZE = (299, 299)

# Labels
CT_LABELS = ["Normal", "Stroke", "Tumor", "Hemorrhage"]
XRAY_LABELS = ["Normal", "Pneumonia", "Tuberculosis", "Covid"]


def _preprocess_image(image_path: str, target_size: tuple, normalize_imagenet: bool = False) -> np.ndarray:
    """Load image with Pillow, resize, convert to RGB, normalize to [0,1] or ImageNet stats."""
    img = Image.open(image_path).convert("RGB")
    img = img.resize(target_size, Image.Resampling.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0
    if normalize_imagenet:
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
    return arr


def predict_ct_scan(image_path: str) -> dict:
    """
    Run CT scan model on a single image.
    Returns {"prediction": str, "confidence": float}.
    """
    from app.ai_models.model_loader import ct_model

    if ct_model is None:
        return {"prediction": "Model not available", "confidence": 0.0}

    if not image_path or not os.path.isfile(image_path):
        return {"prediction": "Error: No image file", "confidence": 0.0}

    try:
        arr = _preprocess_image(image_path, CT_SIZE, normalize_imagenet=True)
        import torch
        x = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).float()

        with torch.no_grad():
            out = ct_model(x)
            if isinstance(out, (list, tuple)):
                out = out[0]
            # CTBrainModel returns (B, 7); use first 4 heads for our 4-class labels
            if hasattr(out, "shape") and out.dim() >= 2 and out.shape[1] > len(CT_LABELS):
                out = out[:, : len(CT_LABELS)]
            probs = torch.softmax(out, dim=1)
            prob, idx = probs.max(1)
            idx = idx.item()
            conf = prob.item()
        label = CT_LABELS[idx] if 0 <= idx < len(CT_LABELS) else CT_LABELS[0]
        return {"prediction": label, "confidence": round(conf, 4)}
    except Exception as e:
        return {"prediction": f"Error: {str(e)}", "confidence": 0.0}


def predict_ct_scan_multi(image_paths: list) -> dict:
    """
    Run CT model on multiple slices. Returns individual slice results and
    an aggregated final diagnosis (majority vote + average confidence).
    """
    from app.ai_models.model_loader import ct_model

    if ct_model is None:
        return {
            "slice_results": [],
            "final_diagnosis": "Model not available",
            "final_confidence": 0.0,
            "total_slices": 0,
            "error": "CT model not loaded",
        }

    if not image_paths:
        return {
            "slice_results": [],
            "final_diagnosis": "No images uploaded",
            "final_confidence": 0.0,
            "total_slices": 0,
            "error": "No image uploaded",
        }

    slice_results = []
    for i, path in enumerate(image_paths):
        if not path or not os.path.isfile(path):
            slice_results.append({
                "slice_index": i + 1,
                "prediction": "Error: Missing or invalid file",
                "confidence": 0.0,
            })
            continue
        try:
            result = predict_ct_scan(path)
            slice_results.append({
                "slice_index": i + 1,
                "prediction": result["prediction"],
                "confidence": result["confidence"],
            })
        except Exception as e:
            slice_results.append({
                "slice_index": i + 1,
                "prediction": f"Error: {str(e)}",
                "confidence": 0.0,
            })

    # Aggregate: majority vote for final diagnosis, average confidence
    valid = [s for s in slice_results if s["confidence"] > 0 and not str(s["prediction"]).startswith("Error")]
    if not valid:
        return {
            "slice_results": slice_results,
            "final_diagnosis": "Analysis failed for all slices",
            "final_confidence": 0.0,
            "total_slices": len(image_paths),
        }

    from collections import Counter
    labels = [s["prediction"] for s in valid]
    majority = Counter(labels).most_common(1)[0][0]
    avg_conf = sum(s["confidence"] for s in valid) / len(valid)
    # For final confidence, use average of confidences for slices that voted for majority
    majority_slices = [s for s in valid if s["prediction"] == majority]
    final_conf = sum(s["confidence"] for s in majority_slices) / len(majority_slices) if majority_slices else avg_conf

    return {
        "slice_results": slice_results,
        "final_diagnosis": majority,
        "final_confidence": round(final_conf, 4),
        "total_slices": len(image_paths),
    }


def predict_xray(image_path: str) -> dict:
    """
    Run X-Ray model on image.
    Returns {"prediction": str, "confidence": float}.
    """
    from app.ai_models.model_loader import xray_model

    if xray_model is None:
        return {"prediction": "Model not available", "confidence": 0.0}

    try:
        arr = _preprocess_image(image_path, XRAY_SIZE, normalize_imagenet=False)
        x = np.expand_dims(arr, axis=0)

        preds = xray_model.predict(x, verbose=0)
        if isinstance(preds, list):
            preds = preds[0]
        probs = np.squeeze(preds)
        if probs.ndim == 0:
            probs = np.array([1.0 - probs, probs])
        idx = int(np.argmax(probs))
        conf = float(probs[idx])
        label = XRAY_LABELS[idx] if 0 <= idx < len(XRAY_LABELS) else XRAY_LABELS[0]
        return {"prediction": label, "confidence": round(conf, 4)}
    except Exception as e:
        return {"prediction": f"Error: {str(e)}", "confidence": 0.0}
