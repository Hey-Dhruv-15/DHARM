from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, JSON
from app.database import Base


class ReturnCase(Base):
    __tablename__ = "returns"

    id = Column(String(64), primary_key=True, index=True)
    return_number = Column(String(100), unique=True, index=True, nullable=False)
    original_shipment_id = Column(String(64), nullable=False)
    tracking_number = Column(String(100), nullable=False)
    customer_id = Column(String(64), nullable=False)
    customer_name = Column(String(255), nullable=False)
    product_id = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    reason = Column(String(255), nullable=False)
    status = Column(String(50), default="Requested", index=True)
    evidence_photos = Column(JSON, default=list)
    inspection_notes = Column(Text, nullable=True)
    quarantine_location = Column(String(255), nullable=True)
    replacement_shipment_id = Column(String(64), nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
