import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path or sys.path[0] != backend_dir:
    sys.path.insert(0, backend_dir)

from app.database import init_db
init_db()
