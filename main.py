from fastapi import FastAPI 
from database import Base , engine , get_db
import MODELS
from routers import auth , ct_scan  , patient , prediction , x_ray , user
from app.routers import ai_prediction




app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind = engine)


@app.get("/")
def read_root():
    return {"message": "Hello World , welcome to the API"}


app.include_router(auth.router)
app.include_router(user.router)
app.include_router(x_ray.router)
app.include_router(ct_scan.router)
app.include_router(patient.router)
app.include_router(prediction.router)
app.include_router(ai_prediction.router)