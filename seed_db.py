import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from database import SessionLocal, Base, engine
from MODELS.UserModel import UserModel
from MODELS.PatientModel import PatientModel
from MODELS.CT_ScanModel import CTScan
from MODELS.X_RayModel import XRay
from MODELS.PredictionModel import Prediction
import utils
from datetime import datetime

def seed_db():
    db = SessionLocal()
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # 1. Create a Doctor User
    doctor_email = "doctor@pulmoscan.com"
    doctor_password = "password123"
    
    # Check if user exists
    existing_user = db.query(UserModel).filter(UserModel.email == doctor_email).first()
    if existing_user:
        print(f"User {doctor_email} already exists.")
        user = existing_user
    else:
        hashed_password = utils.hash(doctor_password)
        user = UserModel(
            email=doctor_email,
            password=hashed_password,
            role="doctor"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created Doctor: {doctor_email} / {doctor_password}")

    # 2. Add some Patients
    patients_data = [
        {"name": "Rachman Bilhaq", "age": 48, "gender": "Male"},
        {"name": "Sarah Connor", "age": 32, "gender": "Female"},
        {"name": "John Doe", "age": 55, "gender": "Male"}
    ]
    
    patients = []
    for p_data in patients_data:
        existing_patient = db.query(PatientModel).filter(PatientModel.name == p_data["name"]).first()
        if not existing_patient:
            p = PatientModel(
                name=p_data["name"],
                age=p_data["age"],
                gender=p_data["gender"],
                doctor_id=user.id
            )
            db.add(p)
            patients.append(p)
        else:
            patients.append(existing_patient)
    
    db.commit()
    for p in patients:
        db.refresh(p)
    print(f"Added/Ensured {len(patients)} patients.")

    # 3. Add Scans and Predictions for the first patient (Rachman)
    rachman = patients[0]
    
    # Add a CT Scan
    ct = CTScan(
        patient_id=rachman.id,
        file_path="/uploads/ct/rachman_ct_1.dcm",
        scan_type="HRCT",
        notes="Suspected pulmonary nodule in upper left lobe."
    )
    db.add(ct)
    
    # Add an X-Ray
    xray = XRay(
        patient_id=rachman.id,
        file_path="/uploads/xray/rachman_xray_1.jpg",
        body_part="Chest",
        notes="Minor inflammation detected."
    )
    db.add(xray)
    db.commit()
    db.refresh(ct)
    db.refresh(xray)

    # Add Predictions
    pred1 = Prediction(
        patient_id=rachman.id,
        risk_score=0.85,
        final_diagnosis="Suspected Lung Nodule",
        confidence=92.5,
        urgency_level="High",
        model_outputs={"scan_id": ct.id, "type": "ct"}
    )
    
    pred2 = Prediction(
        patient_id=rachman.id,
        risk_score=0.30,
        final_diagnosis="Pneumonia Signs Detected",
        confidence=88.2,
        urgency_level="Medium",
        model_outputs={"scan_id": xray.id, "type": "xray"}
    )
    
    db.add(pred1)
    db.add(pred2)
    db.commit()
    
    print("Database seeding completed successfully.")
    db.close()

if __name__ == "__main__":
    seed_db()
