from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.database import get_db
from app.models.audit import AuditEvent
from app.schemas.audit import AuditEventCreate, AuditEventOut

router = APIRouter(prefix="/audit", tags=["Audit Trail & Custody Ledger"])


@router.get("", response_model=List[AuditEventOut])
def list_audit_events(
    limit: int = Query(50, le=200),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)
    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditEvent.entity_id == entity_id)
    return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()


@router.post("", response_model=AuditEventOut, status_code=status.HTTP_201_CREATED)
def record_audit_event(event_in: AuditEventCreate, db: Session = Depends(get_db)):
    event_id = event_in.id or f"aud-{uuid.uuid4().hex[:8]}"
    new_event = AuditEvent(
        id=event_id,
        actor_name=event_in.actor_name,
        actor_role=event_in.actor_role,
        action=event_in.action,
        entity_type=event_in.entity_type,
        entity_id=event_in.entity_id,
        details=event_in.details,
        ip_address=event_in.ip_address,
        timestamp=datetime.utcnow()
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event
