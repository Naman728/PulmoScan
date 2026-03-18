"""
Prediction functions for CT Scan and X-Ray images.
Uses model singletons from model_loader (loaded once at startup).
Preprocesses image, runs model, returns label and confidence.
Production response: full probability distribution, top 7-10 predictions, heatmap overlay (base64), analysis text.
"""
import base64
import io
import logging
import os
import time
import traceback
from typing import Any, Dict, List, Optional

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
BRAIN_LABELS = ["Normal", "Stroke", "Tumor", "Hemorrhage"]  # Brain model same classes as CT
XRAY_LABELS = ["Normal", "Pneumonia", "Tuberculosis", "Covid"]

# Supported model types for unified predict()
VALID_MODEL_TYPES = frozenset({"ct", "brain", "xray"})
BRAIN_SIZE = (224, 224)  # PyTorch brain model input

# Epsilon for sample-wise std normalization (avoid division by zero)
XRAY_STD_EPS = 1e-7

# Max number of top predictions to return (production response)
TOP_PREDICTIONS_K = 10
MIN_PROBABILITY_THRESHOLD = 0.01
MODEL_VERSION = "v1.0"


def _confidence_level(confidence: float) -> str:
    """Map confidence to High / Moderate / Low."""
    c = float(confidence)
    if c > 0.8:
        return "High"
    if c > 0.5:
        return "Moderate"
    return "Low"


def _build_all_predictions(conditions: List[Any], top_k: int = TOP_PREDICTIONS_K) -> List[Dict[str, Any]]:
    """Build sorted list of top-k {disease, probability}; normalize probs to sum to 1; only include prob > 0.01."""
    if not conditions:
        return []
    items = []
    for c in conditions:
        label = c.get("label") or c.get("disease")
        prob = c.get("probability")
        if label is not None and prob is not None:
            items.append({"disease": str(label), "probability": float(prob)})
    if not items:
        return []
    probs = np.array([x["probability"] for x in items])
    probs = np.maximum(probs, 0.0)
    total = np.sum(probs)
    if total > 0:
        probs = probs / total
    for i, x in enumerate(items):
        x["probability"] = round(float(probs[i]) if i < len(probs) else 0.0, 4)
    items = [x for x in items if x["probability"] > MIN_PROBABILITY_THRESHOLD]
    items.sort(key=lambda x: x["probability"], reverse=True)
    return items[:top_k]


def _build_analysis_professional(
    top_prediction: str,
    all_predictions: List[Dict[str, Any]],
    attention_region: str,
) -> str:
    """Professional clinical analysis text."""
    if not top_prediction or str(top_prediction).startswith("Error"):
        return "Analysis could not be completed."
    others = [p for p in (all_predictions or []) if p.get("disease") != top_prediction][:3]
    diff = ", ".join(p["disease"] for p in others) if others else "other considerations"
    return (
        f"Model highlights regions in {attention_region} showing patterns consistent with {top_prediction}. "
        f"Differential diagnoses include {diff} based on overlapping radiographic features."
    )


def _build_analysis_text(
    top_prediction: str,
    confidence: float,
    all_predictions: List[Dict[str, Any]],
    model_type: str,
) -> str:
    """Generate a short dynamic explanation (fallback)."""
    return _build_analysis_professional(top_prediction, all_predictions, "the region of interest")


def _attention_region_from_heatmap(heatmap_2d: np.ndarray, model_type: str = "xray") -> str:
    """Divide heatmap into Top/Middle/Bottom; return region label where activation is highest."""
    if heatmap_2d is None or heatmap_2d.size == 0:
        return "Not available"
    try:
        arr = np.asarray(heatmap_2d, dtype=np.float64)
        if arr.ndim == 3:
            arr = arr.mean(axis=-1)
        arr = np.maximum(arr, 0)
        h = arr.shape[0]
        if h < 3:
            return "Focal"
        third = max(1, h // 3)
        top = np.mean(arr[:third])
        mid = np.mean(arr[third : 2 * third])
        bot = np.mean(arr[2 * third :])
        idx = np.argmax([top, mid, bot])
        if model_type in ("xray", "ct"):
            labels = ["Upper lung", "Middle lung", "Lower lung"]
        else:
            labels = ["Superior", "Mid", "Inferior"]
        return labels[idx] if idx < len(labels) else "Focal"
    except Exception as e:
        logger.debug("Attention region from heatmap failed: %s", e)
        return "Not available"


def _heatmap_overlay_to_base64(
    heatmap_2d: np.ndarray,
    original_image_path: str,
    alpha: float = 0.5,
) -> Optional[str]:
    """Overlay heatmap on original image (resize heatmap to original size, JET, alpha blend), return base64 PNG. On failure fallback to raw heatmap base64 then None."""
    path_exists = bool(original_image_path and os.path.isfile(original_image_path))
    logger.info("Original image path exists: %s (path=%s)", path_exists, original_image_path or "")
    if heatmap_2d is None or heatmap_2d.size == 0 or not path_exists:
        return _heatmap_to_base64(heatmap_2d) if heatmap_2d is not None else None
    try:
        from PIL import Image as PILImage
        orig = PILImage.open(original_image_path).convert("RGB")
        orig_arr = np.array(orig)
        if orig_arr.ndim == 2:
            orig_arr = np.stack([orig_arr] * 3, axis=-1)
        target_h, target_w = orig_arr.shape[0], orig_arr.shape[1]
        logger.info("Original image size: <%s, %s> (W, H)", target_w, target_h)
        arr = np.asarray(heatmap_2d, dtype=np.float64)
        if arr.ndim == 3:
            arr = arr.mean(axis=-1)
        arr = np.maximum(arr, 0)
        if arr.max() > 0:
            arr = arr / (arr.max() + 1e-8)
        heat_uint8 = np.uint8(255 * np.clip(arr, 0, 1))
        heat_pil = PILImage.fromarray(heat_uint8).resize((target_w, target_h), PILImage.BILINEAR)
        heat_resized = np.array(heat_pil)
        logger.info("Resized heatmap shape: %s", heat_resized.shape if hasattr(heat_resized, "shape") else None)
        try:
            import cv2
            heat_rgb = cv2.applyColorMap(heat_resized, cv2.COLORMAP_JET)
            heat_rgb = cv2.cvtColor(heat_rgb, cv2.COLOR_BGR2RGB)
        except Exception:
            heat_rgb = np.stack([heat_resized] * 3, axis=-1)
        if orig_arr.shape[:2] != heat_rgb.shape[:2]:
            heat_rgb = np.array(PILImage.fromarray(heat_rgb).resize((orig_arr.shape[1], orig_arr.shape[0]), PILImage.BILINEAR))
        overlay = np.uint8((1 - alpha) * np.clip(orig_arr.astype(np.float64), 0, 255) + alpha * heat_rgb.astype(np.float64))
        logger.info("Overlay image generated successfully")
        buf = io.BytesIO()
        PILImage.fromarray(overlay).save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        logger.info("Overlay base64 length: %s", len(b64) if b64 else 0)
        if os.environ.get("PULMOSCAN_DEBUG_HEATMAP", "").lower() in ("1", "true", "yes"):
            try:
                debug_path = os.path.join(os.path.dirname(__file__), "debug_overlay.png")
                PILImage.fromarray(overlay).save(debug_path)
                logger.info("Debug: saved overlay to %s", debug_path)
            except Exception as ex:
                logger.debug("Debug save overlay failed: %s", ex)
        return b64
    except Exception as e:
        logger.debug("Heatmap overlay failed, using raw heatmap: %s", e)
        logger.error("Overlay full traceback:\n%s", traceback.format_exc())
        return _heatmap_to_base64(heatmap_2d)


def _heatmap_to_base64(heatmap_2d: np.ndarray) -> Optional[str]:
    """Convert 2D heatmap array to PNG base64 string. Returns None on failure."""
    if heatmap_2d is None or heatmap_2d.size == 0:
        logger.info("Converting heatmap to base64: skipped (None or empty)")
        return None
    logger.info("Converting heatmap to base64")
    try:
        arr = np.asarray(heatmap_2d, dtype=np.float64)
        if arr.ndim == 3:
            arr = arr.mean(axis=-1)
        arr = np.maximum(arr, 0)
        if arr.max() > 0:
            arr = arr / arr.max()
        uint8 = np.uint8(255 * np.clip(arr, 0, 1))
        pil = Image.fromarray(uint8)
        buf = io.BytesIO()
        pil.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        logger.info("Base64 length: %s", len(b64) if b64 else 0)
        if not b64:
            logger.error("Base64 is empty after conversion")
        return b64
    except Exception as e:
        logger.debug("Heatmap to base64 failed: %s", e)
        logger.error("Base64 conversion traceback:\n%s", traceback.format_exc())
        return None


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

    heatmap_2d = None
    try:
        logger.info("Running Grad-CAM for model: ct")
        logger.info("Model type: %s, input tensor shape: %s, predicted class index: %s", type(model).__name__, list(x.shape) if hasattr(x, "shape") else None, idx)
        from app.ai_models.gradcam import run_gradcam
        heatmap_2d, _ = run_gradcam(model, x, target_class_idx=idx)
        logger.info("Grad-CAM output is None: %s", heatmap_2d is None)
        if heatmap_2d is not None:
            logger.info("Grad-CAM success for class: %s", label)
            logger.info("Heatmap generated shape: %s", getattr(heatmap_2d, "shape", None))
    except Exception as e:
        logger.debug("CT Grad-CAM heatmap skipped: %s", e)
        logger.error("CT Grad-CAM exception:\n%s", traceback.format_exc())

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
            "heatmap_2d": heatmap_2d,
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

    out = {
        "prediction": label,
        "confidence": confidence,
        "conditions": conditions,
        "heatmap_2d": heatmap_2d,
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
    return out


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

        heatmap_2d = None
        try:
            logger.info("Running Grad-CAM for model: xray")
            logger.info("Model type: %s, input shape: %s, predicted class index: %s", type(model).__name__, list(x.shape) if hasattr(x, "shape") else None, idx)
            from app.ai_models.gradcam import run_gradcam_keras
            heatmap_2d, _ = run_gradcam_keras(model, x, idx)
            logger.info("Grad-CAM output is None: %s", heatmap_2d is None)
            if heatmap_2d is not None:
                logger.info("Grad-CAM success for class: %s", label)
                logger.info("Heatmap generated shape: %s", getattr(heatmap_2d, "shape", None))
        except Exception as e:
            logger.debug("X-Ray Grad-CAM heatmap skipped: %s", e)
            logger.error("X-Ray Grad-CAM exception:\n%s", traceback.format_exc())

        return {
            "prediction": label,
            "confidence": round(conf, 4),
            "conditions": conditions,
            "heatmap_2d": heatmap_2d,
        }
    except Exception as e:
        logger.exception("X-Ray prediction failed: %s", e)
        return {"prediction": f"Error: {str(e)}", "confidence": 0.0, "conditions": [], "heatmap_2d": None}


def predict_brain(image_path: str) -> dict:
    """
    Run Brain model (PyTorch) on a single image. Uses singleton from model_loader.
    Preprocessing: resize to BRAIN_SIZE, ImageNet normalization, torch tensor.
    Returns {"prediction": str, "confidence": float, "conditions": list}.
    """
    from app.ai_models.model_loader import get_brain_model
    import torch

    model = get_brain_model()
    if model is None:
        logger.error("Brain prediction skipped: model not loaded")
        return {"prediction": "Model not available", "confidence": 0.0, "conditions": []}

    if not image_path or not os.path.isfile(image_path):
        logger.warning("Brain prediction skipped: invalid or missing image path")
        return {"prediction": "Error: No image file", "confidence": 0.0, "conditions": []}

    logger.info("Brain prediction start: %s", image_path)
    try:
        tensor = _preprocess_image(image_path, BRAIN_SIZE, normalize_imagenet=True)
        x = tensor.unsqueeze(0).float()

        model.eval()
        with torch.no_grad():
            out = model(x)
            if isinstance(out, (list, tuple)):
                out = out[0]
            # Handle multi-head or single output
            if hasattr(out, "shape") and out.dim() >= 2:
                n_classes = min(out.shape[1], len(BRAIN_LABELS))
                out = out[:, :n_classes]
            probs = torch.softmax(out, dim=1)
            prob, idx = probs.max(1)
            idx = idx.item()
            conf = prob.item()
        label = BRAIN_LABELS[idx] if 0 <= idx < len(BRAIN_LABELS) else BRAIN_LABELS[0]
        logger.info("Brain prediction result: %s (confidence=%.4f)", label, conf)
        confidence = round(conf, 4)
        probs_np = probs.squeeze().cpu().numpy()
        conditions = []
        for i, label_name in enumerate(BRAIN_LABELS):
            conditions.append({
                "label": label_name,
                "probability": round(float(probs_np[i]) if i < len(probs_np) else 0.0, 4),
            })
        heatmap_2d = None
        try:
            logger.info("Running Grad-CAM for model: brain")
            logger.info("Model type: %s, input tensor shape: %s, predicted class index: %s", type(model).__name__, list(x.shape) if hasattr(x, "shape") else None, idx)
            from app.ai_models.gradcam import run_gradcam
            heatmap_2d, _ = run_gradcam(model, x, target_class_idx=idx)
            logger.info("Grad-CAM output is None: %s", heatmap_2d is None)
            if heatmap_2d is not None:
                logger.info("Grad-CAM success for class: %s", label)
                logger.info("Heatmap generated shape: %s", getattr(heatmap_2d, "shape", None))
        except Exception as eg:
            logger.debug("Brain Grad-CAM heatmap skipped: %s", eg)
            logger.error("Brain Grad-CAM exception:\n%s", traceback.format_exc())
        return {
            "prediction": label,
            "confidence": confidence,
            "conditions": conditions,
            "heatmap_2d": heatmap_2d,
        }
    except Exception as e:
        logger.exception("Brain prediction failed: %s", e)
        return {"prediction": f"Error: {str(e)}", "confidence": 0.0, "conditions": [], "heatmap_2d": None}


def predict(model_type: str, image_path: str, output_dir: Optional[str] = None) -> dict:
    """
    Unified prediction router. Dispatches to CT, Brain, or X-ray pipeline.
    model_type: "ct" | "brain" | "xray"
    image_path: path to image file.
    output_dir: optional; only used for CT (explainability outputs).
    Returns dict with at least: model, prediction, confidence. Extra keys per model.
    """
    if not model_type or model_type.strip().lower() not in VALID_MODEL_TYPES:
        return {
            "model": model_type or "unknown",
            "prediction": "Error: Invalid model_type. Use ct, brain, or xray.",
            "confidence": 0.0,
            "error": "invalid_model_type",
        }

    model_type = model_type.strip().lower()
    result = None
    t0 = time.perf_counter()

    try:
        if model_type == "ct":
            result = predict_ct_scan(image_path, output_dir=output_dir)
            result["model"] = "ct"
            if "prediction" not in result:
                result["prediction"] = result.get("final_diagnosis", "")
            result["confidence"] = result.get("confidence") or result.get("final_confidence") or 0.0
            result["_input_shape"] = f"{CT_SIZE[0]}x{CT_SIZE[1]}"
        elif model_type == "brain":
            result = predict_brain(image_path)
            result["model"] = "brain"
            result["confidence"] = result.get("confidence", 0.0)
            result["_input_shape"] = f"{BRAIN_SIZE[0]}x{BRAIN_SIZE[1]}"
        elif model_type == "xray":
            result = predict_xray(image_path)
            result["model"] = "xray"
            result["confidence"] = result.get("confidence", 0.0)
            result["_input_shape"] = f"{XRAY_SIZE[0]}x{XRAY_SIZE[1]}"
    except Exception as e:
        logger.exception("Unified predict failed for model_type=%s: %s", model_type, e)
        result = {
            "model": model_type,
            "prediction": f"Error: {str(e)}",
            "confidence": 0.0,
            "error": "prediction_failed",
        }

    inference_time_ms = round((time.perf_counter() - t0) * 1000, 2)

    if result is None:
        result = {
            "model": model_type,
            "prediction": "Error: No result",
            "confidence": 0.0,
            "error": "no_result",
        }

    # Production response: normalize probs, top-k, confidence_level, heatmap overlay, attention_region, analysis, meta
    try:
        conditions = result.get("conditions") or []
        all_predictions = _build_all_predictions(conditions, TOP_PREDICTIONS_K)
        top_pred = result.get("prediction") or result.get("final_diagnosis") or ""
        conf = float(result.get("confidence", 0.0))
        heatmap_2d = result.pop("heatmap_2d", None)

        result["top_prediction"] = top_pred
        result["all_predictions"] = all_predictions
        result["confidence_level"] = _confidence_level(conf)

        attention_region = "Not available"
        if heatmap_2d is not None:
            try:
                attention_region = _attention_region_from_heatmap(heatmap_2d, model_type)
            except Exception as e:
                logger.debug("Attention region failed: %s", e)
        result["attention_region"] = attention_region

        result["analysis"] = _build_analysis_professional(top_pred, all_predictions, attention_region)

        heatmap_b64 = None
        try:
            if heatmap_2d is not None and image_path and os.path.isfile(image_path):
                heatmap_b64 = _heatmap_overlay_to_base64(heatmap_2d, image_path, alpha=0.5)
            if heatmap_b64 is None and heatmap_2d is not None:
                heatmap_b64 = _heatmap_to_base64(heatmap_2d)
        except Exception as e:
            logger.debug("Heatmap/overlay base64 failed: %s", e)
            logger.error("Heatmap pipeline exception:\n%s", traceback.format_exc())
        result["heatmap"] = heatmap_b64
        logger.info("Final heatmap value is None: %s (base64 len=%s)", heatmap_b64 is None, len(heatmap_b64) if heatmap_b64 else 0)

        input_shape = result.pop("_input_shape", "—")
        result["meta"] = {
            "inference_time_ms": inference_time_ms,
            "model_version": MODEL_VERSION,
            "input_shape": input_shape,
        }
    except Exception as e:
        logger.debug("Enrich response failed: %s", e)
        logger.error("Enrich full traceback:\n%s", traceback.format_exc())
        result.setdefault("top_prediction", result.get("prediction", ""))
        result.setdefault("all_predictions", [])
        result.setdefault("confidence_level", "Low")
        result.setdefault("attention_region", "Not available")
        result.setdefault("analysis", "Analysis completed.")
        result.pop("heatmap_2d", None)
        result["heatmap"] = None
        logger.info("Final heatmap value is None: True (enrich exception fallback)")
        result.setdefault("meta", {
            "inference_time_ms": inference_time_ms,
            "model_version": MODEL_VERSION,
            "input_shape": "—",
        })

    return result
