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
    """AI models load lazily on first request (singleton cache). No eager load to avoid TF/PyTorch at startup."""
    print("PulmoScan backend started (main.py). GET /ai/health, POST /ai/predict?model_type=ct|brain|xray")
    try:
        from app.ai_models import model_loader
        logger.info(
            "AI models: CT/Brain/X-Ray will load on first use (lazy). "
            "Available: ct, brain, xray via /ai/predict?model_type=..."
        )
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
# AI predictions: router has prefix="/ai" -> POST /ai/predict?model_type=ct|brain|xray
app.include_router(ai_prediction.router)