from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from MODELS.CT_ScanModel import CTScan
from MODELS.PatientModel import PatientModel
from SCHEMAS.CT_ScanSchema import CTScanCreate, CTScanResponse
from oauth import get_current_user
from typing import List

router = APIRouter(
    prefix="/ct-scans",
    tags=["CT Scan"]
)


@router.post("/", response_model=CTScanResponse, status_code=status.HTTP_201_CREATED)
def create_ct_scan(
    ct_scan: CTScanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Only doctors can upload CT scans
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can upload CT scans"
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
