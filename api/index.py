import os
import sys

api_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(api_dir)
backend_dir = os.path.join(root_dir, "backend")

for d in [backend_dir, root_dir, api_dir]:
    if os.path.exists(d) and d not in sys.path:
        sys.path.insert(0, d)

from app.main import app
