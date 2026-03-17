"""
AI prediction endpoints: upload image(s), run model, return prediction and confidence.
"""
import os
import shutil
import tempfile
import uuid
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException
from logging import getLogger

from app.ai_models.predict import predict_ct_scan_multi, predict_xray

logger = getLogger(__name__) 
router = APIRouter(prefix="/ai", tags=["AI Predictions"])


# File validation (optional; keep permissive for compatibility)
MAX_FILE_SIZE_MB = 50
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".dcm", ".gif", ".webp"}


def _save_upload(file: UploadFile) -> str:
    """Save uploaded file to a temp path; return path."""
    suffix = os.path.splitext(file.filename or "")[1] or ".png"
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path


def _is_image_content_type(content_type: str) -> bool:
    return content_type and content_type.startswith("image/")


def _validate_file(file: UploadFile, max_size_mb: float = MAX_FILE_SIZE_MB) -> Optional[str]:
    """Validate file type and size. Returns error message or None."""
    if not file.filename:
        return "Missing filename"
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext and ext not in ALLOWED_IMAGE_EXTENSIONS:
        return f"Unsupported format. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
    if file.size is not None and file.size > max_size_mb * 1024 * 1024:
        return f"File too large. Max {max_size_mb} MB."
    return None


@router.post("/predict/ctscan")
async def predict_ctscan_endpoint(
    files: Optional[List[UploadFile]] = None,
    file: Optional[UploadFile] = None,
):
    """
    Accept one or multiple CT scan images. Send as "files" (multiple) or "file" (single).
    Returns per-slice results plus an aggregated final diagnosis (majority vote).
    """
    uploads: List[UploadFile] = []
    if files:
        uploads = list(files)
    elif file and file.filename:
        uploads = [file]
    if not uploads:
        raise HTTPException(
            status_code=422,
            detail="Upload at least one image. Use form field 'files' (multiple) or 'file' (single).",
        )

    paths = []
    try:
        for f in uploads:
            if not f.filename:
                continue
            if not _is_image_content_type(f.content_type or ""):
                raise HTTPException(status_code=400, detail=f"File {f.filename} is not an image")
            err = _validate_file(f)
            if err:
                raise HTTPException(status_code=400, detail=f"{f.filename}: {err}")
            paths.append(_save_upload(f))

        if not paths:
            raise HTTPException(status_code=400, detail="No valid image files received")

        result = predict_ct_scan_multi(paths)
        scan_id = str(uuid.uuid4())[:8]
        result["scan_id"] = scan_id
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        output_dir = os.path.join(project_root, "outputs", scan_id)
        os.makedirs(output_dir, exist_ok=True)

        base = f"outputs/{scan_id}/"
        prefix = f"/outputs/{scan_id}/"

        def _path_if(cond, filename):
            return (base + filename) if cond else ""
        def _url_if(cond, filename):
            return (prefix + filename) if cond else ""

        analysis = None
        try:
            from app.ai_models.explainability import run_ct_explainability
            diagnosis = result.get("final_diagnosis") or ""
            conf = result.get("final_confidence") or 0.0

            slice_results = result.get("slice_results", [])
            abnormal_slices = [s for s in slice_results if s.get("prediction") and s.get("prediction") != "Normal" and not str(s.get("prediction")).startswith("Error")]
            if abnormal_slices:
                best_slice_data = max(abnormal_slices, key=lambda x: x.get("confidence", 0.0))
            else:
                normal_slices = [s for s in slice_results if s.get("prediction") == "Normal"]
                best_slice_data = max(normal_slices, key=lambda x: x.get("confidence", 0.0)) if normal_slices else {}

            best_slice = best_slice_data.get("path", paths[0])
            logger.info("Selected slice: %s", best_slice)
            
            analysis = run_ct_explainability(best_slice, diagnosis, conf, output_dir=output_dir)
        except Exception as e:
            logger.exception("CT explainability failed: %s", e)

        if analysis is not None:
            has_patient = bool(analysis.get("patient_ct_path"))
            has_normal = bool(analysis.get("normal_reference_path"))
            has_heatmap = bool(analysis.get("heatmap_path"))
            has_deviation = bool(analysis.get("deviation_map_path"))
            has_overlay = bool(analysis.get("overlay_path") or analysis.get("region_visualization_path"))
            has_regions = bool(analysis.get("region_visualization_path") or analysis.get("suspicious_regions_path"))

            result["analysis"] = {
                **analysis,
                "patient_ct_path": _path_if(True, "patient_ct.png"),
                "normal_reference_path": _path_if(True, "normal_reference.png"),
                "heatmap_path": _path_if(has_heatmap, "heatmap.png"),
                "deviation_map_path": _path_if(has_deviation, "deviation_map.png"),
                "overlay_path": _path_if(has_overlay, "gradcam_overlay.png"),
                "region_visualization_path": _path_if(has_regions, "suspicious_regions.png"),
                "suspicious_regions_path": _path_if(has_regions, "suspicious_regions.png"),
            }
            result["patient_ct"] = base + "patient_ct.png"
            result["heatmap"] = _path_if(has_heatmap, "heatmap.png")
            result["deviation_map"] = _path_if(has_deviation, "deviation_map.png")
            result["gradcam_overlay"] = _path_if(has_overlay, "gradcam_overlay.png")
            result["regions_overlay"] = _path_if(has_regions, "suspicious_regions.png")
            result["suspicious_regions"] = _path_if(has_regions, "suspicious_regions.png")
            result["normal_reference"] = base + "normal_reference.png"
            result["regions_found"] = analysis.get("regions_found", 0)
            result["regions"] = analysis.get("regions", [])
            result["features"] = analysis.get("features", {})
            result["mean_score"] = analysis.get("mean_score", 0)
            result["risk_level"] = "High" if conf >= 0.7 else ("Medium" if conf >= 0.4 else "Low")
            result["detected_regions"] = analysis.get("regions_found", 0)
            result["images"] = {
                "patient_ct": prefix + "patient_ct.png",
                "normal_reference": prefix + "normal_reference.png",
                "deviation_map": _url_if(has_deviation, "deviation_map.png"),
                "suspicious_regions": _url_if(has_regions, "suspicious_regions.png"),
                "heatmap": _url_if(has_heatmap, "heatmap.png"),
                "gradcam": _url_if(has_overlay, "gradcam_overlay.png"),
            }
            logger.info(
                "CT visualizations: heatmap=%s gradcam=%s deviation=%s suspicious=%s regions=%s",
                result["heatmap"] or "(none)", result["gradcam_overlay"] or "(none)",
                result["deviation_map"] or "(none)", result["suspicious_regions"] or "(none)",
                result["regions_found"],
            )
        else:
            result["analysis"] = {
                "regions_found": 0,
                "regions": [],
                "features": {},
                "mean_score": int(round((result.get("final_confidence") or 0) * 100)),
                "patient_ct_path": "",
                "normal_reference_path": "",
                "heatmap_path": "",
                "deviation_map_path": "",
                "overlay_path": "",
                "region_visualization_path": "",
                "suspicious_regions_path": "",
            }
            result["patient_ct"] = result["heatmap"] = result["deviation_map"] = result["gradcam_overlay"] = ""
            result["regions_overlay"] = result["suspicious_regions"] = result["normal_reference"] = ""
            result["regions_found"] = 0
            result["regions"] = []
            result["features"] = {}
            conf = result.get("final_confidence") or 0.0
            result["risk_level"] = "High" if conf >= 0.7 else ("Medium" if conf >= 0.4 else "Low")
            result["detected_regions"] = 0
            result["images"] = {
                "patient_ct": "",
                "normal_reference": "",
                "deviation_map": "",
                "suspicious_regions": "",
                "heatmap": "",
                "gradcam": "",
            }
            logger.warning("CT explainability returned None; returning minimal analysis (no image paths)")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in paths:
            if path and os.path.isfile(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


def _xray_risk_level(confidence: float) -> str:
    if confidence >= 0.7:
        return "High"
    if confidence >= 0.4:
        return "Medium"
    return "Low"


def _xray_ai_explanation(prediction: str, confidence: float, conditions: list) -> str:
    """Generate a short diagnostic insight from prediction and conditions."""
    pct = round(confidence * 100)
    pred_lower = (prediction or "").lower()
    if "error" in pred_lower or "model not available" in pred_lower:
        return "Analysis could not be completed. Please check the image and try again."
    detected = [c for c in conditions if c.get("status") == "Detected" and c.get("label") != prediction]
    parts = []
    if "pneumonia" in pred_lower:
        parts.append("patterns consistent with pneumonia such as lung opacity and consolidation")
    elif "tuberculosis" in pred_lower:
        parts.append("features suggestive of tuberculosis")
    elif "covid" in pred_lower:
        parts.append("findings associated with COVID-19 pulmonary involvement")
    else:
        parts.append("no significant abnormality; findings within normal limits")
    conf_text = "high" if pct >= 70 else "moderate" if pct >= 40 else "low"
    parts.append(f"Confidence is {conf_text}.")
    parts.append("Further clinical validation is recommended.")
    return "AI detected " + ". ".join(parts)


@router.post("/predict/xray")
async def predict_xray_endpoint(file: UploadFile = File(...)):
    """Accept X-ray image, preprocess, run model, return prediction and confidence."""
    if not _is_image_content_type(file.content_type or ""):
        raise HTTPException(status_code=400, detail="File must be an image")
    err = _validate_file(file)
    if err:
        raise HTTPException(status_code=400, detail=err)
    path = None
    try:
        path = _save_upload(file)
        result = predict_xray(path)
        conditions = result.get("conditions", [])
        confidence = result.get("confidence") or 0.0
        prediction = result.get("prediction") or ""
        risk_level = _xray_risk_level(confidence)
        ai_explanation = _xray_ai_explanation(prediction, confidence, conditions)
        probabilities = {c["label"].lower(): c.get("probability", 0) for c in conditions if isinstance(c.get("label"), str)}
        out = {
            "prediction": prediction,
            "confidence": confidence,
            "conditions": conditions,
            "risk_level": risk_level,
            "probabilities": probabilities,
            "ai_explanation": ai_explanation,
        }
        try:
            from app.ai_models.explainability import run_xray_explainability
            probs_list = [c.get("probability", 0) for c in conditions if isinstance(c.get("probability"), (int, float))]
            analysis = run_xray_explainability(prediction, confidence, probs_list)
            if analysis is not None:
                out["analysis"] = analysis
        except Exception:
            pass
        return out
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if path and os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass
