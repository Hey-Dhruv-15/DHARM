from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.products import router as products_router
from app.api.containers import router as containers_router
from app.api.shipments import router as shipments_router
from app.api.discrepancies import router as discrepancies_router
from app.api.scans import router as scans_router
from app.api.returns import router as returns_router
from app.api.audit import router as audit_router
from app.api.health import router as health_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(products_router)
api_router.include_router(containers_router)
api_router.include_router(shipments_router)
api_router.include_router(discrepancies_router)
api_router.include_router(scans_router)
api_router.include_router(returns_router)
api_router.include_router(audit_router)

__all__ = ["api_router"]
