from typing import Optional, Dict
from pydantic import BaseModel
from datetime import datetime


class PredictionBase(BaseModel):
    risk_score: float
    final_diagnosis: str
    confidence: Optional[float] = None
    urgency_level: Optional[str] = None


class PredictionCreate(PredictionBase):
    patient_id: int
    model_outputs: Optional[Dict] = None


class PredictionResponse(PredictionBase):
    id: int
    patient_id: int
    model_outputs: Optional[Dict] = None
    created_at: datetime

    class Config:
        from_attributes = True