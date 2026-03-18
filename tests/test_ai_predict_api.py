"""
API tests for /ai/predict (unified endpoint).
Tests: model_type=ct, brain, xray; response format; error handling.
Requires: backend running (e.g. uvicorn main:app), requests, Pillow optional for real image.
"""
import io
import os
import sys

# Minimal 1x1 PNG (valid image for content-type check)
MINIMAL_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def b64_to_bytes(s):
    import base64
    return base64.b64decode(s)


def make_minimal_png():
    return b64_to_bytes(MINIMAL_PNG_BASE64)


def test_predict_endpoint(base_url="http://localhost:8000"):
    """Test POST /ai/predict with model_type and file. Validates response shape."""
    try:
        import requests
    except ImportError:
        print("SKIP: install requests to run API tests")
        return []
    out = []
    files = {"file": ("test.png", make_minimal_png(), "image/png")}

    # --- Valid model types ---
    for model_type in ("ct", "brain", "xray"):
        try:
            r = requests.post(
                f"{base_url}/ai/predict",
                params={"model_type": model_type},
                files=files,
                timeout=60,
            )
            out.append({"model_type": model_type, "status": r.status_code, "body": r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text})
            assert r.status_code == 200, f"Expected 200 for model_type={model_type}, got {r.status_code}"
            data = r.json()
            assert "model" in data, "Missing 'model' in response"
            assert "prediction" in data, "Missing 'prediction' in response"
            assert "confidence" in data, "Missing 'confidence' in response"
            conf = data["confidence"]
            assert isinstance(conf, (int, float)), "confidence must be number"
            assert 0 <= conf <= 1 or 0 <= conf <= 100, "confidence should be 0-1 or 0-100"
            out[-1]["pass"] = True
        except Exception as e:
            out.append({"model_type": model_type, "pass": False, "error": str(e)})
    # Reset file for next request (consumed)
    files = {"file": ("test2.png", make_minimal_png(), "image/png")}

    # --- Invalid model_type ---
    try:
        r = requests.post(
            f"{base_url}/ai/predict",
            params={"model_type": "invalid"},
            files=files,
            timeout=10,
        )
        out.append({"test": "invalid_model_type", "status": r.status_code})
        out[-1]["pass"] = r.status_code == 400
    except Exception as e:
        out.append({"test": "invalid_model_type", "pass": False, "error": str(e)})

    # --- No file (422) ---
    try:
        r = requests.post(
            f"{base_url}/ai/predict",
            params={"model_type": "ct"},
            timeout=10,
        )
        out.append({"test": "no_file", "status": r.status_code})
        out[-1]["pass"] = r.status_code == 422
    except Exception as e:
        out.append({"test": "no_file", "pass": False, "error": str(e)})

    return out


if __name__ == "__main__":
    base = os.environ.get("API_BASE_URL", "http://localhost:8000")
    print(f"Testing {base}/ai/predict ...")
    results = test_predict_endpoint(base)
    for r in results:
        status = "PASS" if r.get("pass") else "FAIL"
        print(f"  {status}: {r}")
    fails = [r for r in results if not r.get("pass")]
    sys.exit(1 if fails else 0)
