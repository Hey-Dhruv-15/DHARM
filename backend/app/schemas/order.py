from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime


class OrderItemBase(BaseModel):
    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    sku: str
    image: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(default=0.0, ge=0.0, alias="unitPrice")
    gst_rate: float = Field(default=0.18, ge=0.0, alias="gstRate")
    total_price: Optional[float] = Field(default=None, alias="totalPrice")

    class Config:
        populate_by_name = True


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemOut(OrderItemBase):
    id: str
    order_id: str = Field(..., alias="orderId")

    class Config:
        from_attributes = True
        populate_by_name = True


class OrderCreate(BaseModel):
    customer_account: Optional[str] = Field(default=None, alias="customerAccount")
    customer_po_reference: str = Field(..., alias="customerPoReference")
    delivery_location: Optional[str] = Field(default=None, alias="deliveryLocation")
    logistics_carrier: Optional[str] = Field(default="Bluedart Express", alias="logisticsCarrier")
    payment_terms: Optional[str] = Field(default="Corporate Net Banking", alias="paymentTerms")
    order_remarks: Optional[str] = Field(default=None, alias="orderRemarks")
    items: List[OrderItemCreate]

    # Optional address & customer info if provided explicitly
    customer_id: Optional[str] = Field(default=None, alias="customerId")
    customer_name: Optional[str] = Field(default=None, alias="customerName")
    shipping_address: Optional[Any] = Field(default=None, alias="shippingAddress")
    billing_address: Optional[Any] = Field(default=None, alias="billingAddress")

    class Config:
        populate_by_name = True


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class OrderCancelRequest(BaseModel):
    reason: str


class OrderDeliveryRequest(BaseModel):
    notes: Optional[str] = Field(default="Delivered to primary receiving dock", description="Inspection or delivery remarks")
    delivered_by: Optional[str] = Field(default="Carrier Representative", alias="deliveredBy")

    class Config:
        populate_by_name = True


class OrderOut(BaseModel):
    id: str
    order_number: str = Field(..., alias="orderNumber")
    customer_id: str = Field(..., alias="customerId")
    customer_name: str = Field(..., alias="customerName")
    customer_account: Optional[str] = Field(default=None, alias="customerAccount")
    customer_po_reference: str = Field(..., alias="customerPoReference")
    delivery_location: Optional[str] = Field(default=None, alias="deliveryLocation")
    logistics_carrier: Optional[str] = Field(default=None, alias="logisticsCarrier")
    payment_terms: Optional[str] = Field(default=None, alias="paymentTerms")
    order_remarks: Optional[str] = Field(default=None, alias="orderRemarks")
    order_date: datetime = Field(..., alias="orderDate")
    status: str
    expected_delivery_date: Optional[datetime] = Field(default=None, alias="expectedDeliveryDate")
    payment_status: str = Field(..., alias="paymentStatus")
    subtotal: float
    tax_total: float = Field(..., alias="taxTotal")
    grand_total: float = Field(..., alias="grandTotal")
    shipping_address: Optional[Any] = Field(default=None, alias="shippingAddress")
    billing_address: Optional[Any] = Field(default=None, alias="billingAddress")
    shipment_id: Optional[str] = Field(default=None, alias="shipmentId")
    tracking_number: Optional[str] = Field(default=None, alias="trackingNumber")
    invoice_number: Optional[str] = Field(default=None, alias="invoiceNumber")
    invoice_available: bool = Field(default=True, alias="invoiceAvailable")
    can_cancel: bool = Field(default=True, alias="canCancel")
    cancellation_reason: Optional[str] = Field(default=None, alias="cancellationReason")
    cancelled_at: Optional[datetime] = Field(default=None, alias="cancelledAt")
    created_at: datetime = Field(..., alias="createdAt")
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True
        populate_by_name = True


class OrderHistoryOut(BaseModel):
    id: str
    original_order_id: str = Field(..., alias="originalOrderId")
    order_number: str = Field(..., alias="orderNumber")
    customer_id: str = Field(..., alias="customerId")
    customer_name: str = Field(..., alias="customerName")
    customer_account: Optional[str] = Field(default=None, alias="customerAccount")
    customer_po_reference: str = Field(..., alias="customerPoReference")
    delivery_location: Optional[str] = Field(default=None, alias="deliveryLocation")
    logistics_carrier: Optional[str] = Field(default=None, alias="logisticsCarrier")
    payment_terms: Optional[str] = Field(default=None, alias="paymentTerms")
    order_remarks: Optional[str] = Field(default=None, alias="orderRemarks")
    order_date: datetime = Field(..., alias="orderDate")
    delivered_at: datetime = Field(..., alias="deliveredAt")
    status: str = "Delivered"
    subtotal: float
    tax_total: float = Field(..., alias="taxTotal")
    grand_total: float = Field(..., alias="grandTotal")
    shipping_address: Optional[Any] = Field(default=None, alias="shippingAddress")
    billing_address: Optional[Any] = Field(default=None, alias="billingAddress")
    tracking_number: Optional[str] = Field(default=None, alias="trackingNumber")
    invoice_number: Optional[str] = Field(default=None, alias="invoiceNumber")
    items_snapshot: List[Any] = Field(default=[], alias="itemsSnapshot")
    delivered_by: Optional[str] = Field(default=None, alias="deliveredBy")
    delivery_notes: Optional[str] = Field(default=None, alias="deliveryNotes")
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class OrderDeliverResponse(BaseModel):
    success: bool = True
    message: str
    order_id: str = Field(..., alias="orderId")
    order_number: str = Field(..., alias="orderNumber")
    status: str = "Delivered"
    delivered_at: datetime = Field(..., alias="deliveredAt")
    archived_to_history: bool = Field(default=True, alias="archivedToHistory")
    history_id: str = Field(..., alias="historyId")
    history: Optional[OrderHistoryOut] = None

    class Config:
        populate_by_name = True


class OrderProblemReportRequest(BaseModel):
    product_id: str = Field(..., alias="productId")
    product_name: Optional[str] = Field(default=None, alias="productName")
    sku: Optional[str] = None
    problem_category: str = Field(..., alias="problemCategory")
    preferred_resolution: str = Field(default="Replacement", alias="preferredResolution")
    delivered_units: int = Field(default=1, ge=1, alias="deliveredUnits")
    defective_units: int = Field(default=1, ge=1, alias="defectiveUnits")
    description: str = Field(..., min_length=2)
    evidence_photos: Optional[List[str]] = Field(default=[], alias="evidencePhotos")

    class Config:
        populate_by_name = True


class VendorExceptionResponse(BaseModel):
    success: bool = True
    message: str
    order_id: str = Field(..., alias="orderId")
    order_number: str = Field(..., alias="orderNumber")
    customer_po_reference: Optional[str] = Field(default=None, alias="customerPoReference")
    discrepancy_id: str = Field(..., alias="discrepancyId")
    discrepancy_number: str = Field(..., alias="discrepancyNumber")
    return_id: str = Field(..., alias="returnId")
    return_number: str = Field(..., alias="returnNumber")
    vendor_module: str = Field(default="Exceptions & Damaged", alias="vendorModule")
    target_quarantine_bay: str = Field(default="Vendor Hub Quarantine Bay Q-4B", alias="targetQuarantineBay")
    product_name: str = Field(..., alias="productName")
    sku: Optional[str] = None
    defective_units: int = Field(..., alias="defectiveUnits")
    problem_category: str = Field(..., alias="problemCategory")
    customer_resolution_preference: str = Field(..., alias="customerResolutionPreference")
    vendor_verification_pending: bool = Field(default=True, alias="vendorVerificationPending")
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True
