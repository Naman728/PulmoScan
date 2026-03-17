from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class PatientModel(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)

    symptoms = Column(JSON, nullable=True)

    doctor_id = Column(Integer, ForeignKey("USERS.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("UserModel", back_populates="patients")

    ct_scans = relationship("CTScan", back_populates="patient", cascade="all, delete-orphan")

    predictions = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")

    x_rays = relationship("XRay", back_populates="patient", cascade="all, delete-orphan")

    reports = relationship("Report", back_populates="patient", cascade="all, delete-orphan")