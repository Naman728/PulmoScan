# Backend restart required for /ai routes

If the frontend shows **"Not Found"** for CT/Brain/X-ray analysis:

1. **Cause:** The process on port 8000 was started **before** the AI router was loaded or was never restarted. So `GET /` works but `GET /ai/health` and `POST /ai/predict` return 404.

2. **Fix:** Restart the backend from the **project root** so it loads current `main.py` (with `app.include_router(ai_prediction.router)`):

   ```bash
   # From project root: /Users/namananand/PulmoScan
   lsof -ti:8000 | xargs kill -9
   python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Verify:** After restart you should see in the terminal:
   - `PulmoScan backend started (main.py). GET /ai/health, POST /ai/predict?model_type=ct|brain|xray`
   Then test: `curl -s http://localhost:8000/ai/health` → must return `{"status":"ok",...}` (200), not 404.

4. **Frontend:** No `.env` in `frontend/` means the app uses `http://localhost:8000`. To use another port, create `frontend/.env` with `VITE_API_URL=http://localhost:YOUR_PORT` and restart the Vite dev server.
