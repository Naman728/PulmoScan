"""
Multi-model loader: CT (PyTorch), Brain (PyTorch), X-Ray (TensorFlow).
Lazy loading: each model loads only when first requested, then cached globally.
CPU-only, framework-isolated (no mixing PyTorch/TensorFlow in same code path).
"""
import os
import io
import zipfile
import logging

logger = logging.getLogger(__name__)
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_AI_MODELS = os.path.join(os.path.dirname(os.path.dirname(_BASE_DIR)), "ai_models")

# -------- Global cache (load once, reuse) --------
_ct_model = None
_brain_model = None
_xray_model = None
_ct_loaded = False
_brain_loaded = False
_xray_loaded = False


# ---------------------------------------------------------------------------
# CT model (DO NOT MODIFY existing logic — same find/load, now lazy)
# ---------------------------------------------------------------------------

def _find_ct_model_path():
    """Return path to .pth/.pt file or directory containing model."""
    for base in (_BASE_DIR, _ROOT_AI_MODELS):
        pth = os.path.join(base, "ct_model.pth")
        pt = os.path.join(base, "ct_model.pt")
        dir_path = os.path.join(base, "ct_model")
        if os.path.isfile(pth):
            return ("file", pth)
        if os.path.isfile(pt):
            return ("file", pt)
        if os.path.isdir(dir_path):
            for f in ("model.pth", "model.pt", "ct_model.pth", "ct_model.pt", "checkpoint.pth"):
                candidate = os.path.join(dir_path, f)
                if os.path.isfile(candidate):
                    return ("file", candidate)
            return ("dir", dir_path)
    return None


def _load_ct_from_directory(dir_path):
    """Load state_dict from ct_model directory (zip in memory) and load into CTBrainModel."""
    from app.ai_models.ct_architecture import CTBrainModel
    import torch
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(dir_path):
            for f in files:
                full = os.path.join(root, f)
                rel = os.path.relpath(full, dir_path)
                z.write(full, "archive/" + rel)
    buf.seek(0)
    obj = torch.load(buf, map_location=torch.device("cpu"), weights_only=False)
    state = obj if isinstance(obj, dict) else getattr(obj, "state_dict", lambda: None)()
    if state is None:
        raise ValueError("Could not get state_dict from CT model directory")
    model = CTBrainModel()
    model.load_state_dict(state, strict=False)
    model.eval()
    return model


def load_ct_model():
    """Load CT model once, cache globally. Returns model or None. Does not mix with TF."""
    global _ct_model, _ct_loaded
    if _ct_model is not None:
        return _ct_model
    try:
        import torch
    except ImportError:
        logger.warning("PyTorch not available for CT model")
        return None
    kind_path = _find_ct_model_path()
    if not kind_path:
        logger.warning("CT model not found. Place ct_model.pth, ct_model.pt, or ct_model/ in app/ai_models/ or ai_models/")
        return None
    kind, path = kind_path
    try:
        if kind == "file":
            _ct_model = torch.load(path, map_location=torch.device("cpu"), weights_only=False)
            if _ct_model is not None and not hasattr(_ct_model, "eval"):
                from app.ai_models.ct_architecture import CTBrainModel
                state = _ct_model if isinstance(_ct_model, dict) else getattr(_ct_model, "state_dict", lambda: None)()
                if state is not None:
                    m = CTBrainModel()
                    m.load_state_dict(state, strict=False)
                    m.eval()
                    _ct_model = m
                # else leave as-is
            elif _ct_model is not None and hasattr(_ct_model, "eval"):
                _ct_model.eval()
        else:
            _ct_model = _load_ct_from_directory(path)
        if _ct_model is not None:
            _ct_loaded = True
            logger.info("CT model loaded from %s", path)
    except Exception as e:
        _ct_model = None
        logger.warning("CT model not loaded from %s: %s", path, e)
    return _ct_model


# ---------------------------------------------------------------------------
# Brain model (PyTorch only — separate from CT, same framework)
# ---------------------------------------------------------------------------

def _find_brain_model_path():
    """Return path to brain_model/ directory."""
    for base in (_BASE_DIR, _ROOT_AI_MODELS):
        dir_path = os.path.join(base, "brain_model")
        if os.path.isdir(dir_path):
            return dir_path
    return None


def _load_brain_from_directory(dir_path):
    """Load PyTorch model from brain_model/ directory (zip in memory). Returns module or state_dict."""
    import torch
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(dir_path):
            for f in files:
                full = os.path.join(root, f)
                rel = os.path.relpath(full, dir_path)
                z.write(full, "archive/" + rel)
    buf.seek(0)
    obj = torch.load(buf, map_location=torch.device("cpu"), weights_only=False)
    if hasattr(obj, "eval") and hasattr(obj, "forward"):
        obj.eval()
        return obj
    if isinstance(obj, dict):
        from app.ai_models.ct_architecture import CTBrainModel
        model = CTBrainModel()
        model.load_state_dict(obj, strict=False)
        model.eval()
        return model
    return None


def load_brain_model():
    """Load Brain model once from brain_model/, cache globally. CPU only. PyTorch only."""
    global _brain_model, _brain_loaded
    if _brain_model is not None:
        return _brain_model
    try:
        import torch
    except ImportError:
        logger.warning("PyTorch not available for Brain model")
        return None
    path = _find_brain_model_path()
    if not path:
        logger.warning("Brain model not found. Place brain_model/ in app/ai_models/ or ai_models/")
        return None
    try:
        _brain_model = _load_brain_from_directory(path)
        if _brain_model is not None:
            _brain_loaded = True
            logger.info("Brain model loaded from %s", path)
    except Exception as e:
        _brain_model = None
        logger.warning("Brain model not loaded from %s: %s", path, e)
    return _brain_model


# ---------------------------------------------------------------------------
# X-Ray model (TensorFlow only — import inside function to avoid global TF)
# ---------------------------------------------------------------------------

def _find_xray_model_path():
    """Return absolute path to X-ray model file (.h5). Uses __file__ for reliable BASE_DIR."""
    # Force absolute base: same directory as this file (app/ai_models/)
    _this_file = os.path.abspath(__file__)
    base_dir = os.path.dirname(_this_file)
    # Project root ai_models/ (sibling of app/)
    root_ai = os.path.join(os.path.dirname(os.path.dirname(base_dir)), "ai_models")
    candidates = ("model.inceptionresnetv2.h5", "xray_model.h5", "model.h5")
    possible_paths = []
    for base in (base_dir, root_ai):
        base_abs = os.path.abspath(base)
        for name in candidates:
            p = os.path.join(base_abs, name)
            possible_paths.append(p)
    # Debug: print all paths and existence
    logger.info("Checking X-ray model paths:")
    for p in possible_paths:
        exists = os.path.isfile(p)
        logger.info("  %s -> exists=%s", p, exists)
        if exists:
            return os.path.abspath(p)
    return None


def load_xray_model():
    """Load X-Ray model once, cache globally. TensorFlow imported only here (no PyTorch in this path)."""
    global _xray_model, _xray_loaded
    if _xray_model is not None:
        logger.info("X-ray model already cached, returning existing.")
        return _xray_model
    path = _find_xray_model_path()
    if not path:
        logger.warning(
            "X-Ray model not found. Place model.inceptionresnetv2.h5 in app/ai_models/ or ai_models/"
        )
        return None
    logger.info("X-ray model path resolved: %s (exists=%s)", path, os.path.isfile(path))
    try:
        from tensorflow.keras.models import load_model
        _xray_model = load_model(path, safe_mode=False, compile=False)
        _xray_loaded = True
        logger.info("X-ray model loaded successfully from %s", path)
        print("X-ray model loaded successfully")
    except ImportError as ex:
        logger.warning("TensorFlow not installed; X-Ray model unavailable: %s", ex)
        print("X-ray load failed: TensorFlow not installed. Run the backend with a Python that has 'pip install tensorflow'.")
        _xray_model = None
    except (TypeError, EOFError, Exception) as ex:
        logger.warning("X-Ray load_model failed (%s), trying fallback: %s", type(ex).__name__, ex)
        print("Load model failed:", str(ex)[:200])
        print("Trying fallback weights loading...")
        try:
            from tensorflow.keras.applications import InceptionResNetV2
            _xray_model = InceptionResNetV2(
                weights=None,
                include_top=True,
                input_shape=(256, 256, 3),
                classes=4,
            )
            _xray_model.load_weights(path, by_name=True, skip_mismatch=True)
            _xray_loaded = True
            logger.info("X-Ray model loaded from weights %s", path)
            print("X-ray model loaded via fallback (weights only)")
        except Exception as e2:
            _xray_model = None
            logger.warning("X-Ray model not loaded (fallback failed): %s", e2)
            print("Fallback failed:", str(e2)[:200])
    if _xray_model is not None:
        print("X-ray model stored in memory")
    logger.info("Returning model: %s", _xray_model is not None)
    return _xray_model


# ---------------------------------------------------------------------------
# Public getters (backward compatible)
# ---------------------------------------------------------------------------

def get_ct_model():
    """Return cached CT model; load on first call."""
    return load_ct_model()


def get_brain_model():
    """Return cached Brain model; load on first call."""
    return load_brain_model()


def get_xray_model():
    """Return cached X-Ray model; load on first call."""
    model = load_xray_model()
    print("get_xray_model() returning model:", model is not None)
    return model


def is_ct_loaded() -> bool:
    return _ct_loaded and _ct_model is not None


def is_brain_loaded() -> bool:
    return _brain_loaded and _brain_model is not None


def is_xray_loaded() -> bool:
    return _xray_loaded and _xray_model is not None
