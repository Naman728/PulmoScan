"""
Lightweight clinical feature scoring approximated from model logits.
Does not change the prediction pipeline.
"""
import logging
from typing import Dict, List, Optional, Union

import numpy as np

logger = logging.getLogger(__name__)

FEATURE_KEYS = [
    "spiculated_nodule",
    "ground_glass_opacity",
    "cavitary_lesion",
    "lymph_node_involvement",
    "pleural_effusion",
    "upper_lobe_predominant",
]


def score_features_from_logits(
    logits: Union[List[float], np.ndarray],
    num_classes: int = 4,
) -> Dict[str, float]:
    """
    Approximate clinical feature scores (0-1) from model logits.
    logits: shape (num_classes,) or (1, num_classes).
    Returns dict with keys in FEATURE_KEYS and values in [0, 1].
    """
    try:
        if isinstance(logits, np.ndarray):
            logits = logits.flatten()
        logits = list(logits)[:max(num_classes, 6)]
        if len(logits) < 4:
            logits = logits + [0.0] * (4 - len(logits))
        probs = _logits_to_probs(logits[:4])
        spic = probs[0]
        ggo = probs[1]
        cav = probs[2]
        lymph = probs[3]
        pleural = (probs[0] + probs[1]) / 2.0
        upper = (probs[1] + probs[2]) / 2.0
        return {
            "spiculated_nodule": round(float(spic), 2),
            "ground_glass_opacity": round(float(ggo), 2),
            "cavitary_lesion": round(float(cav), 2),
            "lymph_node_involvement": round(float(lymph), 2),
            "pleural_effusion": round(float(pleural), 2),
            "upper_lobe_predominant": round(float(upper), 2),
        }
    except Exception as e:
        logger.debug("Feature scoring failed: %s", e)
        return {k: 0.0 for k in FEATURE_KEYS}


def _logits_to_probs(logits: List[float]) -> List[float]:
    """Convert logits to probabilities in [0,1] (sigmoid per logit for multi-label style)."""
    try:
        arr = np.array(logits, dtype=np.float64)
        exp = np.exp(-arr)
        return (1.0 / (1.0 + exp)).tolist()
    except Exception:
        return [0.0] * len(logits)


def score_features_from_probs(probs: Union[List[float], np.ndarray]) -> Dict[str, float]:
    """
    Approximate clinical feature scores from class probabilities (e.g. X-Ray).
    probs: length >= 4. Returns dict with FEATURE_KEYS.
    """
    try:
        if isinstance(probs, np.ndarray):
            probs = probs.flatten().tolist()
        probs = list(probs)[:4]
        if len(probs) < 4:
            probs = probs + [0.0] * (4 - len(probs))
        p = [float(min(1.0, max(0.0, x))) for x in probs]
        pleural = (p[0] + p[1]) / 2.0
        upper = (p[1] + p[2]) / 2.0
        return {
            "spiculated_nodule": round(p[0], 2),
            "ground_glass_opacity": round(p[1], 2),
            "cavitary_lesion": round(p[2], 2),
            "lymph_node_involvement": round(p[3], 2),
            "pleural_effusion": round(pleural, 2),
            "upper_lobe_predominant": round(upper, 2),
        }
    except Exception as e:
        logger.debug("Feature scoring from probs failed: %s", e)
        return {k: 0.0 for k in FEATURE_KEYS}
