from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String(64), primary_key=True, index=True)
    tracking_number = Column(String(100), unique=True, index=True, nullable=False)
    owner_id = Column(String(64), nullable=False)
    owner_name = Column(String(255), nullable=False)
    vendor_id = Column(String(64), nullable=False)
    vendor_name = Column(String(255), nullable=False)
    customer_id = Column(String(64), nullable=False)
    customer_name = Column(String(255), nullable=False)
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    status = Column(String(50), default="Draft", index=True)
    container_ids = Column(JSON, default=list)  # list of container string IDs
    manifest_hash = Column(String(255), nullable=True)
    dispatch_date = Column(DateTime, nullable=True)
    estimated_delivery = Column(DateTime, nullable=True)
    actual_delivery = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ShipmentItem", back_populates="shipment", cascade="all, delete-orphan")
    events = relationship("ShipmentEvent", back_populates="shipment", cascade="all, delete-orphan")


class ShipmentItem(Base):
    __tablename__ = "shipment_items"

    id = Column(String(64), primary_key=True, index=True)
    shipment_id = Column(String(64), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    barcode = Column(String(100), nullable=False)
    container_id = Column(String(64), nullable=True)
    container_number = Column(String(100), nullable=True)
    expected_quantity = Column(Integer, default=1)
    verified_quantity = Column(Integer, default=0)
    scanned_quantity = Column(Integer, default=0)
    status = Column(String(50), default="Pending")

    shipment = relationship("Shipment", back_populates="items")


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id = Column(String(64), primary_key=True, index=True)
    shipment_id = Column(String(64), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), nullable=False)
    location = Column(String(255), nullable=False)
    performed_by = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)

    shipment = relationship("Shipment", back_populates="events")
