from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
import uuid
from datetime import datetime

from app.database import get_db
from app.models.container import Container, ContainerItem
from app.models.product import Product
from app.models.container_product import ContainerProduct
from app.schemas.container import (
    ContainerCreate, ContainerUpdate, ContainerOut,
    ContainerData, ContainerCreateResponse,
    ContainerItemCreate, ContainerItemOut,
    BarcodeScanRequest, BarcodeScanResponse, ScannedProductOut,
    SUPPORTED_CONTAINER_TYPES, SUPPORTED_CAPACITY_UNITS
)

router = APIRouter(prefix="/containers", tags=["Tamper-Evident Containers"])

SAMPLE_CONTAINER_REQUEST = {
    "containerNumber": "CNT-ALPHA-206",
    "containerType": "Cold-Chain Bin",
    "maximumCapacity": 150,
    "capacityUnit": "Kilograms (kg)",
    "tamperEvidentSealNumber": "SEAL-SEC-19007",
    "initialLocation": "Central Warehouse Bay 4",
    "description": "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."
}

SAMPLE_CONTAINER_UPDATE_REQUEST = {
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



def _to_container_out(container: Container) -> dict:
    created_at_str = container.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if container.created_at else None
    updated_at_str = container.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if container.updated_at else None
    items_list = container.items if container.items else []
    
    products_list = []
    if hasattr(container, "products_association") and container.products_association:
        for p_assoc in container.products_association:
            products_list.append({
                "id": p_assoc.product_id,
                "product_id": p_assoc.product_id,
                "productName": p_assoc.product_name,
                "product_name": p_assoc.product_name,
                "sku": p_assoc.sku,
                "barcode": p_assoc.barcode,
                "quantity": p_assoc.quantity,
                "unitWeight": p_assoc.unit_weight,
                "unit_weight": p_assoc.unit_weight,
                "unitWeightKg": p_assoc.unit_weight,
                "unit_weight_kg": p_assoc.unit_weight,
                "totalWeight": p_assoc.total_weight,
                "total_weight": p_assoc.total_weight,
                "weightKg": p_assoc.total_weight,
                "weight_kg": p_assoc.total_weight
            })
    elif items_list:
        for it in items_list:
            products_list.append({
                "id": it.product_id,
                "product_id": it.product_id,
                "productName": it.product_name,
                "product_name": it.product_name,
                "sku": it.sku,
                "barcode": it.barcode,
                "quantity": it.quantity,
                "unitWeight": getattr(it, "unit_weight", getattr(it, "unit_weight_kg", 0.0)),
                "unit_weight": getattr(it, "unit_weight", getattr(it, "unit_weight_kg", 0.0)),
                "unitWeightKg": getattr(it, "unit_weight_kg", 0.0),
                "unit_weight_kg": getattr(it, "unit_weight_kg", 0.0),
                "totalWeight": getattr(it, "total_weight", getattr(it, "weight_kg", 0.0)),
                "total_weight": getattr(it, "total_weight", getattr(it, "weight_kg", 0.0)),
                "weightKg": getattr(it, "weight_kg", 0.0),
                "weight_kg": getattr(it, "weight_kg", 0.0)
            })

    return {
        "id": container.id,
        "containerNumber": container.container_number,
        "container_number": container.container_number,
        "containerType": container.type,
        "type": container.type,
        "maximumCapacity": container.max_capacity,
        "max_capacity": container.max_capacity,
        "maxCapacity": container.max_capacity,
        "capacityUnit": container.capacity_unit,
        "capacity_unit": container.capacity_unit,
        "capacityKg": container.capacity_kg,
        "capacity_kg": container.capacity_kg,
        "currentWeightKg": container.current_weight_kg,
        "current_weight_kg": container.current_weight_kg,
        "utilizedCapacity": container.utilized_capacity,
        "utilized_capacity": container.utilized_capacity,
        "tamperEvidentSealNumber": container.seal_number,
        "sealNumber": container.seal_number,
        "seal_number": container.seal_number,
        "sealStatus": container.seal_status,
        "seal_status": container.seal_status,
        "initialLocation": container.initial_location,
        "initial_location": container.initial_location,
        "location": container.location,
        "description": container.description,
        "status": container.status,
        "initializationStatus": container.initialization_status or "Initialized",
        "initialization_status": container.initialization_status or "Initialized",
        "assignedShipmentId": container.assigned_shipment_id,
        "assigned_shipment_id": container.assigned_shipment_id,
        "assignedShipmentTracking": container.assigned_shipment_tracking,
        "assigned_shipment_tracking": container.assigned_shipment_tracking,
        "createdBy": container.created_by,
        "created_by": container.created_by,
        "isActive": container.is_active,
        "is_active": container.is_active,
        "createdAt": created_at_str,
        "created_at": created_at_str,
        "updatedAt": updated_at_str,
        "updated_at": updated_at_str,
        "itemCount": len(items_list),
        "item_count": len(items_list),
        "items": items_list,
        "products": products_list
    }


@router.get("", response_model=List[ContainerOut])
def list_containers(
    status: Optional[str] = Query(None, description="Filter by container status"),
    search: Optional[str] = Query(None, description="Search by number or seal"),
    db: Session = Depends(get_db)
):
    query = db.query(Container)
    if status and status.upper() != "ALL":
        query = query.filter(Container.status == status)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Container.container_number.ilike(s)) |
            (Container.seal_number.ilike(s)) |
            (Container.location.ilike(s))
        )
    containers = query.order_by(Container.created_at.desc()).all()
    return [_to_container_out(c) for c in containers]


@router.get("/{container_id}", response_model=ContainerOut)
def get_container(container_id: str, db: Session = Depends(get_db)):
    c = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")
    return _to_container_out(c)


@router.post(
    "",
    response_model=ContainerCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create & Initialize Container",
    description="Create a new container and initialize its configuration. Validates containerNumber and tamperEvidentSealNumber uniqueness, ensures capacity > 0, supported types and units, and executes within a database transaction."
)
def create_container(
    payload: ContainerCreate = Body(
        ...,
        openapi_examples={
            "default": {
                "summary": "Cold-Chain Bin Container",
                "description": "Standard initialization payload for a cold-chain bin container with security seal and temperature handling instructions",
                "value": SAMPLE_CONTAINER_REQUEST
            }
        }
    ),
    db: Session = Depends(get_db)
):
    """
    Create a new container and initialize its configuration.
    Validates containerNumber and tamperEvidentSealNumber uniqueness,
    ensures capacity > 0, supported types and units, and executes
    within a database transaction.
    """
    # 1. Check uniqueness of container number (case-insensitive)
    existing_by_num = db.query(Container).filter(
        func.lower(Container.container_number) == payload.containerNumber.strip().lower()
    ).first()
    if existing_by_num:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Container number already exists"
        )

    # 2. Check uniqueness of tamper-evident seal number (case-insensitive)
    existing_by_seal = db.query(Container).filter(
        func.lower(Container.seal_number) == payload.tamperEvidentSealNumber.strip().lower()
    ).first()
    if existing_by_seal:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tamper-evident seal number already in use"
        )

    # 3. Determine primary key ID (use container number or specified ID)
    cid = payload.id.strip() if payload.id and payload.id.strip() else payload.containerNumber.strip()

    # If an existing container has this primary key, fall back to unique identifier
    existing_by_id = db.query(Container).filter(Container.id == cid).first()
    if existing_by_id:
        cid = f"cnt-{uuid.uuid4().hex[:8]}"

    now_dt = datetime.utcnow()
    iso_time = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    # 4. Database Transaction to create and initialize the container consistently
    try:
        new_container = Container(
            id=cid,
            container_number=payload.containerNumber.strip(),
            type=payload.containerType,
            max_capacity=float(payload.maximumCapacity),
            capacity_unit=payload.capacityUnit,
            capacity_kg=float(payload.maximumCapacity),
            current_weight_kg=0.0,
            utilized_capacity=0.0,
            seal_number=payload.tamperEvidentSealNumber.strip(),
            seal_status="Active",
            initial_location=payload.initialLocation.strip(),
            location=payload.initialLocation.strip(),
            description=payload.description.strip() if payload.description else None,
            status="Available",
            initialization_status="Initialized",
            assigned_shipment_id=None,
            assigned_shipment_tracking="Unassigned",
            created_by="System",
            created_at=now_dt,
            updated_at=now_dt,
            is_active=True
        )
        db.add(new_container)
        db.commit()
        db.refresh(new_container)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Container number already exists"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create and initialize container: {str(e)}"
        )

    created_iso = new_container.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if new_container.created_at else iso_time
    updated_iso = new_container.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if new_container.updated_at else iso_time

    return ContainerCreateResponse(
        success=True,
        message="Container created and initialized successfully",
        data=ContainerData(
            id=new_container.id,
            containerNumber=new_container.container_number,
            containerType=new_container.type,
            maximumCapacity=new_container.max_capacity,
            capacityUnit=new_container.capacity_unit,
            tamperEvidentSealNumber=new_container.seal_number,
            initialLocation=new_container.initial_location,
            description=new_container.description,
            status=new_container.status,
            initializationStatus=new_container.initialization_status or "Initialized",
            createdAt=created_iso,
            updatedAt=updated_iso
        )
    )


@router.put(
    "/{container_id}",
    response_model=ContainerOut,
    summary="Update Container",
    description="Update container configuration, capacity, tamper seal, location, status, or handling notes."
)
def update_container(
    container_id: str,
    update_in: ContainerUpdate = Body(
        ...,
        openapi_examples={
            "standard_update": {
                "summary": "Update Container Configuration",
                "description": "Standard container update payload",
                "value": SAMPLE_CONTAINER_UPDATE_REQUEST
            }
        }
    ),
    db: Session = Depends(get_db)
):
    # Lookup container by ID or container_number
    c = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()

    # If Swagger placeholder "{container_id}" or "string" was sent, fallback to latest container
    if not c and container_id in ["{container_id}", "string", ""]:
        c = db.query(Container).order_by(Container.created_at.desc()).first()

    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container '{container_id}' not found."
        )

    data = update_in.model_dump(exclude_unset=True)

    # Check containerNumber uniqueness if updated and not empty/dummy
    new_num = data.get("container_number") or data.get("containerNumber")
    if new_num and new_num not in ["string", ""] and new_num.strip().lower() != c.container_number.lower():
        existing = db.query(Container).filter(
            func.lower(Container.container_number) == new_num.strip().lower(),
            Container.id != c.id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Container number already exists")
        c.container_number = new_num.strip()

    # Check sealNumber uniqueness if updated and not empty/dummy
    new_seal = data.get("seal_number") or data.get("tamperEvidentSealNumber") or data.get("sealNumber")
    if new_seal and new_seal not in ["string", ""] and (not c.seal_number or new_seal.strip().lower() != c.seal_number.lower()):
        existing = db.query(Container).filter(
            func.lower(Container.seal_number) == new_seal.strip().lower(),
            Container.id != c.id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tamper-evident seal number already in use")
        c.seal_number = new_seal.strip()

    # Container Type
    raw_type = data.get("containerType") or data.get("type")
    if raw_type and raw_type != "string":
        matched_type = next((t for t in SUPPORTED_CONTAINER_TYPES if t.lower() == raw_type.strip().lower()), raw_type.strip())
        c.type = matched_type

    # Maximum Capacity (safely check for numeric value without 0 or None causing TypeError)
    raw_cap = None
    for k in ["maximumCapacity", "max_capacity", "maxCapacity", "capacity_kg", "capacityKg"]:
        if k in data and data[k] is not None:
            raw_cap = data[k]
            break
    if raw_cap is not None and float(raw_cap) > 0:
        cap_val = float(raw_cap)
        c.max_capacity = cap_val
        c.capacity_kg = cap_val
        if c.capacity_kg > 0:
            c.utilized_capacity = min(100.0, round((c.current_weight_kg / c.capacity_kg) * 100.0, 1))

    # Capacity Unit
    raw_unit = data.get("capacityUnit") or data.get("capacity_unit")
    if raw_unit and raw_unit != "string":
        c.capacity_unit = raw_unit.strip()

    # Location
    raw_init_loc = data.get("initialLocation") or data.get("initial_location")
    if raw_init_loc and raw_init_loc != "string":
        c.initial_location = raw_init_loc.strip()

    raw_loc = data.get("location")
    if raw_loc and raw_loc != "string":
        c.location = raw_loc.strip()

    # Description
    raw_desc = data.get("description")
    if raw_desc is not None and raw_desc != "string":
        c.description = raw_desc.strip()

    # Status
    raw_status = data.get("status")
    if raw_status and raw_status != "string":
        c.status = raw_status.strip()

    # Initialization Status
    raw_init_status = data.get("initializationStatus") or data.get("initialization_status")
    if raw_init_status and raw_init_status != "string":
        c.initialization_status = raw_init_status.strip()

    # Shipment info
    raw_shp_id = data.get("assignedShipmentId") or data.get("assigned_shipment_id")
    if raw_shp_id and raw_shp_id != "string":
        c.assigned_shipment_id = raw_shp_id.strip()

    raw_shp_trk = data.get("assignedShipmentTracking") or data.get("assigned_shipment_tracking")
    if raw_shp_trk and raw_shp_trk != "string":
        c.assigned_shipment_tracking = raw_shp_trk.strip()

    if "isActive" in data or "is_active" in data:
        val = data.get("isActive") if "isActive" in data else data.get("is_active")
        if val is not None:
            c.is_active = bool(val)

    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return _to_container_out(c)



@router.delete("/{container_id}", status_code=status.HTTP_200_OK)
def delete_container(container_id: str, db: Session = Depends(get_db)):
    c = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")

    db.delete(c)
    db.commit()
    return {"success": True, "message": f"Container {c.container_number} deleted successfully."}


@router.post("/{container_id}/items", response_model=ContainerItemOut)
def add_item_to_container(container_id: str, item_in: ContainerItemCreate, db: Session = Depends(get_db)):
    c = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")

    item_id = item_in.id or f"item-{uuid.uuid4().hex[:8]}"
    item = ContainerItem(
        id=item_id,
        container_id=c.id,
        product_id=item_in.product_id,
        product_name=item_in.product_name,
        sku=item_in.sku,
        barcode=item_in.barcode,
        quantity=item_in.quantity,
        weight_kg=item_in.weight_kg,
        unit_weight_kg=item_in.unit_weight_kg,
        scanned_at=datetime.utcnow()
    )
    db.add(item)

    # Recalculate container weight and utilization
    c.current_weight_kg += item_in.weight_kg
    if c.capacity_kg > 0:
        c.utilized_capacity = min(100.0, round((c.current_weight_kg / c.capacity_kg) * 100.0, 1))
    if c.status in ["Empty", "Available"]:
        c.status = "Active"

    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{container_id}/items/{item_id}", status_code=status.HTTP_200_OK)
def remove_item_from_container(container_id: str, item_id: str, db: Session = Depends(get_db)):
    c = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")

    item = db.query(ContainerItem).filter(
        ContainerItem.container_id == c.id,
        ContainerItem.id == item_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container item not found.")

    c.current_weight_kg = max(0.0, c.current_weight_kg - item.weight_kg)
    if c.capacity_kg > 0:
        c.utilized_capacity = min(100.0, round((c.current_weight_kg / c.capacity_kg) * 100.0, 1))
    db.delete(item)
    c.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "message": f"Item {item_id} removed from container {c.container_number}."}


@router.post("/{container_id}/seal")
def seal_container(
    container_id: str,
    seal_number: str = Query(..., description="Security Seal Barcode"),
    db: Session = Depends(get_db)
):
    c = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")

    # Check if seal number is used by another container
    existing = db.query(Container).filter(
        func.lower(Container.seal_number) == seal_number.strip().lower(),
        Container.id != c.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tamper-evident seal number already in use"
        )

    c.seal_number = seal_number.strip()
    c.seal_status = "Active"
    c.status = "Sealed"
    c.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Container {c.container_number} successfully sealed with seal {seal_number}."}


@router.post(
    "/{container_id}/products/scan",
    response_model=BarcodeScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan Product Barcode into Container",
    description="Scan an EAN-13, UPC, or Code128 product barcode, validate against product master database, store association in container_products, increment quantity if scanned again, and update container manifest."
)
def scan_product_barcode(
    container_id: str,
    payload: BarcodeScanRequest,
    db: Session = Depends(get_db)
):
    barcode = payload.barcode.strip()
    if not barcode:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Barcode must not be empty.")

    # 1. Find the container by ID or container_number
    is_sqlite = bool(db.bind and db.bind.dialect.name == "sqlite")
    container_query = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    )
    if not is_sqlite:
        container_query = container_query.with_for_update()
    container = container_query.first()

    if not container:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found")

    if container.status in ["Sealed", "Closed", "Archived", "Inactive"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Container is not open for scanning"
        )

    # 2. Find the product in product master catalog
    product = db.query(Product).filter(
        (Product.barcode.ilike(barcode)) |
        (Product.sku.ilike(barcode)) |
        (Product.id == barcode)
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barcode not found in product master"
        )

    unit_weight = float(getattr(product, "unit_weight", 0.0) or 1.0)

    # 3. Find or create in container_products
    cp_item = db.query(ContainerProduct).filter(
        ContainerProduct.container_id == container.id,
        ContainerProduct.product_id == product.id
    ).first()

    if cp_item:
        cp_item.quantity += 1
        cp_item.total_weight = round(cp_item.quantity * unit_weight, 2)
        cp_item.scanned_at = datetime.utcnow()
    else:
        cp_item = ContainerProduct(
            id=f"cp-{uuid.uuid4().hex[:8]}",
            container_id=container.id,
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            quantity=1,
            unit_weight=unit_weight,
            total_weight=unit_weight,
            scanned_at=datetime.utcnow()
        )
        db.add(cp_item)

    # 4. Also synchronize container_items for GET /containers/{container_id} manifest
    ci_item = db.query(ContainerItem).filter(
        ContainerItem.container_id == container.id,
        ContainerItem.product_id == product.id
    ).first()

    if ci_item:
        ci_item.quantity += 1
        ci_item.weight_kg = round(ci_item.quantity * unit_weight, 2)
        ci_item.unit_weight_kg = unit_weight
        ci_item.scanned_at = datetime.utcnow()
    else:
        ci_item = ContainerItem(
            id=f"item-{uuid.uuid4().hex[:8]}",
            container_id=container.id,
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            quantity=1,
            weight_kg=unit_weight,
            unit_weight_kg=unit_weight,
            scanned_at=datetime.utcnow()
        )
        db.add(ci_item)

    try:
        db.flush()

        # Recalculate container weight and capacity utilization
        all_items = db.query(ContainerItem).filter(ContainerItem.container_id == container.id).all()
        total_weight = sum(item.weight_kg for item in all_items)
        container.current_weight_kg = round(total_weight, 2)
        if container.capacity_kg > 0:
            container.utilized_capacity = min(100.0, round((container.current_weight_kg / container.capacity_kg) * 100.0, 1))

        if container.status in ["Empty", "Available"]:
            container.status = "Active"

        container.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(container)
        db.refresh(cp_item)

        return {
            "success": True,
            "message": "Product added to container successfully",
            "container_id": container.id,
            "container_number": container.container_number,
            "product": {
                "id": product.id,
                "product_id": str(product.id),
                "product_name": product.name,
                "sku": product.sku,
                "barcode": product.barcode,
                "quantity": cp_item.quantity,
                "unit_weight": unit_weight,
                "unit_weight_kg": unit_weight,
                "total_weight": cp_item.total_weight,
                "weight_kg": cp_item.total_weight
            }
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Concurrent scan detected. Refresh and retry."
        )
    except Exception:
        db.rollback()
        raise


@router.get(
    "/{container_id}/products",
    response_model=List[ScannedProductOut],
    summary="Get Container Scanned Products",
    description="Load the complete manifest of products stored in a container."
)
def get_container_products(container_id: str, db: Session = Depends(get_db)):
    container = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()

    if not container:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found")

    items = db.query(ContainerProduct).filter(ContainerProduct.container_id == container.id).all()
    if not items:
        # Fallback to ContainerItem
        c_items = db.query(ContainerItem).filter(ContainerItem.container_id == container.id).all()
        return [
            {
                "id": it.product_id,
                "product_id": it.product_id,
                "product_name": it.product_name,
                "sku": it.sku,
                "barcode": it.barcode,
                "quantity": it.quantity,
                "unit_weight": it.unit_weight_kg,
                "unit_weight_kg": it.unit_weight_kg,
                "total_weight": it.weight_kg,
                "weight_kg": it.weight_kg,
            }
            for it in c_items
        ]

    return [
        {
            "id": it.product_id,
            "product_id": it.product_id,
            "product_name": it.product_name,
            "sku": it.sku,
            "barcode": it.barcode,
            "quantity": it.quantity,
            "unit_weight": it.unit_weight,
            "unit_weight_kg": it.unit_weight,
            "total_weight": it.total_weight,
            "weight_kg": it.total_weight,
        }
        for it in items
    ]


@router.delete(
    "/{container_id}/products/{product_id}",
    summary="Remove Product from Container",
    description="Remove a product from the container manifest by product ID, SKU, or Barcode."
)
def remove_product_from_container(container_id: str, product_id: str, db: Session = Depends(get_db)):
    container = db.query(Container).filter(
        (Container.id == container_id) |
        (Container.container_number.ilike(container_id))
    ).first()

    if not container:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found")

    # Delete matching rows from ContainerProduct
    cps = db.query(ContainerProduct).filter(
        ContainerProduct.container_id == container.id,
        (ContainerProduct.product_id == product_id) |
        (ContainerProduct.id == product_id) |
        (ContainerProduct.sku.ilike(product_id)) |
        (ContainerProduct.barcode.ilike(product_id))
    ).all()
    for cp in cps:
        db.delete(cp)

    # Delete matching rows from ContainerItem
    cis = db.query(ContainerItem).filter(
        ContainerItem.container_id == container.id,
        (ContainerItem.product_id == product_id) |
        (ContainerItem.id == product_id) |
        (ContainerItem.sku.ilike(product_id)) |
        (ContainerItem.barcode.ilike(product_id))
    ).all()
    for ci in cis:
        db.delete(ci)

    if not cps and not cis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found in this container")

    db.flush()

    # Recalculate container weight and capacity utilization
    remaining_items = db.query(ContainerItem).filter(ContainerItem.container_id == container.id).all()
    container.current_weight_kg = round(sum(it.weight_kg for it in remaining_items), 2)
    if container.capacity_kg > 0:
        container.utilized_capacity = min(100.0, round((container.current_weight_kg / container.capacity_kg) * 100.0, 1))

    container.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": f"Product removed from container {container.container_number} successfully.",
        "container_id": container.id,
        "container_number": container.container_number
    }

