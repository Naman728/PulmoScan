import logging
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import Base, engine, get_db
import MODELS
from routers import auth, ct_scan, patient, prediction, report, x_ray, user
from app.routers import ai_prediction

logger = logging.getLogger(__name__)
app = FastAPI()

# Serve explainability outputs (heatmap, overlay) so frontend can load images by path
_outputs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outputs")
os.makedirs(_outputs_dir, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=_outputs_dir), name="outputs")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.on_event("startup")
def startup_load_models():
    """Load AI models once at server startup (singleton)."""
    try:
        from app.ai_models import model_loader
        ct_ok = model_loader.is_ct_loaded()
        xray_ok = model_loader.is_xray_loaded()
        logger.info("AI models at startup: CT=%s, X-Ray=%s", ct_ok, xray_ok)
    except Exception as e:
        logger.warning("Model loader import at startup: %s", e)


@app.get("/")
def read_root():
    return {"message": "Hello World , welcome to the API"}


app.include_router(auth.router)
app.include_router(user.router)
app.include_router(x_ray.router)
app.include_router(ct_scan.router)
app.include_router(patient.router)
app.include_router(prediction.router)
app.include_router(report.router)
app.include_router(ai_prediction.router)