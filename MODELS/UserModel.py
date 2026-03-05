from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base

class UserModel(Base):
    __tablename__ = "USERS"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    # role: "admin" or "doctor"
    role = Column(String, nullable=False, default="doctor")

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship: One doctor → many patients
    patients = relationship("PatientModel", back_populates="doctor")