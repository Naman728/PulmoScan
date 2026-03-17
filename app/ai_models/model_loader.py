"""
Load CT (PyTorch) and X-Ray (TensorFlow) models once at server startup (singleton).
Models are loaded at first import and never reloaded per request.
Uses CPU only.
"""
import os
import io
import zipfile
import logging

logger = logging.getLogger(__name__)
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_AI_MODELS = os.path.join(os.path.dirname(os.path.dirname(_BASE_DIR)), "ai_models")

# -------- Singleton: loaded once at import, never reloaded --------
ct_model = None
xray_model = None
_ct_loaded = False
_xray_loaded = False

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
    """Load state_dict from ct_model directory (zip in memory) and load into CTBrainModel.
    PyTorch expects zip entries under a subdirectory (e.g. archive/.format_version, archive/data.pkl)."""
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

try:
    import torch
    _ct_kind_path = _find_ct_model_path()
    if _ct_kind_path:
        _kind, _ct_path = _ct_kind_path
        try:
            if _kind == "file":
                ct_model = torch.load(_ct_path, map_location=torch.device("cpu"), weights_only=False)
                if ct_model is not None and not hasattr(ct_model, "eval"):
                    # might be state_dict or checkpoint
                    from app.ai_models.ct_architecture import CTBrainModel
                    state = ct_model if isinstance(ct_model, dict) else getattr(ct_model, "state_dict", lambda: None)()
                    if state is not None:
                        m = CTBrainModel()
                        m.load_state_dict(state, strict=False)
                        m.eval()
                        ct_model = m
                    else:
                        ct_model = ct_model
                elif ct_model is not None and hasattr(ct_model, "eval"):
                    ct_model.eval()
            else:
                ct_model = _load_ct_from_directory(_ct_path)
            if ct_model is not None:
                _ct_loaded = True
                logger.info("CT model loaded from %s", _ct_path)
        except Exception as e:
            ct_model = None
            logger.warning("CT model not loaded from %s: %s", _ct_path, e)
    else:
        logger.warning("CT model file not found. Place ct_model.pth or ct_model.pt or ct_model/ in app/ai_models/ or ai_models/")
except Exception as e:
    ct_model = None
    logger.warning("CT model not loaded: %s", e)

# -------- X-RAY MODEL (TensorFlow/Keras) --------
try:
    import tensorflow as tf
    _xray_path = os.path.join(_BASE_DIR, "model.inceptionresnetv2.h5")
    if not os.path.isfile(_xray_path):
        _xray_path = os.path.join(_ROOT_AI_MODELS, "model.inceptionresnetv2.h5")
    if os.path.isfile(_xray_path):
        try:
            xray_model = tf.keras.models.load_model(_xray_path, safe_mode=False)
            _xray_loaded = True
            logger.info("X-Ray model loaded from %s", _xray_path)
        except (TypeError, EOFError, Exception) as ex:
            xray_model = tf.keras.applications.InceptionResNetV2(
                weights=None,
                include_top=True,
                input_shape=(256, 256, 3),
                classes=4,
            )
            xray_model.load_weights(_xray_path, by_name=True, skip_mismatch=True)
            _xray_loaded = True
            logger.info("X-Ray model loaded from weights %s", _xray_path)
    else:
        logger.warning("X-Ray model file not found: %s", _xray_path)
except Exception as e:
    xray_model = None
    logger.warning("X-Ray model not loaded: %s", e)


def get_ct_model():
    """Return the CT model singleton (loaded once at startup). Never reloads."""
    return ct_model


def get_xray_model():
    """Return the X-Ray model singleton (loaded once at startup). Never reloads."""
    return xray_model


def is_ct_loaded() -> bool:
    return _ct_loaded and ct_model is not None


def is_xray_loaded() -> bool:
    return _xray_loaded and xray_model is not None
