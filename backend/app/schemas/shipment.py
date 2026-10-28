from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ShipmentItemBase(BaseModel):
    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    sku: str
    barcode: str
    container_id: Optional[str] = Field(default=None, alias="containerId")
    container_number: Optional[str] = Field(default=None, alias="containerNumber")
    expected_quantity: int = Field(default=1, alias="expectedQuantity")
    verified_quantity: int = Field(default=0, alias="verifiedQuantity")
    scanned_quantity: int = Field(default=0, alias="scannedQuantity")
    status: str = "Pending"

    class Config:
        populate_by_name = True


class ShipmentItemOut(ShipmentItemBase):
    id: str

    class Config:
        from_attributes = True
        populate_by_name = True


class ShipmentEventBase(BaseModel):
    status: str
    location: str
    performed_by: str = Field(..., alias="performedBy")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class ShipmentEventOut(ShipmentEventBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class ShipmentBase(BaseModel):
    tracking_number: str = Field(..., alias="trackingNumber")
    owner_id: str = Field(..., alias="ownerId")
    owner_name: str = Field(..., alias="ownerName")
    vendor_id: str = Field(..., alias="vendorId")
    vendor_name: str = Field(..., alias="vendorName")
    customer_id: str = Field(..., alias="customerId")
    customer_name: str = Field(..., alias="customerName")
    origin: str
    destination: str
    status: str = "Draft"
    container_ids: List[str] = Field(default=[], alias="containerIds")
    manifest_hash: Optional[str] = Field(default=None, alias="manifestHash")
    dispatch_date: Optional[datetime] = Field(default=None, alias="dispatchDate")
    estimated_delivery: Optional[datetime] = Field(default=None, alias="estimatedDelivery")
    actual_delivery: Optional[datetime] = Field(default=None, alias="actualDelivery")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class ShipmentCreate(ShipmentBase):
    id: Optional[str] = None
    items: List[ShipmentItemBase] = []


class ShipmentStatusUpdate(BaseModel):
    status: str
    location: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = Field(default="System", alias="performedBy")

    class Config:
        populate_by_name = True


ShipmentUpdate = ShipmentStatusUpdate


class ShipmentOut(ShipmentBase):
    id: str
    items: List[ShipmentItemOut] = []
    events: List[ShipmentEventOut] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True
