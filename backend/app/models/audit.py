from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    actor_name = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String(50), nullable=True)
