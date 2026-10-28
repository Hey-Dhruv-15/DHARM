from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class DiscrepancyCase(Base):
    __tablename__ = "discrepancies"

    id = Column(String(64), primary_key=True, index=True)
    discrepancy_number = Column(String(100), unique=True, index=True, nullable=False)
    shipment_id = Column(String(64), nullable=True, index=True)
    shipment_tracking = Column(String(100), nullable=True)
    order_id = Column(String(64), nullable=True, index=True)
    order_number = Column(String(100), nullable=True, index=True)
    customer_id = Column(String(64), nullable=True, index=True)
    customer_name = Column(String(255), nullable=True)
    container_id = Column(String(64), nullable=True)
    container_number = Column(String(100), nullable=True)
    product_id = Column(String(64), nullable=True)
    product_name = Column(String(255), nullable=True)
    sku = Column(String(100), nullable=True)
    type = Column(String(100), nullable=False)
    severity = Column(String(50), default="Medium")
    status = Column(String(50), default="Detected", index=True)
    expected_quantity = Column(Integer, default=0)
    observed_quantity = Column(Integer, default=0)
    detection_stage = Column(String(100), nullable=False)
    detected_by = Column(String(255), nullable=False)
    assigned_investigator = Column(String(255), nullable=True)
    preferred_resolution = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_outcome = Column(String(100), default="Pending")
    detected_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evidence = relationship("DiscrepancyEvidence", back_populates="discrepancy", cascade="all, delete-orphan")


class DiscrepancyEvidence(Base):
    __tablename__ = "discrepancy_evidence"

    id = Column(String(64), primary_key=True, index=True)
    discrepancy_id = Column(String(64), ForeignKey("discrepancies.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(100), nullable=False)
    url = Column(String(500), nullable=True)
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String(255), nullable=False)

    discrepancy = relationship("DiscrepancyCase", back_populates="evidence")
