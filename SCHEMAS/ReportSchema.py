from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class SaveReportRequest(BaseModel):
    """Body for POST /reports/save (CT analysis save)."""
    scan_id: Optional[str] = None
    patient_id: Optional[int] = None
    prediction: str
    confidence: Optional[float] = None
    images: Optional[Dict[str, Any]] = None


class ReportBase(BaseModel):
    scan_type: str
    diagnosis: str
    confidence: Optional[float] = None
    image_path: Optional[str] = None


class ReportCreate(ReportBase):
    patient_id: int


class ReportResponse(ReportBase):
    id: int
    patient_id: int
    prediction_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
