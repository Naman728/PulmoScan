from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PatientBase(BaseModel):
    name: str
    age: int
    gender: str


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int
    doctor_id: int
    created_at: datetime

    class Config:
        from_attributes = True