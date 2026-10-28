from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, default="General / Uncategorized")
    barcode = Column(String(100), unique=True, index=True, nullable=False)
    barcode_format = Column(String(50), default="CODE128")
    qr_code_url = Column(String(255), nullable=True)
    is_serialized = Column(Boolean, default=False)
    unit = Column(String(50), default="Unit")
    billing_unit = Column(String(50), nullable=True)
    stock_quantity = Column(Integer, default=0)
    reorder_level = Column(Integer, default=5)
    unit_price = Column(Float, default=0.0)
    gst_rate = Column(Float, default=18.0)
    gross_price = Column(Float, default=0.0)
    currency = Column(String(10), default="INR")
    unit_weight = Column(Float, default=1.0)
    status = Column(String(50), default="Active")
    description = Column(Text, nullable=True)
    deliverables = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def product_name(self) -> str:
        return self.name

    @product_name.setter
    def product_name(self, value: str):
        self.name = value

