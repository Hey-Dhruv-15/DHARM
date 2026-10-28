from contextlib import asynccontextmanager
from fastapi import FastAPI
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

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list if settings.cors_origin_list else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router under /api prefix
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to the DHARM Logistics & Product Traceability ERP API",
        "documentation": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "version": settings.VERSION
    }
