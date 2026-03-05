from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)

    # Link to patient
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    # AI Output
    risk_score = Column(Float, nullable=False)  # 0 to 1 probability
    final_diagnosis = Column(String, nullable=False)
    confidence = Column(Float, nullable=True)   # percentage confidence
    urgency_level = Column(String, nullable=True)  # low / medium / high

    # Store detailed AI outputs (from CT/X-ray models)
    model_outputs = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    patient = relationship("PatientModel", back_populates="predictions")