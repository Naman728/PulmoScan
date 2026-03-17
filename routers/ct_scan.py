import logging
import os
import shutil
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from MODELS.CT_ScanModel import CTScan
from MODELS.PatientModel import PatientModel
from MODELS.PredictionModel import Prediction
from MODELS.ReportModel import Report
from oauth import get_current_user
from SCHEMAS.CT_ScanSchema import CTScanCreate, CTScanResponse

from app.ai_models.predict import predict_ct_scan

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/ct-scans",
    tags=["CT Scan"],
)

UPLOAD_DIR = "uploads/ct"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".dcm", ".gif", ".webp"}


def _ensure_upload_dir() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def _safe_save_path(filename: str) -> str:
    ext = os.path.splitext(filename or "image.png")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".png"
    return os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")


def _response_with_context(
    result: dict,
    image_path: str,
    patient_id: int,
    ct_scan_id: Optional[int] = None,
    prediction_id: Optional[int] = None,
    error: Optional[str] = None,
) -> dict:
    """Pass through full model result and add router context (image_path, patient_id, etc.)."""
    out = dict(result)
    out["image_path"] = image_path
    out["patient_id"] = patient_id
    if ct_scan_id is not None:
        out["ct_scan_id"] = ct_scan_id
    if prediction_id is not None:
        out["prediction_id"] = prediction_id
    if error:
        out["error"] = error
    return out


@router.post("/predict")
def predict_ct_upload(
    patient_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Upload a CT scan image, run the AI model, store the scan and result.
    Returns the full output from predict_ct_scan() (e.g. prediction, confidence,
    regions_found, feature_scores, gradcam, heatmap, regions, feature_analysis,
    deviation_map, normal_reference) plus image_path, patient_id, ct_scan_id, prediction_id.
    On failure returns same shape with error message and optional error key.
    """
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or administrators can upload CT scans",
        )
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to add CT scans for this patient",
        )
    if not file.filename or not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    _ensure_upload_dir()
    save_path = _safe_save_path(file.filename)
    image_path = save_path

    try:
        logger.info("CT upload: patient_id=%s, filename=%s", patient_id, file.filename)
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        logger.exception("CT file save failed: %s", e)
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except OSError:
                pass
        return _response_with_context(
            result={"prediction": "Error: Failed to save image", "confidence": 0.0},
            image_path="",
            patient_id=patient_id,
            error=str(e),
        )

    scan_id = str(uuid.uuid4())
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_root, "outputs", scan_id)
    os.makedirs(output_dir, exist_ok=True)

    try:
        result = predict_ct_scan(image_path, output_dir=output_dir)
    except Exception as e:
        logger.exception("CT prediction exception: %s", e)
        return _response_with_context(
            result={"prediction": f"Error: {str(e)}", "confidence": 0.0},
            image_path=image_path,
            patient_id=patient_id,
            error=str(e),
        )

    prediction_label = result.get("prediction") or "Unknown"
    confidence = result.get("confidence") or 0.0
    is_error = (str(prediction_label).startswith("Error") or
                prediction_label == "Model not available")

    if is_error:
        logger.warning("CT prediction returned error: %s", prediction_label)
        return _response_with_context(
            result=result,
            image_path=image_path,
            patient_id=patient_id,
            error=prediction_label,
        )

    base = f"outputs/{scan_id}/"
    prefix = f"/outputs/{scan_id}/"
    has_heatmap = bool(result.get("heatmap_path") or result.get("heatmap"))
    has_deviation = bool(result.get("deviation_map_path") or result.get("deviation_map"))
    has_overlay = bool(result.get("overlay_path") or result.get("region_visualization_path") or result.get("gradcam") or result.get("region_visualization"))
    features = result.get("feature_scores") or result.get("features", {})
    feature_analysis = result.get("feature_analysis") or {}
    mean_score = feature_analysis.get("mean_score", 0) if isinstance(feature_analysis, dict) else 0

    model_outputs = {
        "image_path": image_path,
        "scan_type": "ct",
        "scan_id": scan_id,
        "prediction": prediction_label,
        "confidence": confidence,
        "regions_found": result.get("regions_found", 0),
        "regions": result.get("regions", []),
        "features": features,
        "mean_score": mean_score,
        "patient_ct": base + "patient_ct.png",
        "normal_reference": base + "normal_reference.png",
        "heatmap": (base + "heatmap.png") if has_heatmap else "",
        "deviation_map": (base + "deviation_map.png") if has_deviation else "",
        "gradcam_overlay": (base + "gradcam_overlay.png") if has_overlay else "",
        "suspicious_regions": (base + "suspicious_regions.png") if has_overlay else "",
        "regions_overlay": (base + "suspicious_regions.png") if has_overlay else "",
        "analysis": {
            "patient_ct_path": base + "patient_ct.png",
            "normal_reference_path": base + "normal_reference.png",
            "heatmap_path": (base + "heatmap.png") if has_heatmap else "",
            "deviation_map_path": (base + "deviation_map.png") if has_deviation else "",
            "overlay_path": (base + "gradcam_overlay.png") if has_overlay else "",
            "region_visualization_path": (base + "suspicious_regions.png") if has_overlay else "",
            "suspicious_regions_path": (base + "suspicious_regions.png") if has_overlay else "",
            "regions_found": result.get("regions_found", 0),
            "regions": result.get("regions", []),
            "features": features,
            "mean_score": mean_score,
        },
        "images": {
            "patient_ct": prefix + "patient_ct.png",
            "normal_reference": prefix + "normal_reference.png",
            "deviation_map": (prefix + "deviation_map.png") if has_deviation else "",
            "suspicious_regions": (prefix + "suspicious_regions.png") if has_overlay else "",
            "heatmap": (prefix + "heatmap.png") if has_heatmap else "",
            "gradcam": (prefix + "gradcam_overlay.png") if has_overlay else "",
        },
    }

    risk_score = float(confidence) if confidence <= 1.0 else float(confidence) / 100.0
    urgency_level = "High" if risk_score >= 0.7 else "Medium" if risk_score >= 0.4 else "Low"

    try:
        ct_record = CTScan(patient_id=patient_id, file_path=image_path)
        db.add(ct_record)
        db.flush()
        new_prediction = Prediction(
            patient_id=patient_id,
            risk_score=risk_score,
            final_diagnosis=prediction_label,
            confidence=float(confidence),
            urgency_level=urgency_level,
            model_outputs=model_outputs,
        )
        db.add(new_prediction)
        db.flush()
        report = Report(
            patient_id=patient_id,
            prediction_id=new_prediction.id,
            scan_type="CT",
            diagnosis=prediction_label,
            confidence=float(confidence),
            image_path=image_path,
        )
        db.add(report)
        db.commit()
        db.refresh(ct_record)
        db.refresh(new_prediction)
        db.refresh(report)
        out_result = dict(result)
        out_result["scan_id"] = scan_id
        out_result["analysis"] = model_outputs.get("analysis", {})
        out_result["images"] = model_outputs.get("images", {})
        return _response_with_context(
            result=out_result,
            image_path=image_path,
            patient_id=patient_id,
            ct_scan_id=ct_record.id,
            prediction_id=new_prediction.id,
        )
    except Exception as e:
        logger.exception("CT DB save failed: %s", e)
        db.rollback()
        return _response_with_context(
            result=result,
            image_path=image_path,
            patient_id=patient_id,
            error="Failed to store result",
        )


@router.post("/", response_model=CTScanResponse, status_code=status.HTTP_201_CREATED)
def create_ct_scan(
    ct_scan: CTScanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Only doctors and admins can upload CT scans
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or administrators can upload CT scans"
        )

    # Check if patient exists
    patient = db.query(PatientModel).filter(PatientModel.id == ct_scan.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Check ownership (doctor owns patient)
    if patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to add CT scan to this patient"
        )

    new_ct_scan = CTScan(**ct_scan.dict())
    db.add(new_ct_scan)
    db.commit()
    db.refresh(new_ct_scan)

    return new_ct_scan


@router.get("/patient/{patient_id}", response_model=List[CTScanResponse])
def get_patient_ct_scans(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    ct_scans = db.query(CTScan).filter(CTScan.patient_id == patient_id).all()
    return ct_scans


@router.get("/", response_model=List[CTScanResponse])
def get_all_ct_scans(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    patient_ids = [p.id for p in db.query(PatientModel).filter(PatientModel.doctor_id == current_user.id).all()]
    ct_scans = db.query(CTScan).filter(CTScan.patient_id.in_(patient_ids)).all()
    return ct_scans


@router.get("/{ct_scan_id}", response_model=CTScanResponse)
def get_ct_scan(
    ct_scan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    ct_scan = db.query(CTScan).filter(CTScan.id == ct_scan_id).first()
    if not ct_scan:
        raise HTTPException(status_code=404, detail="CT Scan not found")

    patient = db.query(PatientModel).filter(PatientModel.id == ct_scan.patient_id).first()
    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return ct_scan


@router.delete("/{ct_scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ct_scan(
    ct_scan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    ct_scan = db.query(CTScan).filter(CTScan.id == ct_scan_id).first()
    if not ct_scan:
        raise HTTPException(status_code=404, detail="CT Scan not found")

    patient = db.query(PatientModel).filter(PatientModel.id == ct_scan.patient_id).first()
    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(ct_scan)
    db.commit()

    return
