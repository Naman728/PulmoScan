from fastapi import APIRouter, UploadFile, File
from app.ai_models.predict import predict_ct, predict_xray
import shutil

router = APIRouter()

@router.post("/predict/ct")
async def predict_ct_scan(file: UploadFile = File(...)):

    path = f"temp_{file.filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = predict_ct(path)

    return {"prediction": result}


@router.post("/predict/xray")
async def predict_xray_scan(file: UploadFile = File(...)):

    path = f"temp_{file.filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = predict_xray(path)

    return {"prediction": result}