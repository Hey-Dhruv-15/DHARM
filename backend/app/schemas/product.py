from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ProductBase(BaseModel):
    sku: str
    name: str
    category: str = "General / Uncategorized"
    barcode: Optional[str] = None
    barcode_format: Optional[str] = Field(default="CODE128", alias="barcodeFormat")
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


class ProductPut(BaseModel):
    sku: str
    name: str
    category: str = "General / Uncategorized"
    barcode: Optional[str] = None
    barcode_format: Optional[str] = Field(default="CODE128", alias="barcodeFormat")
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


class ProductPatch(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    barcode_format: Optional[str] = Field(default=None, alias="barcodeFormat")
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


class ProductStatusUpdate(BaseModel):
    status: str


class ProductOut(ProductBase):
    id: str
    barcode: str
    barcode_url: str = Field(alias="barcodeUrl")
    qr_code_url: str = Field(alias="qrCodeUrl")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int = Field(alias="totalPages")

    class Config:
        populate_by_name = True


class ProductListResponse(BaseModel):
    items: List[ProductOut]
    pagination: PaginationMeta


class ProductLookupResponse(BaseModel):
    id: str
    sku: str
    name: str
    category: str
    barcode: str
    unit_price: float = Field(alias="unitPrice")
    gst_rate: Optional[float] = Field(alias="gstRate")
    gross_price: Optional[float] = Field(alias="grossPrice")
    currency: Optional[str] = "INR"
    status: Optional[str] = "Active"

    class Config:
        from_attributes = True
        populate_by_name = True


class BarcodeGenerateRequest(BaseModel):
    format: Optional[str] = "CODE128"


class BarcodeGenerateResponse(BaseModel):
    product_id: str = Field(alias="productId")
    sku: str
    barcode: str
    format: str = "CODE128"
    barcode_url: str = Field(alias="barcodeUrl")
    generated_at: datetime = Field(alias="generatedAt")

    class Config:
        populate_by_name = True


class QrCodeGenerateRequest(BaseModel):
    format: Optional[str] = "PNG"


class QrCodeGenerateResponse(BaseModel):
    product_id: str = Field(alias="productId")
    sku: str
    qr_code_url: str = Field(alias="qrCodeUrl")
    content_type: str = Field(default="image/png", alias="contentType")
    generated_at: datetime = Field(alias="generatedAt")

    class Config:
        populate_by_name = True


class ProductScanRequest(BaseModel):
    code: str
    scan_type: str = Field(default="BARCODE", alias="scanType")

    class Config:
        populate_by_name = True


class ProductScanResponse(BaseModel):
    success: bool = True
    scan_type: str = Field(alias="scanType")
    product: ProductLookupResponse

    class Config:
        populate_by_name = True


class ProductLabelResponse(BaseModel):
    product_id: str = Field(alias="productId")
    name: str
    sku: str
    barcode: str
    barcode_url: str = Field(alias="barcodeUrl")
    qr_code_url: str = Field(alias="qrCodeUrl")
    unit_price: float = Field(alias="unitPrice")
    currency: Optional[str] = "INR"

    class Config:
        populate_by_name = True


class CurrencyOption(BaseModel):
    code: str
    name: str
    symbol: str


class ProductMetaOptionsResponse(BaseModel):
    categories: List[str]
    billing_units: List[str] = Field(alias="billingUnits")
    units: List[str]
    currencies: List[CurrencyOption]
    statuses: List[str]
    barcode_formats: List[str] = Field(alias="barcodeFormats")

    class Config:
        populate_by_name = True


# Backwards compatibility alias
ProductUpdate = ProductPatch
