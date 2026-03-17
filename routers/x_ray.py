import logging
import os
import shutil
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from MODELS.PatientModel import PatientModel
from MODELS.PredictionModel import Prediction
from MODELS.ReportModel import Report
from MODELS.X_RayModel import XRay
from oauth import get_current_user
from SCHEMAS.X_RaySchema import XRayCreate, XRayResponse

from app.ai_models.predict import predict_xray

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/xrays",
    tags=["XRay"],
)

UPLOAD_DIR = "uploads/xrays"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".dcm", ".gif", ".webp"}


def _ensure_upload_dir() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def _safe_save_path(filename: str) -> str:
    ext = os.path.splitext(filename or "image.png")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".png"
    return os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")


def _build_response(
    prediction: str,
    confidence: float,
    image_path: str,
    patient_id: int,
    xray_id: Optional[int] = None,
    prediction_id: Optional[int] = None,
    error: Optional[str] = None,
) -> dict:
    """Consistent JSON response for predict endpoint."""
    out = {
        "prediction": prediction,
        "confidence": confidence,
        "image_path": image_path,
        "patient_id": patient_id,
    }
    if xray_id is not None:
        out["xray_id"] = xray_id
    if prediction_id is not None:
        out["prediction_id"] = prediction_id
    if error:
        out["error"] = error
    return out


@router.post("/predict")
def predict_xray_upload(
    patient_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Upload an X-ray image, run the AI model, store the scan and result.
    Returns consistent JSON: prediction, confidence, image_path, patient_id.
    On failure returns same shape with error message in prediction and optional error key.
    """
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or administrators can upload X-rays",
        )
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to add X-rays for this patient",
        )
    if not file.filename or not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    _ensure_upload_dir()
    save_path = _safe_save_path(file.filename)
    image_path = save_path

    try:
        logger.info("X-Ray upload: patient_id=%s, filename=%s", patient_id, file.filename)
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        logger.exception("X-Ray file save failed: %s", e)
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except OSError:
                pass
        return _build_response(
            prediction="Error: Failed to save image",
            confidence=0.0,
            image_path="",
            patient_id=patient_id,
            error=str(e),
        )

    try:
        result = predict_xray(image_path)
    except Exception as e:
        logger.exception("X-Ray prediction exception: %s", e)
        return _build_response(
            prediction=f"Error: {str(e)}",
            confidence=0.0,
            image_path=image_path,
            patient_id=patient_id,
            error=str(e),
        )

    prediction_label = result.get("prediction") or "Unknown"
    confidence = result.get("confidence") or 0.0
    is_error = (str(prediction_label).startswith("Error") or
                prediction_label == "Model not available")

    if is_error:
        logger.warning("X-Ray prediction returned error: %s", prediction_label)
        return _build_response(
            prediction=prediction_label,
            confidence=float(confidence),
            image_path=image_path,
            patient_id=patient_id,
            error=prediction_label,
        )

    risk_score = float(confidence) if confidence <= 1.0 else float(confidence) / 100.0
    urgency_level = "High" if risk_score >= 0.7 else "Medium" if risk_score >= 0.4 else "Low"

    try:
        xray_record = XRay(patient_id=patient_id, file_path=image_path)
        db.add(xray_record)
        db.flush()
        new_prediction = Prediction(
            patient_id=patient_id,
            risk_score=risk_score,
            final_diagnosis=prediction_label,
            confidence=float(confidence),
            urgency_level=urgency_level,
            model_outputs={
                "image_path": image_path,
                "scan_type": "xray",
                "scan_id": xray_record.id,
            },
        )
        db.add(new_prediction)
        db.flush()
        report = Report(
            patient_id=patient_id,
            prediction_id=new_prediction.id,
            scan_type="X-Ray",
            diagnosis=prediction_label,
            confidence=float(confidence),
            image_path=image_path,
        )
        db.add(report)
        db.commit()
        db.refresh(xray_record)
        db.refresh(new_prediction)
        db.refresh(report)
        return _build_response(
            prediction=prediction_label,
            confidence=confidence,
            image_path=image_path,
            patient_id=patient_id,
            xray_id=xray_record.id,
            prediction_id=new_prediction.id,
        )
    except Exception as e:
        logger.exception("X-Ray DB save failed: %s", e)
        db.rollback()
        return _build_response(
            prediction="Error: Failed to store result",
            confidence=float(confidence),
            image_path=image_path,
            patient_id=patient_id,
            error=str(e),
        )


@router.post("/", response_model=XRayResponse, status_code=status.HTTP_201_CREATED)
def create_xray(
    xray: XRayCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    # Allow only doctor or admin
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or administrators can upload X-rays"
        )

    # Check if patient exists
    patient = db.query(PatientModel).filter(PatientModel.id == xray.patient_id).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Check ownership (doctor owns patient)
    if patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to add XRay to this patient"
        )

    new_xray = XRay(**xray.dict())

    db.add(new_xray)
    db.commit()
    db.refresh(new_xray)

    return new_xray



@router.get("/patient/{patient_id}", response_model=List[XRayResponse])
def get_patient_xrays(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    xrays = db.query(XRay).filter(XRay.patient_id == patient_id).all()

    return xrays


@router.get("/", response_model=List[XRayResponse])
def get_all_xrays(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    patient_ids = [p.id for p in db.query(PatientModel).filter(PatientModel.doctor_id == current_user.id).all()]
    xrays = db.query(XRay).filter(XRay.patient_id.in_(patient_ids)).all()
    return xrays


@router.delete("/{xray_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_xray(
    xray_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    xray = db.query(XRay).filter(XRay.id == xray_id).first()

    if not xray:
        raise HTTPException(status_code=404, detail="XRay not found")

    patient = db.query(PatientModel).filter(PatientModel.id == xray.patient_id).first()

    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(xray)
    db.commit()

    return