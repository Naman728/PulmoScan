"""Reports endpoint: list diagnostic reports for the current doctor's patients."""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from MODELS.PatientModel import PatientModel
from MODELS.ReportModel import Report
from oauth import get_current_user
from SCHEMAS.ReportSchema import ReportResponse, SaveReportRequest

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/", response_model=List[ReportResponse])
def get_all_reports(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return all reports for patients belonging to the current doctor."""
    patient_ids = [
        p.id for p in db.query(PatientModel).filter(PatientModel.doctor_id == current_user.id).all()
    ]
    if not patient_ids:
        return []
    reports = db.query(Report).filter(Report.patient_id.in_(patient_ids)).order_by(Report.created_at.desc()).all()
    return reports


@router.get("/patient/{patient_id}", response_model=List[ReportResponse])
def get_patient_reports(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return reports for a specific patient (if owned by current doctor)."""
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    reports = db.query(Report).filter(Report.patient_id == patient_id).order_by(Report.created_at.desc()).all()
    return reports


@router.post("/save", response_model=ReportResponse)
def save_report(
    body: SaveReportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Save CT (or X-Ray) analysis as a report. Creates placeholder patient if patient_id not provided."""
    patient_id = body.patient_id
    if patient_id is None:
        placeholder = db.query(PatientModel).filter(
            PatientModel.doctor_id == current_user.id,
            PatientModel.name == "Scan Patient",
        ).first()
        if placeholder:
            patient_id = placeholder.id
        else:
            placeholder = PatientModel(
                name="Scan Patient",
                age=0,
                gender="Other",
                doctor_id=current_user.id,
            )
            db.add(placeholder)
            db.commit()
            db.refresh(placeholder)
            patient_id = placeholder.id
    else:
        patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        if patient.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    image_path = None
    if body.images:
        image_path = json.dumps(body.images) if isinstance(body.images, dict) else str(body.images)

    report = Report(
        patient_id=patient_id,
        scan_type="CT",
        diagnosis=body.prediction or "CT Analysis",
        confidence=body.confidence,
        image_path=image_path,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
