from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from MODELS.X_RayModel import XRay
from MODELS.PatientModel import PatientModel
from SCHEMAS.X_RaySchema import XRayCreate, XRayResponse
from oauth import get_current_user
from typing import List

router = APIRouter(
    prefix="/xrays",
    tags=["XRay"]
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