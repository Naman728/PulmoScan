from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from MODELS.PredictionModel import Prediction
from MODELS.PatientModel import PatientModel
from SCHEMAS.PredictionModel import PredictionCreate, PredictionResponse
from oauth import get_current_user
from typing import List

router = APIRouter(
    prefix="/predictions",
    tags=["Predictions"]
)


@router.post("/", response_model=PredictionResponse, status_code=status.HTTP_201_CREATED)
def create_prediction(
    prediction: PredictionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Only doctors and admins can create predictions
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors or administrators can create predictions"
        )

    # Check if patient exists
    patient = db.query(PatientModel).filter(PatientModel.id == prediction.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Check ownership
    if patient.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to add predictions for this patient"
        )

    new_prediction = Prediction(**prediction.dict())
    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)

    return new_prediction


@router.get("/patient/{patient_id}", response_model=List[PredictionResponse])
def get_patient_predictions(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    predictions = db.query(Prediction).filter(Prediction.patient_id == patient_id).all()
    return predictions


@router.get("/", response_model=List[PredictionResponse])
def get_all_predictions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Get all patients belonging to this doctor
    patient_ids = [p.id for p in db.query(PatientModel).filter(PatientModel.doctor_id == current_user.id).all()]
    if not patient_ids:
        return []
    # Get all predictions for those patients
    predictions = db.query(Prediction).filter(Prediction.patient_id.in_(patient_ids)).all()
    return predictions


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    patient = db.query(PatientModel).filter(PatientModel.id == prediction.patient_id).first()
    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return prediction


@router.delete("/{prediction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    patient = db.query(PatientModel).filter(PatientModel.id == prediction.patient_id).first()
    if patient.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(prediction)
    db.commit()

    return
