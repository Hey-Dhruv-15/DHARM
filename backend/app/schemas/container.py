from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class ContainerItemBase(BaseModel):
    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    sku: str
    barcode: str
    quantity: int = 1
    weight_kg: float = Field(default=0.0, alias="weightKg")
    unit_weight_kg: float = Field(default=0.0, alias="unitWeightKg")

    class Config:
        populate_by_name = True


class ContainerItemCreate(ContainerItemBase):
    id: Optional[str] = None


class ContainerItemOut(ContainerItemBase):
    id: str
    container_id: str = Field(..., alias="containerId")
    scanned_at: Optional[datetime] = Field(default=None, alias="scannedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class ContainerBase(BaseModel):
    container_number: str = Field(..., alias="containerNumber")
    type: str = "Standard Container"
    max_capacity: float = Field(default=100.0, alias="maxCapacity")
    capacity_unit: str = Field(default="kg", alias="capacityUnit")
    capacity_kg: float = Field(default=100.0, alias="capacityKg")
    current_weight_kg: float = Field(default=0.0, alias="currentWeightKg")
    utilized_capacity: Optional[float] = Field(default=0.0, alias="utilizedCapacity")
    seal_number: Optional[str] = Field(default=None, alias="sealNumber")
    seal_status: Optional[str] = Field(default="Active", alias="sealStatus")
    initial_location: Optional[str] = Field(default="Central Distribution Center, Hub Alpha", alias="initialLocation")
    location: Optional[str] = Field(default="Central Distribution Center, Hub Alpha")
    description: Optional[str] = None
    status: Optional[str] = "Empty"
    assigned_shipment_id: Optional[str] = Field(default=None, alias="assignedShipmentId")
    assigned_shipment_tracking: Optional[str] = Field(default=None, alias="assignedShipmentTracking")
    created_by: Optional[str] = Field(default="System", alias="createdBy")
    is_active: Optional[bool] = Field(default=True, alias="isActive")

    class Config:
        populate_by_name = True


class ContainerCreate(ContainerBase):
    id: Optional[str] = None


class ContainerUpdate(BaseModel):
    container_number: Optional[str] = Field(default=None, alias="containerNumber")
    type: Optional[str] = None
    max_capacity: Optional[float] = Field(default=None, alias="maxCapacity")
    capacity_unit: Optional[str] = Field(default=None, alias="capacityUnit")
    capacity_kg: Optional[float] = Field(default=None, alias="capacityKg")
    current_weight_kg: Optional[float] = Field(default=None, alias="currentWeightKg")
    utilized_capacity: Optional[float] = Field(default=None, alias="utilizedCapacity")
    seal_number: Optional[str] = Field(default=None, alias="sealNumber")
    seal_status: Optional[str] = Field(default=None, alias="sealStatus")
    initial_location: Optional[str] = Field(default=None, alias="initialLocation")
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_shipment_id: Optional[str] = Field(default=None, alias="assignedShipmentId")
    assigned_shipment_tracking: Optional[str] = Field(default=None, alias="assignedShipmentTracking")
    is_active: Optional[bool] = Field(default=None, alias="isActive")

    class Config:
        populate_by_name = True


class ContainerOut(ContainerBase):
    id: str
    item_count: int = Field(default=0, alias="itemCount")
    items: List[ContainerItemOut] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True
