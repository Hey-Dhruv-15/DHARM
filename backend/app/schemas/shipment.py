from typing import Optional, List, Any, Union, Dict
from pydantic import BaseModel, Field, ConfigDict, model_validator
from datetime import datetime


# ==========================================
# Common Error Models
# ==========================================
class ApiErrorDetails(BaseModel):
    code: str
    message: str


class ApiErrorResponse(BaseModel):
    success: bool = False
    error: ApiErrorDetails


# ==========================================
# 1. Create Shipment Manifest Models
# ==========================================
class ShipmentItemCreateInput(BaseModel):
    product_id: Union[int, str]
    expected_quantity: int = Field(default=1, ge=1)


class ShipmentManifestCreateRequest(BaseModel):
    origin_hub: str
    destination_bay: str
    vendor_id: Union[int, str]
    customer_id: Union[int, str]
    container_id: str
    handling_notes: Optional[str] = None
    items: List[ShipmentItemCreateInput]


class ShipmentManifestCreateData(BaseModel):
    shipment_id: str
    tracking_id: str
    status: str = "draft"
    manifest_locked: bool = False
    container_id: str
    expected_units: int
    product_lines: int
    created_at: str


class ShipmentManifestCreateResponse(BaseModel):
    success: bool = True
    message: str = "Shipment manifest created successfully."
    data: ShipmentManifestCreateData


# ==========================================
# 2. Owner Scans Product Barcode Models
# ==========================================
class OwnerScanRequest(BaseModel):
    barcode: str
    container_id: Optional[str] = None


class OwnerScanData(BaseModel):
    shipment_id: str
    barcode: str
    product_id: Union[int, str]
    product_code: str
    product_name: str
    container_id: Optional[str] = None
    packed_quantity: int
    expected_quantity: int
    remaining_quantity: int
    packing_status: str


class OwnerScanResponse(BaseModel):
    success: bool = True
    message: str = "Product scanned successfully."
    data: OwnerScanData


# ==========================================
# 3. Dispatch Shipment Models
# ==========================================
class ShipmentDispatchRequest(BaseModel):
    container_id: str
    checkpoint_location: str
    seal_number: str
    notes: Optional[str] = None


class ShipmentDispatchData(BaseModel):
    shipment_id: str
    tracking_id: str
    status: str = "dispatched"
    manifest_locked: bool = True
    expected_units: int
    dispatched_at: str


class ShipmentDispatchResponse(BaseModel):
    success: bool = True
    message: str = "Shipment dispatched successfully."
    data: ShipmentDispatchData


# ==========================================
# 4. Vendor Scans Received Product Models
# ==========================================
class VendorScanRequest(BaseModel):
    barcode: str
    container_id: Optional[str] = None


class VendorScanData(BaseModel):
    shipment_id: str
    barcode: str
    product_code: str
    expected_quantity: int
    received_quantity: int
    remaining_quantity: int
    shipment_status: str
    scan_status: str = "valid"


class VendorScanResponse(BaseModel):
    success: bool = True
    message: str = "Barcode verified successfully."
    data: VendorScanData


# ==========================================
# 5. Complete Receiving & Reconcile Models
# ==========================================
class CompleteReceivingRequest(BaseModel):
    container_id: str
    confirmation: bool = True
    checkpoint_location: str
    notes: Optional[str] = None


class DiscrepancyItemData(BaseModel):
    discrepancy_id: str
    product_id: Union[int, str]
    product_code: str
    product_name: str
    container_id: Optional[str] = None
    expected_quantity: int
    received_quantity: int
    variance: int
    type: str
    status: str
    message: str


class CompleteReceivingData(BaseModel):
    shipment_id: str
    tracking_id: Optional[str] = None
    status: str
    expected_units: int
    received_units: int
    shortage_units: int = 0
    overage_units: int = 0
    discrepancy_count: int = 0
    discrepancies: List[DiscrepancyItemData] = []
    notifications: Optional[Dict[str, str]] = None


class CompleteReceivingResponse(BaseModel):
    success: bool = True
    message: str
    data: CompleteReceivingData


# ==========================================
# 6. Get Shipment Details & List Models
# ==========================================
class ContainerReference(BaseModel):
    id: str
    name: str


class ProductLineDetail(BaseModel):
    product_id: Optional[Union[int, str]] = None
    product_code: str
    product_name: str
    container_id: Optional[str] = None
    expected_quantity: Optional[int] = None
    expected: int
    verified_quantity: Optional[int] = None
    verified: int
    variance: int
    status: str  # "mismatch" or "verified"


class EntityReference(BaseModel):
    id: Union[int, str]
    name: str


class DiscrepancyReportItem(BaseModel):
    discrepancy_id: str
    product_code: str
    expected_quantity: int
    received_quantity: int
    variance: int
    type: str
    status: str
    message: str


class ShipmentTimelineEvent(BaseModel):
    event_type: str
    location: str
    performed_by: str
    timestamp: str
    notes: Optional[str] = None


class ShipmentDetailData(BaseModel):
    shipment_id: str
    tracking_id: str
    origin_hub: str
    destination_bay: str
    container: Optional[ContainerReference] = None
    container_id: Optional[str] = None
    assigned_vendor: EntityReference
    recipient_customer: EntityReference
    status: str
    handling_notes: Optional[str] = None
    manifest_locked: bool = False
    expected_units: int
    verified_units: int
    product_lines: List[ProductLineDetail]
    discrepancies: List[DiscrepancyReportItem] = []
    events: List[ShipmentTimelineEvent] = []
    open_discrepancies: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ShipmentDetailResponse(BaseModel):
    success: bool = True
    data: ShipmentDetailData


class ShipmentListItemData(BaseModel):
    shipment_id: str
    tracking_id: str
    origin_hub: str
    destination_bay: str
    container_id: Optional[str] = None
    assigned_vendor: EntityReference
    recipient_customer: EntityReference
    product_lines: int
    expected_units: int
    verified_units: int
    status: str
    discrepancy_count: int = 0
    created_at: str


class PaginationMetadata(BaseModel):
    page: int
    limit: int
    total_records: int
    total_pages: int


class ShipmentListResponse(BaseModel):
    success: bool = True
    data: List[ShipmentListItemData]
    pagination: PaginationMetadata


# ==========================================
# 7. Get Reconciliation Details Models
# ==========================================
class ReconciliationLine(BaseModel):
    product_code: str
    expected_quantity: int
    verified_quantity: int
    variance: int
    status: str  # "shortage", "overage", "matched"


class ReconciliationData(BaseModel):
    shipment_id: str
    reconciliation_status: str
    expected_units: int
    verified_units: int
    variance_units: int
    lines: List[ReconciliationLine]
    generated_at: str


class ReconciliationResponse(BaseModel):
    success: bool = True
    data: ReconciliationData


# ==========================================
# 8. Update Fulfillment Status Models
# ==========================================
class FulfillmentUpdateRequest(BaseModel):
    status: str
    checkpoint_location: str
    notes: Optional[str] = None


class FulfillmentUpdateData(BaseModel):
    shipment_id: str
    status: str
    checkpoint_location: str
    updated_at: str


class FulfillmentUpdateResponse(BaseModel):
    success: bool = True
    message: str = "Fulfillment checkpoint recorded."
    data: FulfillmentUpdateData


# ==========================================
# 9. Resolve a Discrepancy Models
# ==========================================
class DiscrepancyResolutionRequest(BaseModel):
    resolution_status: str = "resolved"
    resolution_type: str = "shortage_confirmed"
    notes: Optional[str] = None


class DiscrepancyResolutionData(BaseModel):
    discrepancy_id: str
    shipment_id: str
    status: str
    resolution_type: str
    notes: Optional[str] = None
    resolved_by: Union[int, str]
    resolved_at: str


class DiscrepancyResolutionResponse(BaseModel):
    success: bool = True
    message: str = "Discrepancy investigation updated."
    data: DiscrepancyResolutionData


# ==========================================
# Legacy Models (Preserved for compatibility)
# ==========================================
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

    model_config = ConfigDict(populate_by_name=True)


class ShipmentItemOut(ShipmentItemBase):
    id: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ShipmentEventBase(BaseModel):
    status: str
    location: str
    performed_by: str = Field(..., alias="performedBy")
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ShipmentEventOut(ShipmentEventBase):
    id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


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

    model_config = ConfigDict(populate_by_name=True)


class ShipmentCreate(ShipmentBase):
    id: Optional[str] = None
    items: List[ShipmentItemBase] = []


class ShipmentStatusUpdate(BaseModel):
    status: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = Field(default="System", alias="performedBy")

    model_config = ConfigDict(populate_by_name=True)


class ShipmentUpdate(BaseModel):
    id: Optional[str] = None
    trackingNumber: Optional[str] = Field(default=None, alias="trackingNumber")
    tracking_number: Optional[str] = Field(default=None, alias="tracking_number")
    ownerId: Optional[str] = Field(default=None, alias="ownerId")
    owner_id: Optional[str] = Field(default=None, alias="owner_id")
    ownerName: Optional[str] = Field(default=None, alias="ownerName")
    owner_name: Optional[str] = Field(default=None, alias="owner_name")
    vendorId: Optional[Union[int, str]] = Field(default=None, alias="vendorId")
    vendor_id: Optional[Union[int, str]] = Field(default=None, alias="vendor_id")
    vendorName: Optional[str] = Field(default=None, alias="vendorName")
    vendor_name: Optional[str] = Field(default=None, alias="vendor_name")
    customerId: Optional[Union[int, str]] = Field(default=None, alias="customerId")
    customer_id: Optional[Union[int, str]] = Field(default=None, alias="customer_id")
    customerName: Optional[str] = Field(default=None, alias="customerName")
    customer_name: Optional[str] = Field(default=None, alias="customer_name")
    origin: Optional[str] = None
    destination: Optional[str] = None
    status: Optional[str] = None
    containerIds: Optional[List[str]] = Field(default=None, alias="containerIds")
    container_ids: Optional[List[str]] = Field(default=None, alias="container_ids")
    manifestHash: Optional[str] = Field(default=None, alias="manifestHash")
    manifest_hash: Optional[str] = Field(default=None, alias="manifest_hash")
    dispatchDate: Optional[datetime] = Field(default=None, alias="dispatchDate")
    dispatch_date: Optional[datetime] = Field(default=None, alias="dispatch_date")
    estimatedDelivery: Optional[datetime] = Field(default=None, alias="estimatedDelivery")
    estimated_delivery: Optional[datetime] = Field(default=None, alias="estimated_delivery")
    actualDelivery: Optional[datetime] = Field(default=None, alias="actualDelivery")
    actual_delivery: Optional[datetime] = Field(default=None, alias="actual_delivery")
    notes: Optional[str] = None
    items: Optional[List[Any]] = Field(default=None)

    # Legacy event fields
    location: Optional[str] = None
    performed_by: Optional[str] = Field(default=None, alias="performedBy")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "trackingNumber": "TRK-DHM-884920",
                "ownerId": "usr-owner-01",
                "ownerName": "Dhruva (Owner)",
                "vendorId": "12",
                "vendorName": "Sinu Gunshetty (Trans-Express)",
                "customerId": "24",
                "customerName": "Anusha S (BioMed)",
                "origin": "Apex Central Depot (Hub Alpha)",
                "destination": "BioMed Research Campus Bay 2",
                "status": "Draft",
                "containerIds": ["CNT-ALPHA-881"],
                "manifestHash": "0x7890abcdef123456",
                "dispatchDate": "2026-10-28T23:06:05.393Z",
                "estimatedDelivery": "2026-10-28T23:06:05.393Z",
                "actualDelivery": "2026-10-28T23:06:05.393Z",
                "notes": "Cold-chain priority handling required.",
                "id": "SHP-2026-001",
                "items": []
            }
        }
    )

    @model_validator(mode="before")
    @classmethod
    def sanitize_swagger_placeholders(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Check for dummy "string" in Swagger UI
            for k in [
                "trackingNumber", "tracking_number",
                "ownerId", "owner_id",
                "ownerName", "owner_name",
                "vendorId", "vendor_id",
                "vendorName", "vendor_name",
                "customerId", "customer_id",
                "customerName", "customer_name",
                "origin", "destination",
                "manifestHash", "manifest_hash",
                "notes", "id"
            ]:
                if data.get(k) == "string":
                    data[k] = None
            if data.get("status") == "string":
                data["status"] = None
        return data


class ShipmentUpdateResponse(BaseModel):
    success: bool = True
    message: str = "Shipment updated successfully."
    data: Dict[str, Any]



class ShipmentOut(ShipmentBase):
    id: str
    items: List[ShipmentItemOut] = []
    events: List[ShipmentEventOut] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


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

    model_config = ConfigDict(populate_by_name=True)


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

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
