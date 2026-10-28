from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from datetime import datetime
import uuid

SUPPORTED_CONTAINER_TYPES = [
    "Cold-Chain Bin",
    "Security Crate",
    "RFID Pallet",
    "Heavy Duty Tote",
    "Standard Container",
    "Standard Parcel"
]

SUPPORTED_CAPACITY_UNITS = [
    "Kilograms (kg)",
    "kg",
    "Pounds (lbs)",
    "lbs",
    "Discrete Units (count)",
    "units",
    "count",
    "Metric Tonnes (t)",
    "tonnes"
]


class ContainerItemBase(BaseModel):
    product_id: str = Field(..., alias="productId", examples=["prod-cryo-001"])
    product_name: str = Field(..., alias="productName", examples=["Cryo-Vaccine Vial"])
    sku: str = Field(..., examples=["SKU-CRYO-001"])
    barcode: str = Field(..., examples=["8901234567890"])
    quantity: int = Field(default=1, examples=[1])
    weight_kg: float = Field(default=0.0, alias="weightKg", examples=[3.5])
    unit_weight_kg: float = Field(default=0.0, alias="unitWeightKg", examples=[3.5])

    model_config = ConfigDict(populate_by_name=True)


class ContainerItemCreate(ContainerItemBase):
    id: Optional[str] = None


class ContainerItemOut(ContainerItemBase):
    id: str
    container_id: str = Field(..., alias="containerId")
    scanned_at: Optional[datetime] = Field(default=None, alias="scannedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class BarcodeScanRequest(BaseModel):
    barcode: str = Field(min_length=1, max_length=100, description="Product barcode (EAN-13, UPC, Code128, etc.)", examples=["8901063139374"])


class ScannedProductOut(BaseModel):
    id: Optional[Any] = None
    product_id: Optional[str] = None
    productId: Optional[str] = None
    product_name: str
    productName: Optional[str] = None
    sku: str
    barcode: str
    quantity: int = 1
    unit_weight: Optional[float] = 0.0
    unitWeight: Optional[float] = 0.0
    unit_weight_kg: Optional[float] = 0.0
    unitWeightKg: Optional[float] = 0.0
    total_weight: Optional[float] = 0.0
    totalWeight: Optional[float] = 0.0
    weight_kg: Optional[float] = 0.0
    weightKg: Optional[float] = 0.0

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            pid = data.get("product_id") or data.get("productId") or data.get("id")
            data["product_id"] = pid
            data["productId"] = pid
            pname = data.get("product_name") or data.get("productName") or data.get("name")
            data["product_name"] = pname
            data["productName"] = pname
            uw = data.get("unit_weight") or data.get("unitWeight") or data.get("unit_weight_kg") or data.get("unitWeightKg") or 0.0
            data["unit_weight"] = uw
            data["unitWeight"] = uw
            data["unit_weight_kg"] = uw
            data["unitWeightKg"] = uw
            tw = data.get("total_weight") or data.get("totalWeight") or data.get("weight_kg") or data.get("weightKg") or 0.0
            data["total_weight"] = tw
            data["totalWeight"] = tw
            data["weight_kg"] = tw
            data["weightKg"] = tw
        return data


class BarcodeScanResponse(BaseModel):
    success: bool = True
    message: str = "Product added to container successfully"
    container_id: str
    containerId: Optional[str] = None
    container_number: Optional[str] = None
    containerNumber: Optional[str] = None
    product: ScannedProductOut

    @model_validator(mode="before")
    @classmethod
    def populate_container_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            cid = data.get("container_id") or data.get("containerId")
            data["container_id"] = cid
            data["containerId"] = cid
            cnum = data.get("container_number") or data.get("containerNumber")
            data["container_number"] = cnum
            data["containerNumber"] = cnum
        return data


class ContainerCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "containerNumber": "CNT-ALPHA-206",
                "containerType": "Cold-Chain Bin",
                "maximumCapacity": 150,
                "capacityUnit": "Kilograms (kg)",
                "tamperEvidentSealNumber": "SEAL-SEC-19007",
                "initialLocation": "Central Warehouse Bay 4",
                "description": "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."
            }
        }
    )

    containerNumber: str = Field(
        default="CNT-ALPHA-206",
        min_length=1,
        alias="containerNumber",
        description="Unique container number identifier",
        examples=["CNT-ALPHA-206"]
    )
    containerType: str = Field(
        default="Cold-Chain Bin",
        min_length=1,
        alias="containerType",
        description="Supported container type (Cold-Chain Bin, Security Crate, RFID Pallet, Heavy Duty Tote, Standard Container, Standard Parcel)",
        examples=["Cold-Chain Bin"]
    )
    maximumCapacity: float = Field(
        default=150.0,
        alias="maximumCapacity",
        description="Maximum load capacity (must be greater than zero)",
        examples=[150.0]
    )
    capacityUnit: str = Field(
        default="Kilograms (kg)",
        min_length=1,
        alias="capacityUnit",
        description="Capacity unit of measure (Kilograms (kg), Pounds (lbs), Discrete Units (count))",
        examples=["Kilograms (kg)"]
    )
    tamperEvidentSealNumber: str = Field(
        default="SEAL-SEC-19007",
        min_length=1,
        alias="tamperEvidentSealNumber",
        description="Unique tamper-evident seal barcode/number",
        examples=["SEAL-SEC-19007"]
    )
    initialLocation: str = Field(
        default="Central Warehouse Bay 4",
        min_length=1,
        alias="initialLocation",
        description="Initial storage location or warehouse bay",
        examples=["Central Warehouse Bay 4"]
    )
    description: Optional[str] = Field(
        default="Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch.",
        description="Handling instructions, temperature controls, or dispatch notes",
        examples=["Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."]
    )
    id: Optional[str] = Field(
        default=None,
        description="Optional custom identifier"
    )

    @model_validator(mode="before")
    @classmethod
    def handle_swagger_dummy_and_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Check if this is the Swagger UI untouched placeholder payload (e.g. from clicking Execute directly)
            is_swagger_dummy = (
                data.get("containerType") == "string" and
                data.get("capacityUnit") == "string" and
                (data.get("maximumCapacity") == 0 or data.get("maximumCapacity") == 0.0)
            )
            if is_swagger_dummy:
                unique_hex = uuid.uuid4().hex[:4].upper()
                data["containerNumber"] = f"CNT-ALPHA-{unique_hex}"
                data["containerType"] = "Cold-Chain Bin"
                data["maximumCapacity"] = 150.0
                data["capacityUnit"] = "Kilograms (kg)"
                data["tamperEvidentSealNumber"] = f"SEAL-SEC-{unique_hex}"
                data["initialLocation"] = "Central Warehouse Bay 4"
                data["description"] = "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."
                data["id"] = None
                return data

            # Normalize containerNumber & handle "string" placeholder
            if "containerNumber" not in data and "container_number" in data:
                data["containerNumber"] = data["container_number"]
            if data.get("containerNumber") == "string":
                data["containerNumber"] = f"CNT-ALPHA-{uuid.uuid4().hex[:4].upper()}"

            # Normalize containerType & handle "string" placeholder
            if "containerType" not in data:
                if "type" in data:
                    data["containerType"] = data["type"]
                elif "container_type" in data:
                    data["containerType"] = data["container_type"]
            if data.get("containerType") == "string":
                data["containerType"] = "Cold-Chain Bin"

            # Normalize maximumCapacity
            if "maximumCapacity" not in data:
                if "maxCapacity" in data:
                    data["maximumCapacity"] = data["maxCapacity"]
                elif "max_capacity" in data:
                    data["maximumCapacity"] = data["max_capacity"]
                elif "capacityKg" in data:
                    data["maximumCapacity"] = data["capacityKg"]
                elif "capacity_kg" in data:
                    data["maximumCapacity"] = data["capacity_kg"]

            # Normalize capacityUnit & handle "string" placeholder
            if "capacityUnit" not in data:
                if "capacity_unit" in data:
                    data["capacityUnit"] = data["capacity_unit"]
            if data.get("capacityUnit") == "string":
                data["capacityUnit"] = "Kilograms (kg)"

            # Normalize tamperEvidentSealNumber & handle "string" placeholder
            if "tamperEvidentSealNumber" not in data:
                if "sealNumber" in data:
                    data["tamperEvidentSealNumber"] = data["sealNumber"]
                elif "seal_number" in data:
                    data["tamperEvidentSealNumber"] = data["seal_number"]
            if data.get("tamperEvidentSealNumber") == "string":
                data["tamperEvidentSealNumber"] = f"SEAL-SEC-{uuid.uuid4().hex[:5].upper()}"

            # Normalize initialLocation & handle "string" placeholder
            if "initialLocation" not in data:
                if "initial_location" in data:
                    data["initialLocation"] = data["initial_location"]
                elif "location" in data:
                    data["initialLocation"] = data["location"]
            if data.get("initialLocation") == "string":
                data["initialLocation"] = "Central Warehouse Bay 4"

            if data.get("description") == "string":
                data["description"] = "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."

            if data.get("id") == "string":
                data["id"] = None
        return data

    @field_validator("containerNumber")
    @classmethod
    def validate_container_number(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Container number cannot be empty")
        v_clean = v.strip()
        if v_clean.lower() == "string":
            return f"CNT-ALPHA-{uuid.uuid4().hex[:4].upper()}"
        return v_clean

    @field_validator("containerType")
    @classmethod
    def validate_container_type(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Container type cannot be empty")
        v_clean = v.strip()
        if v_clean.lower() == "string":
            return "Cold-Chain Bin"
        matched = next((t for t in SUPPORTED_CONTAINER_TYPES if t.lower() == v_clean.lower()), None)
        if not matched:
            supported = ", ".join(SUPPORTED_CONTAINER_TYPES)
            raise ValueError(f"Container type '{v}' is not supported. Supported types: {supported}")
        return matched

    @field_validator("maximumCapacity")
    @classmethod
    def validate_maximum_capacity(cls, v: float) -> float:
        if v is None or v <= 0:
            raise ValueError("Maximum capacity must be greater than zero")
        return v

    @field_validator("capacityUnit")
    @classmethod
    def validate_capacity_unit(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Capacity unit cannot be empty")
        v_clean = v.strip()
        if v_clean.lower() == "string":
            return "Kilograms (kg)"
        matched = next((u for u in SUPPORTED_CAPACITY_UNITS if u.lower() == v_clean.lower()), None)
        if not matched:
            supported = "Kilograms (kg), Pounds (lbs), Discrete Units (count)"
            raise ValueError(f"Capacity unit '{v}' is not supported. Supported units: {supported}")
        return v_clean

    @field_validator("tamperEvidentSealNumber")
    @classmethod
    def validate_seal_number(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Tamper-evident seal number cannot be empty")
        v_clean = v.strip()
        if v_clean.lower() == "string":
            return f"SEAL-SEC-{uuid.uuid4().hex[:5].upper()}"
        return v_clean

    @field_validator("initialLocation")
    @classmethod
    def validate_initial_location(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Initial location cannot be empty")
        v_clean = v.strip()
        if v_clean.lower() == "string":
            return "Central Warehouse Bay 4"
        return v_clean


class ContainerData(BaseModel):
    id: str
    containerNumber: str
    containerType: str
    maximumCapacity: float
    capacityUnit: str
    tamperEvidentSealNumber: str
    initialLocation: str
    description: Optional[str] = None
    status: str = "Available"
    initializationStatus: str = "Initialized"
    createdAt: str
    updatedAt: str

    model_config = ConfigDict(populate_by_name=True)


class ContainerCreateResponse(BaseModel):
    success: bool = True
    message: str = "Container created and initialized successfully"
    data: ContainerData

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Container created and initialized successfully",
                "data": {
                    "id": "CNT-ALPHA-206",
                    "containerNumber": "CNT-ALPHA-206",
                    "containerType": "Cold-Chain Bin",
                    "maximumCapacity": 150.0,
                    "capacityUnit": "Kilograms (kg)",
                    "tamperEvidentSealNumber": "SEAL-SEC-19007",
                    "initialLocation": "Central Warehouse Bay 4",
                    "description": "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch.",
                    "status": "Available",
                    "initializationStatus": "Initialized",
                    "createdAt": "2026-10-29T02:30:00Z",
                    "updatedAt": "2026-10-29T02:30:00Z"
                }
            }
        }
    )


class ContainerBase(BaseModel):
    container_number: str = Field(..., alias="containerNumber")
    type: str = Field(default="Standard Container", alias="containerType")
    max_capacity: float = Field(default=100.0, alias="maximumCapacity")
    capacity_unit: str = Field(default="kg", alias="capacityUnit")
    capacity_kg: float = Field(default=100.0, alias="capacityKg")
    current_weight_kg: float = Field(default=0.0, alias="currentWeightKg")
    utilized_capacity: Optional[float] = Field(default=0.0, alias="utilizedCapacity")
    seal_number: Optional[str] = Field(default=None, alias="tamperEvidentSealNumber")
    seal_status: Optional[str] = Field(default="Active", alias="sealStatus")
    initial_location: Optional[str] = Field(default="Central Distribution Center, Hub Alpha", alias="initialLocation")
    location: Optional[str] = Field(default="Central Distribution Center, Hub Alpha")
    description: Optional[str] = None
    status: Optional[str] = "Available"
    initialization_status: Optional[str] = Field(default="Initialized", alias="initializationStatus")
    assigned_shipment_id: Optional[str] = Field(default=None, alias="assignedShipmentId")
    assigned_shipment_tracking: Optional[str] = Field(default=None, alias="assignedShipmentTracking")
    created_by: Optional[str] = Field(default="System", alias="createdBy")
    is_active: Optional[bool] = Field(default=True, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class ContainerUpdate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "containerNumber": "CNT-ALPHA-206",
                "containerType": "Cold-Chain Bin",
                "maximumCapacity": 150.0,
                "capacityUnit": "Kilograms (kg)",
                "tamperEvidentSealNumber": "SEAL-SEC-19007",
                "initialLocation": "Central Warehouse Bay 4",
                "location": "Central Warehouse Bay 4",
                "description": "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch.",
                "status": "Active"
            }
        }
    )

    container_number: Optional[str] = Field(
        default=None,
        alias="containerNumber",
        description="Unique container identifier",
        examples=["CNT-ALPHA-206"]
    )
    containerType: Optional[str] = Field(
        default=None,
        alias="containerType",
        description="Supported container type (Cold-Chain Bin, Security Crate, RFID Pallet, Heavy Duty Tote, Standard Container)",
        examples=["Cold-Chain Bin"]
    )
    type: Optional[str] = Field(default=None, description="Alias for containerType", examples=["Cold-Chain Bin"])
    maximumCapacity: Optional[float] = Field(
        default=None,
        alias="maximumCapacity",
        description="Maximum load capacity",
        examples=[150.0]
    )
    max_capacity: Optional[float] = Field(default=None, alias="maxCapacity", examples=[150.0])
    capacity_unit: Optional[str] = Field(default=None, alias="capacityUnit", examples=["Kilograms (kg)"])
    capacity_kg: Optional[float] = Field(default=None, alias="capacityKg", examples=[150.0])
    current_weight_kg: Optional[float] = Field(default=None, alias="currentWeightKg", examples=[0.0])
    utilized_capacity: Optional[float] = Field(default=None, alias="utilizedCapacity", examples=[0.0])
    tamperEvidentSealNumber: Optional[str] = Field(
        default=None,
        alias="tamperEvidentSealNumber",
        description="Tamper-evident seal barcode/number",
        examples=["SEAL-SEC-19007"]
    )
    seal_number: Optional[str] = Field(default=None, alias="sealNumber", examples=["SEAL-SEC-19007"])
    seal_status: Optional[str] = Field(default=None, alias="sealStatus", examples=["Active"])
    initial_location: Optional[str] = Field(default=None, alias="initialLocation", examples=["Central Warehouse Bay 4"])
    location: Optional[str] = Field(default=None, examples=["Central Warehouse Bay 4"])
    description: Optional[str] = Field(
        default=None,
        description="Handling instructions or notes",
        examples=["Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."]
    )
    status: Optional[str] = Field(default=None, description="Container status (Available, Active, IN_PROGRESS, Sealed)", examples=["Active"])
    initialization_status: Optional[str] = Field(default=None, alias="initializationStatus", examples=["Initialized"])
    assigned_shipment_id: Optional[str] = Field(default=None, alias="assignedShipmentId")
    assigned_shipment_tracking: Optional[str] = Field(default=None, alias="assignedShipmentTracking")
    is_active: Optional[bool] = Field(default=None, alias="isActive", examples=[True])

    @model_validator(mode="before")
    @classmethod
    def sanitize_swagger_placeholders(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Clean up dummy "string" and 0 placeholders from Swagger UI
            is_swagger_dummy = (
                data.get("containerType") == "string" and
                data.get("capacityUnit") == "string" and
                (data.get("maximumCapacity") == 0 or data.get("maximumCapacity") == 0.0)
            )
            if is_swagger_dummy:
                data["containerType"] = "Cold-Chain Bin"
                data["capacityUnit"] = "Kilograms (kg)"
                data["maximumCapacity"] = 150.0
                data["location"] = "Central Warehouse Bay 4"
                data["initialLocation"] = "Central Warehouse Bay 4"
                data["description"] = "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."
                data["status"] = "Active"
                data.pop("containerNumber", None)
                data.pop("tamperEvidentSealNumber", None)
                data.pop("sealNumber", None)
                return data

            string_keys = [
                "containerNumber", "container_number",
                "containerType", "type",
                "capacityUnit", "capacity_unit",
                "tamperEvidentSealNumber", "seal_number", "sealNumber", "sealStatus",
                "initialLocation", "initial_location", "location",
                "description", "status", "initializationStatus", "initialization_status",
                "assignedShipmentId", "assigned_shipment_id",
                "assignedShipmentTracking", "assigned_shipment_tracking"
            ]
            for k in string_keys:
                if data.get(k) == "string":
                    data[k] = None

            if data.get("maximumCapacity") == 0 or data.get("maximumCapacity") == 0.0:
                data["maximumCapacity"] = None
            if data.get("maxCapacity") == 0 or data.get("maxCapacity") == 0.0:
                data["maxCapacity"] = None
            if data.get("max_capacity") == 0 or data.get("max_capacity") == 0.0:
                data["max_capacity"] = None

        return data



class ContainerOut(ContainerBase):
    id: str
    item_count: int = Field(default=0, alias="itemCount")
    items: List[ContainerItemOut] = []
    products: Optional[List[ScannedProductOut]] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
