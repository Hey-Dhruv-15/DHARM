from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ProductBase(BaseModel):
    sku: str
    name: str
    category: str = "General / Uncategorized"
    barcode: str
    is_serialized: bool = Field(default=False, alias="isSerialized")
    unit: str = "Unit"
    billing_unit: Optional[str] = Field(default="One-time", alias="billingUnit")
    stock_quantity: int = Field(default=0, alias="stockQuantity")
    reorder_level: int = Field(default=5, alias="reorderLevel")
    unit_price: float = Field(default=0.0, alias="unitPrice")
    gst_rate: Optional[float] = Field(default=18.0, alias="gstRate")
    gross_price: Optional[float] = Field(default=0.0, alias="grossPrice")
    currency: Optional[str] = "INR"
    status: Optional[str] = "Active"
    description: Optional[str] = None
    deliverables: Optional[str] = None

    class Config:
        populate_by_name = True


class ProductCreate(ProductBase):
    id: Optional[str] = None


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    is_serialized: Optional[bool] = Field(default=None, alias="isSerialized")
    unit: Optional[str] = None
    billing_unit: Optional[str] = Field(default=None, alias="billingUnit")
    stock_quantity: Optional[int] = Field(default=None, alias="stockQuantity")
    reorder_level: Optional[int] = Field(default=None, alias="reorderLevel")
    unit_price: Optional[float] = Field(default=None, alias="unitPrice")
    gst_rate: Optional[float] = Field(default=None, alias="gstRate")
    gross_price: Optional[float] = Field(default=None, alias="grossPrice")
    currency: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    deliverables: Optional[str] = None

    class Config:
        populate_by_name = True


class ProductOut(ProductBase):
    id: str
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True
