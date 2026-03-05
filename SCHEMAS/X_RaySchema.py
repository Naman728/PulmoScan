from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class XRayBase(BaseModel):
    body_part: Optional[str] = None
    notes: Optional[str] = None


class XRayCreate(XRayBase):
    patient_id: int
    file_path: str


class XRayResponse(XRayBase):
    id: int
    patient_id: int
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True