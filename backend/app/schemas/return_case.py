from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.schemas.discrepancy import DiscrepancyOut


class ReturnCaseBase(BaseModel):
    return_number: str = Field(..., alias="returnNumber")
    original_shipment_id: str = Field(..., alias="originalShipmentId")
    tracking_number: str = Field(..., alias="trackingNumber")
    order_id: Optional[str] = Field(default=None, alias="orderId")
    order_number: Optional[str] = Field(default=None, alias="orderNumber")
    customer_id: str = Field(..., alias="customerId")
    customer_name: str = Field(..., alias="customerName")
    product_id: str = Field(..., alias="productId")
    product_name: str = Field(..., alias="productName")
    sku: Optional[str] = None
    quantity: int = 1
    reason: str
    status: str = "Requested"
    evidence_photos: List[str] = Field(default=[], alias="evidencePhotos")
    inspection_notes: Optional[str] = Field(default=None, alias="inspectionNotes")
    quarantine_location: Optional[str] = Field(default="Vendor Hub Quarantine Bay Q-4B", alias="quarantineLocation")
    customer_choice: Optional[str] = Field(default="Replace Product", alias="customerChoice")
    vendor_verified: Optional[bool] = Field(default=False, alias="vendorVerified")
    vendor_verified_by: Optional[str] = Field(default=None, alias="vendorVerifiedBy")
    vendor_verified_at: Optional[datetime] = Field(default=None, alias="vendorVerifiedAt")
    problem_diagnosis: Optional[str] = Field(default=None, alias="problemDiagnosis")
    refund_amount: Optional[float] = Field(default=None, alias="refundAmount")
    refund_status: Optional[str] = Field(default=None, alias="refundStatus")
    replacement_shipment_id: Optional[str] = Field(default=None, alias="replacementShipmentId")

    class Config:
        populate_by_name = True


class ReturnCaseCreate(ReturnCaseBase):
    id: Optional[str] = None


class ReturnCaseUpdate(BaseModel):
    status: Optional[str] = None
    inspection_notes: Optional[str] = Field(default=None, alias="inspectionNotes")
    quarantine_location: Optional[str] = Field(default=None, alias="quarantineLocation")
    customer_choice: Optional[str] = Field(default=None, alias="customerChoice")
    vendor_verified: Optional[bool] = Field(default=None, alias="vendorVerified")
    vendor_verified_by: Optional[str] = Field(default=None, alias="vendorVerifiedBy")
    problem_diagnosis: Optional[str] = Field(default=None, alias="problemDiagnosis")
    refund_amount: Optional[float] = Field(default=None, alias="refundAmount")
    refund_status: Optional[str] = Field(default=None, alias="refundStatus")
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


class ReturnClaimCreate(BaseModel):
    """Payload representing customer damaged or return report form"""
    shipment_id: Optional[str] = Field(default=None, alias="shipmentId")
    tracking_number: Optional[str] = Field(default=None, alias="trackingNumber")
    order_id: Optional[str] = Field(default=None, alias="orderId")
    order_number: Optional[str] = Field(default=None, alias="orderNumber")
    customer_id: Optional[str] = Field(default="usr-cust-03", alias="customerId")
    customer_name: Optional[str] = Field(default="Anusha S (BioMed)", alias="customerName")
    product_id: Optional[str] = Field(default=None, alias="productId")
    product_name: Optional[str] = Field(default=None, alias="productName")
    sku: Optional[str] = Field(default=None, alias="sku")
    quantity: int = Field(default=1, ge=1)
    reason: str = Field(default="Damaged in Transit")
    customer_choice: str = Field(default="Replace Product", alias="customerChoice")
    evidence_photos: List[str] = Field(default=[], alias="evidencePhotos")
    notes: Optional[str] = Field(default=None, alias="notes")
    description: Optional[str] = Field(default=None, alias="description")
    refund_amount: Optional[float] = Field(default=None, alias="refundAmount")

    class Config:
        populate_by_name = True


class ReturnVerifyRequest(BaseModel):
    diagnosis: str
    notes: Optional[str] = None
    quarantine_location: str = Field(default="Vendor Hub Quarantine Bay Q-4B", alias="quarantineLocation")
    verified_by: Optional[str] = Field(default="Sinu Gunshetty (Vendor QA)", alias="verifiedBy")

    class Config:
        populate_by_name = True


class ReturnResolveRequest(BaseModel):
    resolution: str = Field(..., description="'Replace Product' or 'Refund Amount'")
    replacement_shipment_tracking: Optional[str] = Field(default=None, alias="replacementShipmentTracking")
    refund_reference: Optional[str] = Field(default=None, alias="refundReference")
    refund_amount: Optional[float] = Field(default=None, alias="refundAmount")
    resolved_by: Optional[str] = Field(default="Sinu Gunshetty (Vendor Lead)", alias="resolvedBy")

    class Config:
        populate_by_name = True


class ReturnClaimResponse(BaseModel):
    success: bool = True
    message: str = "Claim successfully logged in Owner Returns and Vendor Exceptions & Damaged modules"
    return_case: ReturnCaseOut = Field(..., alias="returnCase")
    discrepancy_case: Optional[DiscrepancyOut] = Field(default=None, alias="discrepancyCase")

    class Config:
        populate_by_name = True
