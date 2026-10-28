from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AuditEventBase(BaseModel):
    actor_name: str = Field(..., alias="actorName")
    actor_role: str = Field(..., alias="actorRole")
    action: str
    entity_type: str = Field(..., alias="entityType")
    entity_id: str = Field(..., alias="entityId")
    details: str
    ip_address: Optional[str] = Field(default=None, alias="ipAddress")

    class Config:
        populate_by_name = True


class AuditEventCreate(AuditEventBase):
    id: Optional[str] = None


class AuditEventOut(AuditEventBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
