from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class DiscrepancyEvidenceBase(BaseModel):
    type: str
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
    discrepancy_number: str = Field(..., alias="discrepancyNumber")
    shipment_id: str = Field(..., alias="shipmentId")
    shipment_tracking: str = Field(..., alias="shipmentTracking")
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
    detection_stage: str = Field(..., alias="detectionStage")
    detected_by: str = Field(..., alias="detectedBy")
    assigned_investigator: Optional[str] = Field(default=None, alias="assignedInvestigator")
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
    resolution_notes: Optional[str] = Field(default=None, alias="resolutionNotes")
    resolution_outcome: Optional[str] = Field(default=None, alias="resolutionOutcome")

    class Config:
        populate_by_name = True


class DiscrepancyOut(DiscrepancyBase):
    id: str
    detected_at: Optional[datetime] = Field(default=None, alias="detectedAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")
    evidence: List[DiscrepancyEvidenceOut] = []

    class Config:
        from_attributes = True
        populate_by_name = True
