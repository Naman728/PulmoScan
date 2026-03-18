# AI Predict – Test Summary & Validation

## 1. API Testing

### Endpoint: `POST /ai/predict`

| Test | Expected | How to verify |
|------|----------|----------------|
| `model_type=ct` | 200, `{ model, prediction, confidence }` | Send image file + `?model_type=ct` |
| `model_type=brain` | 200, same shape | Send image file + `?model_type=brain` |
| `model_type=xray` | 200, same shape | Send image file + `?model_type=xray` |
| Invalid `model_type` | 400, detail message | e.g. `?model_type=invalid` |
| No file | 422 | POST without `file` in body |
| Corrupted / non-image file | 400 or 200 with error in body | Depends on validation |

**Run API tests (backend must be running on port 8000):**

```bash
pip install requests  # if needed
python tests/test_ai_predict_api.py
# Or: API_BASE_URL=http://localhost:8000 python tests/test_ai_predict_api.py
```

- **Response format:** `{ "model": "ct"|"brain"|"xray", "prediction": string, "confidence": float (0–1), "conditions"?: array, "error"?: string }`.
- **Confidence:** Backend returns 0–1. Frontend shows as percentage (e.g. 93%).

---

## 2. Frontend Integration

### Where to test

- **Route:** `/ai-predict` (sidebar: **AI Predict (CT / Brain / X-ray)**).
- **Flow:** Choose image → pick model card (CT, Brain, or X-ray) → **Run AI Analysis** → result under that card.

### Checks

- **Model selection:** Three cards: CT Scan, Brain, X-Ray. Each uses the correct `model_type` for the unified API.
- **Image upload:** One file per card; preview and clear work.
- **API call:** `POST /ai/predict` with `params: { model_type }` and multipart `file` (see `api.js` `predictUnified`).
- **UI display:**
  - **Model name:** Shown as “Model: CT” / “Model: BRAIN” / “Model: XRAY” from `result.model`.
  - **Prediction:** Shown clearly; errors (e.g. “Error: …”, “Model not available”) in red.
  - **Confidence:** Shown as percentage; bar uses 0–100.
- **Loading:** “Analyzing…” with spinner while request is in flight.
- **Errors:** API errors and `result.error` shown in red box; no blank screen or undefined.

### Existing flows (unchanged)

- **CT workflow (multi-slice):** `/upload-scan` → upload → **Run Analysis** → `/processing` → `/results`. Still uses `POST /ai/predict/ctscan` (unchanged).
- **X-ray on workflow:** Same flow with X-ray type; still uses `POST /ai/predict/xray` (unchanged).

---

## 3. Functional Testing

| Model | Pipeline | Confidence range |
|-------|----------|------------------|
| CT | PyTorch, single image via unified | 0–1 |
| Brain | PyTorch, `brain_model/` | 0–1 |
| X-ray | TensorFlow, InceptionResNetV2 | 0–1 |

- No pipeline mix-up: each `model_type` uses its own loader and preprocessing in `predict.py` and `model_loader.py`.

---

## 4. Error Handling

- **Invalid `model_type`:** Backend 400; frontend shows API error message.
- **No file:** Backend 422; frontend toast “Please select an image for …”.
- **Corrupted image:** Backend may return 200 with `prediction: "Error: …"` and `error`; frontend shows that in the result card and does not crash.

---

## 5. Performance & Stability

- **No reload per request:** Models are loaded once (lazy) and cached in `model_loader.py` (`load_ct_model`, `load_brain_model`, `load_xray_model`).
- **Sequence ct → brain → xray:** No framework mix in the same request; TF only used in xray path, PyTorch only in ct/brain.
- **Repeated calls:** Same cached model; response time stable after first load.

---

## 6. Logging

- **Backend:** `logger.info("Unified predict requested: model_type=%s", model_type)` in `ai_prediction.py`; prediction errors logged via `logger.exception` in `predict.py`.
- **Frontend:** API errors in console (axios interceptor); user-facing errors in toast and red result/error box.

---

## 7. Validation Checklist

| Item | Status |
|------|--------|
| CT model unchanged and working (existing endpoints + unified) | Yes |
| Brain model loads from `brain_model/` | Yes (lazy, cached) |
| X-ray model loads via TensorFlow | Yes (lazy, cached) |
| API response shape correct | Yes |
| Frontend shows model name, prediction, confidence | Yes on `/ai-predict` |
| Loading and error states | Yes |
| No crash on invalid input / server error | Handled |

---

## 8. Fixes Applied

1. **API:** Unified `POST /ai/predict` with `model_type` (ct | brain | xray); validation and error response for invalid `model_type` and missing file.
2. **Frontend:** `predictUnified(file, modelType)` in `api.js`; AIPredict page refactored to three cards (CT, Brain, X-ray) using unified API; result shows **Model**, **Prediction**, **Confidence**; loading and error UI.
3. **Routing:** `/ai-predict` now renders AIPredict page; sidebar link “AI Predict (CT / Brain / X-ray)” added.
4. **Backend:** Logging of `model_type` in unified endpoint.
5. **Tests:** `tests/test_ai_predict_api.py` for response shape and error cases (run with backend up).

---

## 9. Suggestions (UI/UX)

- Add a short “How it works” line under the title (e.g. “Pick a model, upload one image, get result and confidence”).
- Optional: show `conditions` (e.g. per-class probabilities) in an expandable section when the API returns them.
- Optional: remember last used model per session (e.g. localStorage) and pre-select that card.
- Keep existing CT workflow and X-ray workflow unchanged; use `/ai-predict` for quick single-image, multi-model testing and demos.
