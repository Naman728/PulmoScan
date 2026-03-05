from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class CTScan(Base):
    __tablename__ = "ct_scans"

    id = Column(Integer, primary_key=True, index=True)

    # Link to Patient
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    # File storage path (S3/local storage/etc.)
    file_path = Column(String, nullable=False)

    # Optional: store extracted metadata
    scan_type = Column(String, nullable=True)  # e.g. HRCT, Contrast
    notes = Column(String, nullable=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    patient = relationship("PatientModel", back_populates="ct_scans")