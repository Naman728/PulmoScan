import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File

from app.ai_models.predict import predict_ct_scan, predict_xray

router = APIRouter()


@router.post("/predict/ct")
async def predict_ct_scan_route(file: UploadFile = File(...)):
    path = f"temp_{file.filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    scan_id = uuid.uuid4().hex[:8]
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(project_root, "outputs", scan_id)
    os.makedirs(output_dir, exist_ok=True)

    try:
        result = predict_ct_scan(path, output_dir=output_dir)
    finally:
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass

    result["scan_id"] = scan_id
    base = f"outputs/{scan_id}/"
    result["patient_ct"] = base + "patient_ct.png" if result.get("patient_ct") else ""
    result["heatmap"] = base + "heatmap.png" if result.get("heatmap") else ""
    result["deviation_map"] = base + "deviation_map.png" if result.get("deviation_map") else ""
    result["gradcam_overlay"] = base + "gradcam_overlay.png" if result.get("gradcam") else ""
    result["regions_overlay"] = base + "suspicious_regions.png" if result.get("region_visualization") else ""
    result["normal_reference"] = base + "normal_reference.png" if result.get("normal_reference") else ""
    return {"prediction": result}


@router.post("/predict/xray")
async def predict_xray_scan(file: UploadFile = File(...)):

    path = f"temp_{file.filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = predict_xray(path)

    return {
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "conditions": result.get("conditions", []),
    }