from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class XRay(Base):
    __tablename__ = "x_rays"

    id = Column(Integer, primary_key=True, index=True)

    # Link to Patient
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    # Store file location (NOT the image itself)
    file_path = Column(String, nullable=False)

    # Extra details
    body_part = Column(String, nullable=True)  # chest, leg, hand, etc.

    notes = Column(String, nullable=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    patient = relationship("PatientModel", back_populates="x_rays")