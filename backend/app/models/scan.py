from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.database import Base


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(String(64), primary_key=True, index=True)
    scanned_code = Column(String(255), index=True, nullable=False)
    scanned_at = Column(DateTime, default=datetime.utcnow, index=True)
    scanned_by = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    shipment_id = Column(String(64), nullable=True)
    container_id = Column(String(64), nullable=True)
    type = Column(String(50), default="Product")
    result = Column(String(100), default="Expected Match")
    notes = Column(Text, nullable=True)
