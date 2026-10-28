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


class OutboundDeliveryCreate(BaseModel):
    """
    Payload for 'Dispatch Outbound Customer Delivery' modal form:
    'Bundle verified hub inventory into customer delivery manifest.'
    """
    customer_consignee: Optional[str] = Field(default="Anusha S (BioMed Diagnostics)", alias="customerConsignee", description="Customer consignee name or organization")
    facility_address: Optional[str] = Field(default="BioMed Research Campus Bay 2 (Tech Park)", alias="facilityAddress", description="Customer destination facility address")
    courier_vehicle: Optional[str] = Field(default="Midwest Van Express #402", alias="courierVehicle", description="Courier vehicle / Driver unit")
    delivery_notes: Optional[str] = Field(default="Final mile expedited courier delivery.", alias="deliveryNotes", description="Delivery notes and clinical instructions")

    # Alternate aliases from standard shipment payloads
    customer_name: Optional[str] = Field(default=None, alias="customerName")
    destination: Optional[str] = None
    carrier_vehicle: Optional[str] = Field(default=None, alias="carrierVehicle")
    notes: Optional[str] = None

    # Operational logistics metadata with enterprise defaults
    origin: Optional[str] = Field(default="Midwest Sorting Hub 4 (Cross-Dock)", description="Outbound dispatch hub")
    vendor_name: Optional[str] = Field(default="Trans-Express Regional Logistics", alias="vendorName")
    vendor_id: Optional[str] = Field(default="usr-vendor-02", alias="vendorId")
    customer_id: Optional[str] = Field(default="usr-cust-03", alias="customerId")
    owner_name: Optional[str] = Field(default="Dhruva (Owner)", alias="ownerName")
    owner_id: Optional[str] = Field(default="usr-owner-01", alias="ownerId")
    status: Optional[str] = Field(default="In Transit", description="Initial status for outbound delivery (In Transit / Dispatched)")
    tracking_number: Optional[str] = Field(default=None, alias="trackingNumber")
    container_ids: List[str] = Field(default=[], alias="containerIds")
    items: List[ShipmentItemBase] = Field(default=[])

    class Config:
        populate_by_name = True


class OutboundDeliveryResponse(BaseModel):
    status: str = "success"
    message: str = "Outbound customer delivery manifest generated and dispatched."
    tracking_number: str = Field(..., alias="trackingNumber")
    manifest_hash: str = Field(..., alias="manifestHash")
    courier_vehicle: str = Field(..., alias="courierVehicle")
    customer_consignee: str = Field(..., alias="customerConsignee")
    facility_address: str = Field(..., alias="facilityAddress")
    shipment_status: str = Field(..., alias="shipmentStatus")
    shipment: ShipmentOut

    class Config:
        from_attributes = True
        populate_by_name = True
