from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.database import init_db
from app.api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dharm")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables are created
    logger.info("Starting up DHARM Backend API...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(
            f"Could not connect to PostgreSQL on startup ({e}). "
            "Please ensure your PostgreSQL server is running at the configured DATABASE_URL."
        )
    yield
    # Shutdown
    logger.info("Shutting down DHARM Backend API...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise REST API for DHARM Intelligent Logistics & Product Traceability ERP",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        msg = err.get("msg", "")
        if msg.startswith("Value error, "):
            msg = msg.replace("Value error, ", "", 1)
        errors.append({
            "loc": list(err.get("loc", [])),
            "msg": msg,
            "type": err.get("type")
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors}
    )


# CORS Middleware configuration (Supports Vercel & Render origins with credentials)
cors_origins = [o for o in settings.cors_origin_list if o != "*"]
if not cors_origins:
    cors_origins = [
        "http://localhost:5173", "http://localhost:5174", "http://localhost:4173", "http://localhost:3000",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:4173", "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router under both /api and /api/v1 prefixes
app.include_router(api_router, prefix=settings.API_V1_STR)
if settings.API_V1_STR != "/api/v1":
    app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to the DHARM Logistics & Product Traceability ERP API",
        "documentation": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "version": settings.VERSION
    }

# Container Barcode Scanning API verified

