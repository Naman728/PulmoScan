"""
Orchestrator for explainability: Grad-CAM, regions, feature scores.
Called only AFTER prediction; does not modify the prediction pipeline.
All logic is fail-safe: on exception returns None and app continues.
"""
import logging
import os
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

REFERENCE_DIR = os.path.join(os.path.dirname(__file__), "reference")

# Visualization filenames that must only live under outputs/{scan_id}/
OUTPUT_IMAGE_NAMES = (
    "patient_ct.png",
    "heatmap.png",
    "deviation_map.png",
    "gradcam_overlay.png",
    "overlay.png",
    "regions_overlay.png",
    "suspicious_regions.png",
    "normal_reference.png",
)


def _draw_regions_on_image(image: np.ndarray, regions: List[Dict[str, Any]]) -> Optional[np.ndarray]:
    """Draw bounding boxes on image. regions: list of {x, y, w, h}. Returns (H,W,3) uint8 or None."""
    if not regions or image is None or image.size == 0:
        return None
    try:
        img = np.array(image, dtype=np.uint8)
        if img.ndim == 2:
            img = np.stack([img] * 3, axis=-1)
        if img.max() <= 1.0:
            img = np.uint8(255 * np.clip(img, 0, 1))
    except Exception:
        return None
    try:
        import cv2
        out = img.copy()
        for r in regions:
            x = int(r.get("x", 0))
            y = int(r.get("y", 0))
            w = int(r.get("w", 0))
            h = int(r.get("h", 0))
            if w > 0 and h > 0:
                cv2.rectangle(out, (x, y), (x + w, y + h), (0, 255, 0), 2)
        return out
    except ImportError:
        try:
            from PIL import Image, ImageDraw
            pil_img = Image.fromarray(img)
            draw = ImageDraw.Draw(pil_img)
            for r in regions:
                x, y = int(r.get("x", 0)), int(r.get("y", 0))
                w, h = int(r.get("w", 0)), int(r.get("h", 0))
                if w > 0 and h > 0:
                    draw.rectangle([x, y, x + w, y + h], outline=(0, 255, 0), width=2)
            return np.array(pil_img)
        except Exception as e:
            logger.error("Draw regions (PIL) failed: %s", e)
            return None
    except Exception as e:
        logger.error("Draw regions failed: %s", e)
        return None


def _cleanup_legacy_outputs():
    """Remove visualization files saved directly in outputs/ (no scan_id subfolder)."""
    base = "outputs"
    if not os.path.isdir(base):
        return
    for name in OUTPUT_IMAGE_NAMES:
        path = os.path.join(base, name)
        if os.path.isfile(path):
            try:
                os.remove(path)
                logger.info("Removed legacy file: %s", path)
            except OSError as e:
                logger.warning("Could not remove %s: %s", path, e)


def run_ct_explainability(
    image_path: str,
    prediction_label: str,
    confidence: float,
    output_dir: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Run explainability for a CT scan: Grad-CAM, regions, feature scores.
    All visualization files are saved only under output_dir (e.g. outputs/{scan_id}/).
    Returns analysis dict or None on any failure. Does not raise.
    """
    if not image_path or not os.path.isfile(image_path):
        return None
    if not output_dir or not output_dir.strip():
        logger.warning("run_ct_explainability: output_dir required; skipping save")
        return None
    out_dir = output_dir.strip()
    os.makedirs(out_dir, exist_ok=True)

    try:
        from app.ai_models.model_loader import get_ct_model
        from app.ai_models.predict import _preprocess_image, CT_LABELS, CT_SIZE
        import torch
    except Exception as e:
        logger.error("Explainability import failed: %s", e)
        return None

    model = get_ct_model()
    if model is None:
        return None

    try:
        tensor = _preprocess_image(image_path, CT_SIZE, normalize_imagenet=True)
        x = tensor.unsqueeze(0).float()
    except Exception as e:
        logger.error("Explainability preprocess failed: %s", e)
        return None

    logits = None
    try:
        with torch.no_grad():
            out = model(x)
            if isinstance(out, (list, tuple)):
                out = out[0]
            if hasattr(out, "shape") and out.dim() >= 2:
                logits = out[0].cpu().numpy()
    except Exception as e:
        logger.error("Explainability forward failed: %s", e)

    target_class_idx = None
    if prediction_label in CT_LABELS:
        target_class_idx = CT_LABELS.index(prediction_label)

    heatmap = None
    try:
        from app.ai_models.gradcam import run_gradcam, save_heatmap_and_overlay
        x_requires_grad = x.clone().detach().requires_grad_(True)
        heatmap, _ = run_gradcam(model, x_requires_grad, target_class_idx=target_class_idx)
    except Exception:
        logger.exception("Grad-CAM failed")

    regions = []
    if heatmap is not None:
        try:
            from app.ai_models.region_detector import detect_suspicious_regions
            regions = detect_suspicious_regions(heatmap, top_k=5)
        except Exception as e:
            logger.error("Region detection failed: %s", e)

    features = {}
    if logits is not None:
        try:
            from app.ai_models.feature_analysis import score_features_from_logits
            features = score_features_from_logits(logits)
            if "lymph_node_involvement" in features:
                features["lymph_node"] = features.pop("lymph_node_involvement")
        except Exception as e:
            logger.error("Feature scoring failed: %s", e)

    import cv2
    from PIL import Image
    orig = Image.open(image_path).convert("RGB")
    target_w, target_h = int(x.shape[3]), int(x.shape[2])
    orig_arr = np.array(orig.resize((target_w, target_h)))

    # STEP 2 — Patient CT: ensure grayscale, enhance contrast, save (grayscale)
    patient_ct = np.asarray(orig_arr, dtype=np.uint8)
    if len(patient_ct.shape) == 3:
        patient_ct_gray = cv2.cvtColor(patient_ct, cv2.COLOR_RGB2GRAY)
    else:
        patient_ct_gray = np.uint8(patient_ct)
    patient_ct_gray = cv2.normalize(patient_ct_gray, None, 0, 255, cv2.NORM_MINMAX)
    patient_ct_path = os.path.join(out_dir, "patient_ct.png")
    try:
        patient_ct_rgb_display = cv2.cvtColor(patient_ct_gray, cv2.COLOR_GRAY2RGB)
        cv2.imwrite(patient_ct_path, patient_ct_rgb_display)
    except Exception as e:
        logger.error("Save patient_ct failed: %s", e)
        patient_ct_path = ""

    # BGR version of enhanced CT for overlays (deviation, regions, gradcam)
    patient_ct_rgb = cv2.cvtColor(patient_ct_gray, cv2.COLOR_GRAY2BGR)

    # STEP 1 (ISSUE 4) — Normal reference: always load or fallback; same resolution, intensity normalized
    normal_reference_path = os.path.join(out_dir, "normal_reference.png")
    ref_path = os.path.join(REFERENCE_DIR, "normal_ct.png")
    if not os.path.exists(ref_path):
        ref_path = os.path.join("app", "ai_models", "reference", "normal_ct.png")
    if os.path.exists(ref_path):
        normal_reference = cv2.imread(ref_path, cv2.IMREAD_GRAYSCALE)
    else:
        normal_reference = patient_ct_gray.copy()
    normal_reference = cv2.resize(
        normal_reference,
        (patient_ct_gray.shape[1], patient_ct_gray.shape[0]),
    )
    normal_reference = cv2.normalize(normal_reference, None, 0, 255, cv2.NORM_MINMAX)
    cv2.imwrite(normal_reference_path, normal_reference)

    heatmap_path = ""
    overlay_path = ""
    deviation_map_path = ""
    gradcam_overlay_path = ""
    heatmap_uint8 = None
    if heatmap is not None:
        try:
            from app.ai_models.gradcam import save_heatmap_and_overlay
            heatmap_path, gradcam_overlay_path, heatmap_uint8 = save_heatmap_and_overlay(
                heatmap, orig_arr, out_dir
            )
            overlay_path = gradcam_overlay_path or ""
            if heatmap_path or gradcam_overlay_path:
                logger.info("Saved heatmap: %s, gradcam_overlay: %s", heatmap_path, gradcam_overlay_path)
        except Exception as e:
            logger.error("Save heatmap/overlay failed: %s", e)

    # Lung mask (used for deviation and regions): preserve lung regions (bright = 255)
    _, lung_mask = cv2.threshold(patient_ct_gray, 10, 255, cv2.THRESH_BINARY)
    lung_mask = cv2.medianBlur(lung_mask, 7)

    # STEP 3 (ISSUE 5) — Deviation map: normalize both, abs diff, apply lung mask, JET heatmap
    deviation_map_path = os.path.join(out_dir, "deviation_map.png")
    try:
        p_norm = cv2.normalize(patient_ct_gray, None, 0, 255, cv2.NORM_MINMAX)
        r_norm = cv2.normalize(normal_reference, None, 0, 255, cv2.NORM_MINMAX)
        diff = cv2.absdiff(p_norm, r_norm)
        if (lung_mask.shape[0], lung_mask.shape[1]) == (diff.shape[0], diff.shape[1]):
            diff = cv2.bitwise_and(diff, diff, mask=lung_mask)
        diff_float = diff.astype(np.float64) / (np.max(diff) + 1e-8)
        diff_uint8 = np.uint8(255 * diff_float)
        deviation_color = cv2.applyColorMap(diff_uint8, cv2.COLORMAP_JET)
        if (patient_ct_rgb.shape[0], patient_ct_rgb.shape[1]) != (deviation_color.shape[0], deviation_color.shape[1]):
            deviation_color = cv2.resize(deviation_color, (patient_ct_rgb.shape[1], patient_ct_rgb.shape[0]))
        deviation_overlay = cv2.addWeighted(patient_ct_rgb, 0.7, deviation_color, 0.3, 0)
        cv2.imwrite(deviation_map_path, cv2.cvtColor(deviation_overlay, cv2.COLOR_BGR2RGB))
    except Exception as e:
        logger.error("Save deviation_map failed: %s", e)
        deviation_map_path = ""

    # STEP 4–6 (ISSUE 2 & 3) — Regions: resize heatmap to CT resolution first, then threshold, contours, clamp boxes
    region_visualization_path = ""
    suspicious_regions_path = os.path.join(out_dir, "suspicious_regions.png")
    if heatmap_uint8 is not None:
        try:
            h_img, w_img = patient_ct_rgb.shape[0], patient_ct_rgb.shape[1]
            # Resize heatmap to match CT resolution before region detection
            heatmap_resized = cv2.resize(
                heatmap_uint8,
                (patient_ct_gray.shape[1], patient_ct_gray.shape[0]),
            )
            heatmap_float = heatmap_resized.astype(np.float32) / 255.0
            threshold_val = 0.6
            binary = ((heatmap_float >= threshold_val).astype(np.uint8)) * 255
            binary_masked = cv2.bitwise_and(binary, binary, mask=lung_mask)
            contours, _ = cv2.findContours(
                binary_masked, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            contour_regions = []
            for c in contours:
                x, y, w, h = cv2.boundingRect(c)
                # Clamp box to image frame
                x = max(0, min(x, w_img - 1))
                y = max(0, min(y, h_img - 1))
                w = min(w, w_img - x)
                h = min(h, h_img - y)
                if w < 20 or h < 20:
                    continue
                roi_mask = lung_mask[y : y + h, x : x + w]
                if np.mean(roi_mask) < 127:
                    continue
                roi_heat = heatmap_float[y : y + h, x : x + w]
                conf = float(np.mean(roi_heat)) if roi_heat.size else 0.0
                contour_regions.append({
                    "x": int(x), "y": int(y), "w": int(w), "h": int(h),
                    "confidence": round(min(1.0, max(0.0, conf)), 2),
                })
            regions = contour_regions[:20]

            # Suspicious regions image: CT + heatmap overlay, then red boxes and labels (ISSUE 3)
            heatmap_color = cv2.applyColorMap(heatmap_resized, cv2.COLORMAP_JET)
            overlay_img = cv2.addWeighted(patient_ct_rgb, 0.7, heatmap_color, 0.3, 0)
            for i, r in enumerate(regions):
                x, y, w, h = r["x"], r["y"], r["w"], r["h"]
                conf = r.get("confidence", 0.0)
                cv2.rectangle(overlay_img, (x, y), (x + w, y + h), (0, 0, 255), 2)
                cv2.putText(
                    overlay_img, f"R{i + 1} {conf:.2f}",
                    (x, max(0, y - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1
                )
            cv2.imwrite(suspicious_regions_path, cv2.cvtColor(overlay_img, cv2.COLOR_BGR2RGB))
            region_visualization_path = suspicious_regions_path
        except Exception as e:
            logger.error("Save suspicious_regions failed: %s", e)
    if not region_visualization_path and regions and orig_arr is not None:
        try:
            region_img = _draw_regions_on_image(orig_arr, regions)
            if region_img is not None:
                region_visualization_path = os.path.join(out_dir, "suspicious_regions.png")
                cv2.imwrite(region_visualization_path, region_img)
        except Exception as e:
            logger.error("Save regions fallback failed: %s", e)

    # STEP 7 — GradCAM overlay from patient_ct_rgb (always exists when heatmap exists)
    if heatmap_uint8 is not None:
        try:
            heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
            heatmap_color = cv2.resize(
                heatmap_color,
                (patient_ct_rgb.shape[1], patient_ct_rgb.shape[0]),
            )
            gradcam_overlay = cv2.addWeighted(
                patient_ct_rgb, 0.6, heatmap_color, 0.4, 0
            )
            gradcam_overlay_path = os.path.join(out_dir, "gradcam_overlay.png")
            cv2.imwrite(gradcam_overlay_path, cv2.cvtColor(gradcam_overlay, cv2.COLOR_BGR2RGB))
            overlay_path = gradcam_overlay_path
        except Exception as e:
            logger.error("Save gradcam_overlay failed: %s", e)

    try:
        mean_score = int(round((confidence * 100) if confidence <= 1 else confidence))
    except Exception:
        mean_score = 0

    def _rel(path: str) -> str:
        if not path:
            return ""
        return path.replace("\\", "/")

    # STEP 5 & 6 — Validate files exist; build paths for API (frontend loads from these)
    path_keys = [
        ("patient_ct_path", patient_ct_path),
        ("normal_reference_path", normal_reference_path),
        ("heatmap_path", heatmap_path),
        ("deviation_map_path", deviation_map_path),
        ("overlay_path", gradcam_overlay_path or overlay_path),
        ("region_visualization_path", region_visualization_path),
    ]
    for name, p in path_keys:
        if p and not os.path.exists(p):
            logger.error("Explainability output missing: %s", p)

    overlay_for_response = gradcam_overlay_path or overlay_path
    _cleanup_legacy_outputs()

    response_paths = {
        "patient_ct_path": _rel(patient_ct_path),
        "normal_reference_path": _rel(normal_reference_path),
        "heatmap_path": _rel(heatmap_path),
        "deviation_map_path": _rel(deviation_map_path),
        "overlay_path": _rel(overlay_for_response),
        "region_visualization_path": _rel(region_visualization_path),
        "suspicious_regions_path": _rel(region_visualization_path),
    }
    logger.info("number of detected regions: %d", len(regions))
    logger.info(
        "Explainability result: regions=%s paths=%s",
        len(regions),
        response_paths,
    )
    return {
        "prediction": prediction_label,
        "confidence": confidence,
        "regions_found": len(regions),
        "regions": regions,
        "mean_score": mean_score,
        "features": features,
        **response_paths,
    }


def run_xray_explainability(
    prediction_label: str,
    confidence: float,
    probs_or_logits: Optional[list] = None,
) -> Optional[Dict[str, Any]]:
    """
    Lightweight explainability for X-Ray: feature scores only (no Grad-CAM for TF here).
    probs_or_logits: list of 4 class probabilities or conditions with 'probability' key.
    Returns analysis dict with features and placeholder regions; does not raise.
    """
    try:
        from app.ai_models.feature_analysis import score_features_from_probs, score_features_from_logits
    except Exception:
        return None
    vals = probs_or_logits if probs_or_logits is not None else []
    if vals and isinstance(vals[0], dict):
        vals = [c.get("probability", 0) for c in vals if isinstance(c, dict)][:4]
    else:
        vals = [float(x) for x in vals if isinstance(x, (int, float))][:4]
    if len(vals) < 4:
        vals = list(vals) + [0.0] * (4 - len(vals))
    try:
        if all(0 <= v <= 1 for v in vals):
            features = score_features_from_probs(vals)
        else:
            features = score_features_from_logits(vals)
        if "lymph_node_involvement" in features:
            features["lymph_node"] = features.pop("lymph_node_involvement")
    except Exception:
        features = {}
    mean_score = int(round((confidence * 100) if confidence <= 1 else confidence))
    return {
        "regions_found": 0,
        "regions": [],
        "mean_score": mean_score,
        "features": features,
        "heatmap_path": "",
        "overlay_path": "",
    }
