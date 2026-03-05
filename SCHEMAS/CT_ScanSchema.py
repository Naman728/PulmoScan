from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CTScanBase(BaseModel):
    scan_type: Optional[str] = None
    notes: Optional[str] = None


class CTScanCreate(CTScanBase):
    patient_id: int
    file_path: str


class CTScanResponse(CTScanBase):
    id: int
    patient_id: int
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True