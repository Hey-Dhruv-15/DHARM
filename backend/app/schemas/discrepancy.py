from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class DiscrepancyEvidenceBase(BaseModel):
    type: str = "Photo"
    url: Optional[str] = None
    description: str
    uploaded_by: str = Field(..., alias="uploadedBy")

    class Config:
        populate_by_name = True


class DiscrepancyEvidenceOut(DiscrepancyEvidenceBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class DiscrepancyBase(BaseModel):
    discrepancy_number: Optional[str] = Field(default=None, alias="discrepancyNumber")
    shipment_id: Optional[str] = Field(default=None, alias="shipmentId")
    shipment_tracking: Optional[str] = Field(default=None, alias="shipmentTracking")
    order_id: Optional[str] = Field(default=None, alias="orderId")
    order_number: Optional[str] = Field(default=None, alias="orderNumber")
    customer_id: Optional[str] = Field(default=None, alias="customerId")
    customer_name: Optional[str] = Field(default=None, alias="customerName")
    container_id: Optional[str] = Field(default=None, alias="containerId")
    container_number: Optional[str] = Field(default=None, alias="containerNumber")
    product_id: Optional[str] = Field(default=None, alias="productId")
    product_name: Optional[str] = Field(default=None, alias="productName")
    sku: Optional[str] = None
    type: str
    severity: str = "Medium"
    status: str = "Detected"
    expected_quantity: int = Field(default=0, alias="expectedQuantity")
    observed_quantity: int = Field(default=0, alias="observedQuantity")
    detection_stage: str = Field(default="Customer Handover", alias="detectionStage")
    detected_by: str = Field(default="Customer", alias="detectedBy")
    assigned_investigator: Optional[str] = Field(default=None, alias="assignedInvestigator")
    preferred_resolution: Optional[str] = Field(default=None, alias="preferredResolution")
    resolution_notes: Optional[str] = Field(default=None, alias="resolutionNotes")
    resolution_outcome: Optional[str] = Field(default="Pending", alias="resolutionOutcome")

    class Config:
        populate_by_name = True


class DiscrepancyCreate(DiscrepancyBase):
    id: Optional[str] = None


class DiscrepancyUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assigned_investigator: Optional[str] = Field(default=None, alias="assignedInvestigator")
    preferred_resolution: Optional[str] = Field(default=None, alias="preferredResolution")
    resolution_notes: Optional[str] = Field(default=None, alias="resolutionNotes")
    resolution_outcome: Optional[str] = Field(default=None, alias="resolutionOutcome")

    class Config:
        populate_by_name = True


class DiscrepancyOut(DiscrepancyBase):
    id: str
    discrepancy_number: str = Field(..., alias="discrepancyNumber")
    detected_at: Optional[datetime] = Field(default=None, alias="detectedAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")
    evidence: List[DiscrepancyEvidenceOut] = []

    class Config:
        from_attributes = True
        populate_by_name = True


class DiscrepancyReportRequest(BaseModel):
    """
    Payload for 'Report Shipment Exception / Damage' screen:
    - Affected Shipment
    - Product SKU
    - Discrepancy Type
    - Severity
    - Expected Units
    - Observed Physical Units
    - Inspection Evidence Notes
    """
    shipment_id: Optional[str] = Field(default=None, alias="shipmentId")
    shipment_tracking: Optional[str] = Field(default=None, alias="shipmentTracking")
    product_id: Optional[str] = Field(default=None, alias="productId")
    sku: Optional[str] = Field(default=None, alias="sku")
    product_name: Optional[str] = Field(default=None, alias="productName")
    discrepancy_type: Optional[str] = Field(default=None, alias="discrepancyType")
    type: Optional[str] = Field(default="Damaged Goods")
    severity: str = Field(default="Medium")
    expected_units: Optional[int] = Field(default=None, alias="expectedUnits")
    expected_quantity: Optional[int] = Field(default=1, alias="expectedQuantity")
    observed_physical_units: Optional[int] = Field(default=None, alias="observedPhysicalUnits")
    observed_quantity: Optional[int] = Field(default=0, alias="observedQuantity")
    inspection_evidence_notes: Optional[str] = Field(default=None, alias="inspectionEvidenceNotes")
    notes: Optional[str] = Field(default=None, alias="notes")
    resolution_notes: Optional[str] = Field(default=None, alias="resolutionNotes")
    evidence_photos: List[str] = Field(default=[], alias="evidencePhotos")
    container_id: Optional[str] = Field(default=None, alias="containerId")
    container_number: Optional[str] = Field(default=None, alias="containerNumber")
    detection_stage: Optional[str] = Field(default="Vendor Receiving", alias="detectionStage")
    detected_by: Optional[str] = Field(default="Sinu Gunshetty (Vendor)", alias="detectedBy")
    assigned_investigator: Optional[str] = Field(default="Product Owner (Dhruva)", alias="assignedInvestigator")
    preferred_resolution: Optional[str] = Field(default=None, alias="preferredResolution")

    class Config:
        populate_by_name = True


class DiscrepancyReportResponse(BaseModel):
    success: bool = True
    message: str = "Shipment exception / damage discrepancy successfully recorded and routed to Product Owner"
    discrepancy: DiscrepancyOut

    class Config:
        populate_by_name = True
