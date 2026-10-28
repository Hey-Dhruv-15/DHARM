from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class ContainerProduct(Base):
    __tablename__ = "container_products"
    __table_args__ = (
        UniqueConstraint("container_id", "product_id", name="uq_container_product"),
    )

    id = Column(String(64), primary_key=True, index=True)
    container_id = Column(String(64), ForeignKey("containers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    product_name = Column(String(255), nullable=True)
    sku = Column(String(100), nullable=True)
    barcode = Column(String(100), nullable=True, index=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_weight = Column(Float, default=1.0)
    total_weight = Column(Float, default=1.0)
    scanned_at = Column(DateTime, default=datetime.utcnow)

    container = relationship("Container", back_populates="products_association")
    product = relationship("Product")
