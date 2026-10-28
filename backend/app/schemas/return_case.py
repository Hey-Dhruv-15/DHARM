from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class ReturnCaseBase(BaseModel):
    return_number: str = Field(..., alias="returnNumber")
    original_shipment_id: str = Field(..., alias="originalShipmentId")
    tracking_number: str = Field(..., alias="trackingNumber")
    customer_id: str = Field(..., alias="customerId")
    customer_name: str = Field(..., alias="customerName")
    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    quantity: int = 1
    reason: str
    status: str = "Requested"
    evidence_photos: List[str] = Field(default=[], alias="evidencePhotos")
    inspection_notes: Optional[str] = Field(default=None, alias="inspectionNotes")
    quarantine_location: Optional[str] = Field(default=None, alias="quarantineLocation")
    replacement_shipment_id: Optional[str] = Field(default=None, alias="replacementShipmentId")

    class Config:
        populate_by_name = True


class ReturnCaseCreate(ReturnCaseBase):
    id: Optional[str] = None


class ReturnCaseUpdate(BaseModel):
    status: Optional[str] = None
    inspection_notes: Optional[str] = Field(default=None, alias="inspectionNotes")
    quarantine_location: Optional[str] = Field(default=None, alias="quarantineLocation")
    replacement_shipment_id: Optional[str] = Field(default=None, alias="replacementShipmentId")

    class Config:
        populate_by_name = True


class ReturnCaseOut(ReturnCaseBase):
    id: str
    requested_at: Optional[datetime] = Field(default=None, alias="requestedAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True
