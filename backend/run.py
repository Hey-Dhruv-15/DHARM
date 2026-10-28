import sys
import argparse
import uvicorn

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from app.config import settings
from app.seed import seed_database


def main():
    parser = argparse.ArgumentParser(description="Run DHARM FastAPI Backend")
    parser.add_argument("--seed", action="store_true", help="Seed the database with initial demo data before starting")
    parser.add_argument("--host", type=str, default=settings.HOST, help="Host to bind server to")
    parser.add_argument("--port", type=int, default=settings.PORT, help="Port to run server on")
    parser.add_argument("--reload", action="store_true", default=settings.DEBUG, help="Enable auto-reload on code change")

    args = parser.parse_args()

    if args.seed:
        print("[SEED] Seeding database...")
        try:
            seed_database()
        except Exception as e:
            print(f"[WARN] Seeding notice: {e}")

    print(f"[START] Starting DHARM Backend server at http://{args.host}:{args.port}")
    print(f"[DOCS] Swagger interactive API documentation: http://localhost:{args.port}/docs")
    print(f"[DOCS] ReDoc interactive documentation: http://localhost:{args.port}/redoc")

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload
    )


if __name__ == "__main__":
    main()
