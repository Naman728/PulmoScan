"""
Suspicious region detection from a Grad-CAM heatmap.
Uses thresholding and returns bounding boxes with confidence.
"""
import logging
from typing import List

import numpy as np

logger = logging.getLogger(__name__)


def detect_suspicious_regions(
    heatmap: np.ndarray,
    top_k: int = 5,
    threshold_percentile: float = 75.0,
    min_area: int = 50,
) -> List[dict]:
    """
    Extract top suspicious regions from heatmap via thresholding.
    Returns list of {"x": int, "y": int, "w": int, "h": int, "confidence": float}.
    """
    if heatmap is None or heatmap.size == 0:
        return []

    try:
        if heatmap.ndim == 3:
            heatmap = heatmap.mean(axis=-1)
        heatmap = np.asarray(heatmap, dtype=np.float64)
        thresh = np.percentile(heatmap, threshold_percentile)
        binary = (heatmap >= thresh).astype(np.uint8)
    except Exception as e:
        logger.debug("Region detection threshold failed: %s", e)
        return []

    try:
        from scipy import ndimage
        labeled, num_features = ndimage.label(binary)
        if num_features == 0:
            return _fallback_regions(heatmap, top_k)
        regions = []
        for i in range(1, num_features + 1):
            ys, xs = np.where(labeled == i)
            if len(ys) < min_area:
                continue
            x_min, x_max = int(xs.min()), int(xs.max())
            y_min, y_max = int(ys.min()), int(ys.max())
            w = x_max - x_min + 1
            h = y_max - y_min + 1
            roi = heatmap[y_min:y_max + 1, x_min:x_max + 1]
            confidence = float(np.mean(roi) / 255.0) if roi.size else 0.0
            confidence = round(min(1.0, max(0.0, confidence)), 2)
            regions.append({"x": x_min, "y": y_min, "w": w, "h": h, "confidence": confidence})
        regions.sort(key=lambda r: r["confidence"], reverse=True)
        return regions[:top_k]
    except ImportError:
        return _fallback_regions(heatmap, top_k)
    except Exception as e:
        logger.debug("Region detection failed: %s", e)
        return _fallback_regions(heatmap, top_k)


def _fallback_regions(heatmap: np.ndarray, top_k: int) -> List[dict]:
    """Simple grid-based fallback when scipy/cv2 not available."""
    try:
        if heatmap.ndim == 3:
            heatmap = heatmap.mean(axis=-1)
        h, w = heatmap.shape
        step_y, step_x = max(1, h // 4), max(1, w // 4)
        regions = []
        for i in range(0, h - step_y + 1, step_y):
            for j in range(0, w - step_x + 1, step_x):
                patch = heatmap[i:i + step_y, j:j + step_x]
                conf = float(np.mean(patch) / 255.0) if patch.size else 0.0
                conf = round(min(1.0, max(0.0, conf)), 2)
                if conf > 0.1:
                    regions.append({"x": int(j), "y": int(i), "w": int(step_x), "h": int(step_y), "confidence": conf})
        regions.sort(key=lambda r: r["confidence"], reverse=True)
        return regions[:top_k]
    except Exception:
        return []
