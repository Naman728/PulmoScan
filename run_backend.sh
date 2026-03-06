#!/usr/bin/env bash
# Run FastAPI backend (no need to activate venv)
cd "$(dirname "$0")"
exec ./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
