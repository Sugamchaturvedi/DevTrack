import os
import sys
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse

debug_error = None
app = None

try:
    api_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(api_dir)
    backend_dir = os.path.join(root_dir, "backend")

    for d in [backend_dir, root_dir, api_dir]:
        if os.path.exists(d) and d not in sys.path:
            sys.path.insert(0, d)

    from app.main import app as main_app
    app = main_app
except Exception as e:
    debug_error = traceback.format_exc()
    print(f"CRITICAL APP STARTUP ERROR: {debug_error}")
    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
    def catch_all_debug(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Application startup failure in serverless environment",
                "traceback": debug_error
            }
        )
