"""
AI prediction endpoints: upload image(s), run model, return prediction and confidence.
"""
import os
import shutil
import tempfile
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.ai_models.predict import predict_ct_scan_multi, predict_xray

router = APIRouter(prefix="/ai", tags=["AI Predictions"])


def _save_upload(file: UploadFile) -> str:
    """Save uploaded file to a temp path; return path."""
    suffix = os.path.splitext(file.filename or "")[1] or ".png"
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path


def _is_image_content_type(content_type: str) -> bool:
    return content_type and content_type.startswith("image/")


@router.post("/predict/ctscan")
async def predict_ctscan_endpoint(
    files: Optional[List[UploadFile]] = File(None, description="CT scan images (multiple slices)"),
    file: Optional[UploadFile] = File(None, description="Single CT scan image (alternative to files)"),
):
    """
    Accept one or multiple CT scan images. Send as "files" (multiple) or "file" (single).
    Returns per-slice results plus an aggregated final diagnosis (majority vote).
    """
    uploads: List[UploadFile] = []
    if files:
        uploads = list(files)
    elif file and file.filename:
        uploads = [file]
    if not uploads:
        raise HTTPException(
            status_code=422,
            detail="Upload at least one image. Use form field 'files' (multiple) or 'file' (single).",
        )

    paths = []
    try:
        for f in uploads:
            if not f.filename:
                continue
            if not _is_image_content_type(f.content_type or ""):
                raise HTTPException(status_code=400, detail=f"File {f.filename} is not an image")
            paths.append(_save_upload(f))

        if not paths:
            raise HTTPException(status_code=400, detail="No valid image files received")

        result = predict_ct_scan_multi(paths)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in paths:
            if path and os.path.isfile(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


@router.post("/predict/xray")
async def predict_xray_endpoint(file: UploadFile = File(...)):
    """Accept X-ray image, preprocess, run model, return prediction and confidence."""
    if not _is_image_content_type(file.content_type or ""):
        raise HTTPException(status_code=400, detail="File must be an image")
    path = None
    try:
        path = _save_upload(file)
        result = predict_xray(path)
        return {
            "prediction": result["prediction"],
            "confidence": result["confidence"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if path and os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass
