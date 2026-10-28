from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Container(Base):
    __tablename__ = "containers"

    id = Column(String(64), primary_key=True, index=True)
    container_number = Column(String(100), unique=True, index=True, nullable=False)
    type = Column(String(100), nullable=False, default="Standard Container")
    max_capacity = Column(Float, default=100.0)
    capacity_unit = Column(String(20), default="kg")
    capacity_kg = Column(Float, default=100.0)
    current_weight_kg = Column(Float, default=0.0)
    utilized_capacity = Column(Float, default=0.0)
    seal_number = Column(String(100), nullable=True)
    seal_status = Column(String(50), default="Active")
    initial_location = Column(String(255), default="Central Distribution Center, Hub Alpha")
    location = Column(String(255), default="Central Distribution Center, Hub Alpha")
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Empty")
    assigned_shipment_id = Column(String(64), nullable=True)
    assigned_shipment_tracking = Column(String(100), nullable=True)
    created_by = Column(String(255), default="System")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    items = relationship("ContainerItem", back_populates="container", cascade="all, delete-orphan")


class ContainerItem(Base):
    __tablename__ = "container_items"

    id = Column(String(64), primary_key=True, index=True)
    container_id = Column(String(64), ForeignKey("containers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    barcode = Column(String(100), nullable=False)
    quantity = Column(Integer, default=1)
    weight_kg = Column(Float, default=0.0)
    unit_weight_kg = Column(Float, default=0.0)
    scanned_at = Column(DateTime, default=datetime.utcnow)

    container = relationship("Container", back_populates="items")
