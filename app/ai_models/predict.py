"""
Prediction functions for CT Scan and X-Ray images.
Uses model singletons from model_loader (loaded once at startup).
Preprocesses image, runs model, returns label and confidence.
"""
import logging
import os
from typing import Optional

import numpy as np
from PIL import Image
try:
    import torchvision.transforms as transforms
except ImportError:
    transforms = None

logger = logging.getLogger(__name__)

# Image sizes
CT_SIZE = (224, 224)
XRAY_SIZE = (256, 256)  # Match training: InceptionResNetV2 X-ray model expects 256x256

# Labels
CT_LABELS = ["Normal", "Stroke", "Tumor", "Hemorrhage"]
XRAY_LABELS = ["Normal", "Pneumonia", "Tuberculosis", "Covid"]

# Epsilon for sample-wise std normalization (avoid division by zero)
XRAY_STD_EPS = 1e-7


def _preprocess_xray(image_path: str) -> np.ndarray:
    """
    Preprocess X-ray image to match training ImageDataGenerator / sample-wise normalization.
    - Load with PIL, convert to RGB.
    - Resize to 256x256 using LANCZOS.
    - Rescale by 1/255, then sample-wise center and std normalize.
    Returns array of shape (1, 256, 256, 3).
    """
    img = Image.open(image_path).convert("RGB")
    img = img.resize(XRAY_SIZE, Image.LANCZOS)
    img = np.array(img, dtype=np.float32) / 255.0
    img = (img - np.mean(img)) / (np.std(img) + XRAY_STD_EPS)
    return np.expand_dims(img, axis=0)


def _load_xray_thresholds() -> dict:
    """Load per-class optimal thresholds from pulmoscans_model2_thresholds.json."""
    import json
    _base = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(_base, "pulmoscans_model2_thresholds.json")
    default = {label: 0.5 for label in XRAY_LABELS}
    if not os.path.isfile(path):
        return default
    try:
        with open(path, "r") as f:
            data = json.load(f)
        for label in XRAY_LABELS:
            if label in data and isinstance(data[label], (int, float)):
                default[label] = float(data[label])
        return default
    except Exception:
        return default


def _preprocess_image(image_path: str, target_size: tuple, normalize_imagenet: bool = False):
    """Load image with Pillow, resize, convert to RGB, and return torch Tensor (C, H, W)."""
    img = Image.open(image_path).convert("RGB")
    if transforms is not None:
        transform_list = [
            transforms.Resize(target_size),
            transforms.ToTensor()
        ]
        if normalize_imagenet:
            transform_list.append(transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]))
        transform = transforms.Compose(transform_list)
        tensor = transform(img)
        logger.info("Image tensor shape: %s", list(tensor.shape))
        if normalize_imagenet:
            logger.info("Normalization values: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]")
        return tensor
    else:
        # Fallback if torchvision is somehow missing
        img = img.resize(target_size, Image.Resampling.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0
        if normalize_imagenet:
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            arr = (arr - mean) / std
        import torch
        return torch.from_numpy(arr).permute(2, 0, 1)


def _empty_ct_scan_result(prediction: str, confidence: float) -> dict:
    """Full result shape with empty explainability fields (used on error or when explainability is skipped)."""
    return {
        "prediction": prediction,
        "confidence": confidence,
        "conditions": [],
        "regions_found": 0,
        "feature_scores": {},
        "feature_analysis": {},
        "gradcam": "",
        "heatmap": "",
        "deviation_map": "",
        "normal_reference": "",
        "regions": [],
        "patient_ct": "",
        "region_visualization": "",
    }


def predict_ct_scan(image_path: str, output_dir: Optional[str] = None) -> dict:
    """
    Run CT scan model on a single image (uses singleton, no reload).
    Returns a complete structured dict: prediction, confidence, regions_found,
    feature_scores, feature_analysis, gradcam, heatmap, deviation_map, normal_reference, regions.
    Explainability runs only when output_dir is provided (e.g. outputs/{scan_id}/); otherwise paths are empty.
    """
    from app.ai_models.model_loader import get_ct_model
    import torch

    model = get_ct_model()
    if model is None:
        logger.error("CT prediction skipped: model not loaded")
        return _empty_ct_scan_result("Model not available", 0.0)

    if not image_path or not os.path.isfile(image_path):
        logger.warning("CT prediction skipped: invalid or missing image path")
        return _empty_ct_scan_result("Error: No image file", 0.0)

    logger.info("CT prediction start: %s", image_path)
    try:
        tensor = _preprocess_image(image_path, CT_SIZE, normalize_imagenet=True)
        x = tensor.unsqueeze(0).float()

        model.eval()
        with torch.no_grad():
            out = model(x)
            if isinstance(out, (list, tuple)):
                out = out[0]
            if hasattr(out, "shape") and out.dim() >= 2 and out.shape[1] > len(CT_LABELS):
                out = out[:, : len(CT_LABELS)]
            probs = torch.softmax(out, dim=1)
            prob, idx = probs.max(1)
            idx = idx.item()
            conf = prob.item()
        label = CT_LABELS[idx] if 0 <= idx < len(CT_LABELS) else CT_LABELS[0]
        logger.info("CT prediction result: %s (confidence=%.4f)", label, conf)
        confidence = round(conf, 4)
        probabilities = probs.squeeze().cpu().numpy()
        logger.info("CT probabilities: %s", probabilities)
        conditions = []
        for i, label_name in enumerate(CT_LABELS):
            conditions.append({
                "label": label_name,
                "probability": round(float(probabilities[i]) if i < len(probabilities) else 0.0, 4),
            })
    except Exception as e:
        logger.exception("CT prediction failed: %s", e)
        return _empty_ct_scan_result(f"Error: {str(e)}", 0.0)

    analysis = None
    if output_dir:
        try:
            from app.ai_models.explainability import run_ct_explainability
            analysis = run_ct_explainability(image_path, label, confidence, output_dir=output_dir)
        except Exception as e:
            logger.debug("CT explainability failed: %s", e)

    if analysis is None:
        return {
            "prediction": label,
            "confidence": confidence,
            "conditions": conditions,
            "regions_found": 0,
            "feature_scores": {},
            "feature_analysis": {},
            "gradcam": "",
            "heatmap": "",
            "deviation_map": "",
            "normal_reference": "",
            "regions": [],
            "patient_ct": "",
            "region_visualization": "",
        }

    return {
        "prediction": label,
        "confidence": confidence,
        "conditions": conditions,
        "regions_found": analysis.get("regions_found", 0),
        "feature_scores": analysis.get("features", {}),
        "feature_analysis": {
            "mean_score": analysis.get("mean_score", 0),
            "features": analysis.get("features", {}),
        },
        "gradcam": analysis.get("overlay_path", ""),
        "heatmap": analysis.get("heatmap_path", ""),
        "deviation_map": analysis.get("deviation_map_path", ""),
        "normal_reference": analysis.get("normal_reference_path", ""),
        "regions": analysis.get("regions", []),
        "patient_ct": analysis.get("patient_ct_path", ""),
        "region_visualization": analysis.get("region_visualization_path", ""),
    }


def predict_ct_scan_multi(image_paths: list) -> dict:
    """
    Run CT model on multiple slices (uses same singleton). Returns individual
    slice results and aggregated final diagnosis (majority vote + average confidence).
    """
    from app.ai_models.model_loader import get_ct_model

    if get_ct_model() is None:
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
                "path": path,
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
    Run X-Ray model on image (uses singleton, no reload). Preprocessing matches
    training: PIL RGB, 256x256, 1/255, sample-wise mean/std.
    Returns {"prediction": str, "confidence": float, "conditions": list}.
    """
    from app.ai_models.model_loader import get_xray_model

    model = get_xray_model()
    if model is None:
        logger.error("X-Ray prediction skipped: model not loaded")
        return {"prediction": "Model not available", "confidence": 0.0, "conditions": []}

    if not image_path or not os.path.isfile(image_path):
        logger.warning("X-Ray prediction skipped: invalid or missing image path")
        return {"prediction": "Error: No image file", "confidence": 0.0, "conditions": []}

    logger.info("X-Ray prediction start: %s", image_path)
    try:
        x = _preprocess_xray(image_path)
        if x.shape != (1, 256, 256, 3):
            logger.warning("X-Ray preprocessing shape %s", x.shape)
            return {"prediction": "Error: Invalid image shape", "confidence": 0.0, "conditions": []}

        preds = model.predict(x, verbose=0)
        if isinstance(preds, list):
            preds = preds[0]
        probs = np.squeeze(preds)
        if probs.ndim == 0:
            probs = np.array([1.0 - probs, probs])
        if probs.ndim == 1 and len(probs) != len(XRAY_LABELS):
            probs = np.resize(probs, len(XRAY_LABELS))

        thresholds = _load_xray_thresholds()
        conditions = []
        for i, label in enumerate(XRAY_LABELS):
            prob = float(probs[i]) if i < len(probs) else 0.0
            th = thresholds.get(label, 0.5)
            status = "Detected" if prob > th else "Not Detected"
            conditions.append({"label": label, "probability": round(prob, 4), "status": status})

        idx = int(np.argmax(probs))
        conf = float(probs[idx])
        label = XRAY_LABELS[idx] if 0 <= idx < len(XRAY_LABELS) else XRAY_LABELS[0]
        logger.info("X-Ray prediction result: %s (confidence=%.4f)", label, conf)
        return {"prediction": label, "confidence": round(conf, 4), "conditions": conditions}
    except Exception as e:
        logger.exception("X-Ray prediction failed: %s", e)
        return {"prediction": f"Error: {str(e)}", "confidence": 0.0, "conditions": []}
