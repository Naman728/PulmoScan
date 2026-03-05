"""
Application configuration loaded from environment variables.
Loads from .env file via python-dotenv. Never commit .env to version control.
"""
from dotenv import load_dotenv
import os

load_dotenv()

# Database: use DATABASE_URL if set, otherwise build from components
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_PORT = os.getenv("DATABASE_PORT", "5432")
    DATABASE_USER = os.getenv("DATABASE_USER", "")
    DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "")
    DATABASE_URL = (
        f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}"
        f"@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
    )

# JWT / Auth
SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Optional API keys (comma-separated or single value)
API_KEYS_RAW = os.getenv("API_KEYS", "")
API_KEYS = [k.strip() for k in API_KEYS_RAW.split(",") if k.strip()] if API_KEYS_RAW else []
