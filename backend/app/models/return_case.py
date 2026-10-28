from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, Boolean
from app.database import Base


class ReturnCase(Base):
    __tablename__ = "returns"

    id = Column(String(64), primary_key=True, index=True)
    return_number = Column(String(100), unique=True, index=True, nullable=False)
    original_shipment_id = Column(String(64), nullable=False)
    tracking_number = Column(String(100), nullable=False)
    order_id = Column(String(64), nullable=True, index=True)
    order_number = Column(String(100), nullable=True, index=True)
    customer_id = Column(String(64), nullable=False)
    customer_name = Column(String(255), nullable=False)
    product_id = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    reason = Column(String(255), nullable=False)
    status = Column(String(50), default="Requested", index=True)
    evidence_photos = Column(JSON, default=list)
    inspection_notes = Column(Text, nullable=True)
    quarantine_location = Column(String(255), nullable=True)
    customer_choice = Column(String(50), nullable=True, default="Replace Product")
    vendor_verified = Column(Boolean, default=False)
    vendor_verified_by = Column(String(255), nullable=True)
    vendor_verified_at = Column(DateTime, nullable=True)
    problem_diagnosis = Column(Text, nullable=True)
    refund_amount = Column(Float, nullable=True)
    refund_status = Column(String(50), nullable=True)
    replacement_shipment_id = Column(String(64), nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
