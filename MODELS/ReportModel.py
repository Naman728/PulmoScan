"""Report model: stores diagnostic report per scan (X-Ray or CT) for the Reports page."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    prediction_id = Column(Integer, nullable=True)  # link to Prediction for View Report
    scan_type = Column(String, nullable=False)  # "X-Ray" or "CT"
    diagnosis = Column(String, nullable=False)
    confidence = Column(Float, nullable=True)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientModel", back_populates="reports")
