from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ScanRecordBase(BaseModel):
    scanned_code: str = Field(..., alias="scannedCode")
    scanned_by: str = Field(..., alias="scannedBy")
    role: str
    shipment_id: Optional[str] = Field(default=None, alias="shipmentId")
    container_id: Optional[str] = Field(default=None, alias="containerId")
    type: str = "Product"
    result: str = "Expected Match"
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class ScanRecordCreate(ScanRecordBase):
    id: Optional[str] = None


class ScanRecordOut(ScanRecordBase):
    id: str
    scanned_at: datetime = Field(..., alias="scannedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class ScanVerificationRequest(BaseModel):
    scanned_code: str = Field(..., alias="scannedCode")
    shipment_id: Optional[str] = Field(default=None, alias="shipmentId")
    container_id: Optional[str] = Field(default=None, alias="containerId")
    scanned_by: str = Field(..., alias="scannedBy")
    role: str = "VENDOR"

    class Config:
        populate_by_name = True


class ScanVerificationResponse(BaseModel):
    scanned_code: str = Field(..., alias="scannedCode")
    type: str
    is_valid: bool = Field(..., alias="isValid")
    result: str
    message: str
    matched_entity: Optional[dict] = Field(default=None, alias="matchedEntity")

    class Config:
        populate_by_name = True
