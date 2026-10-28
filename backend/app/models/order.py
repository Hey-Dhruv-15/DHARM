from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(64), primary_key=True, index=True)
    order_number = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(String(64), nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_account = Column(String(255), nullable=True)
    customer_po_reference = Column(String(100), nullable=False, index=True)
    delivery_location = Column(String(255), nullable=True)
    logistics_carrier = Column(String(100), nullable=True, default="Bluedart Express")
    payment_terms = Column(String(100), nullable=True, default="Corporate Net Banking")
    order_remarks = Column(Text, nullable=True)

    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="Processing", index=True)
    expected_delivery_date = Column(DateTime, nullable=True)
    payment_status = Column(String(50), default="Paid")

    subtotal = Column(Float, default=0.0)
    tax_total = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)

    shipping_address = Column(JSON, nullable=True)
    billing_address = Column(JSON, nullable=True)

    shipment_id = Column(String(64), nullable=True)
    tracking_number = Column(String(100), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    invoice_available = Column(Boolean, default=True)
    can_cancel = Column(Boolean, default=True)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(64), primary_key=True, index=True)
    order_id = Column(String(64), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(64), nullable=False)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    image = Column(String(500), nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    gst_rate = Column(Float, default=0.18)
    total_price = Column(Float, default=0.0)

    order = relationship("Order", back_populates="items")
