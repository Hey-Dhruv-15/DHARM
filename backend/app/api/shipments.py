from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
import hashlib
import random
from datetime import datetime, timedelta

from app.database import get_db
from app.models.shipment import Shipment, ShipmentItem, ShipmentEvent
from app.models.container import Container
from app.models.product import Product
from app.models.audit import AuditEvent
from app.schemas.shipment import (
    ShipmentCreate, ShipmentStatusUpdate, ShipmentOut,
    ShipmentItemOut, ShipmentEventOut,
    OutboundDeliveryCreate, OutboundDeliveryResponse
)

router = APIRouter(prefix="/shipments", tags=["Shipments & Custody Tracking"])


@router.get("", response_model=List[ShipmentOut])
def list_shipments(
    status: Optional[str] = Query(None, description="Filter by status"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor ID"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    owner_id: Optional[str] = Query(None, description="Filter by owner ID"),
    db: Session = Depends(get_db)
):
    query = db.query(Shipment)
    if status:
        query = query.filter(Shipment.status == status)
    if vendor_id:
        query = query.filter(Shipment.vendor_id == vendor_id)
    if customer_id:
        query = query.filter(Shipment.customer_id == customer_id)
    if owner_id:
        query = query.filter(Shipment.owner_id == owner_id)

    return query.order_by(Shipment.created_at.desc()).all()


@router.get("/track/{tracking_number}", response_model=ShipmentOut)
def track_shipment(tracking_number: str, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.tracking_number == tracking_number.strip()).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with tracking number '{tracking_number}' not found."
        )
    return shipment


@router.get("/{shipment_id}", response_model=ShipmentOut)
def get_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with id '{shipment_id}' not found."
        )
    return shipment


@router.post("", response_model=ShipmentOut, status_code=status.HTTP_201_CREATED)
def create_shipment(shipment_in: ShipmentCreate, db: Session = Depends(get_db)):
    # Verify unique tracking number
    if db.query(Shipment).filter(Shipment.tracking_number == shipment_in.tracking_number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shipment with tracking number '{shipment_in.tracking_number}' already exists."
        )

    shipment_id = shipment_in.id or f"shp-{uuid.uuid4().hex[:8]}"

    # Generate cryptographic manifest hash if not provided
    manifest_string = f"{shipment_id}:{shipment_in.tracking_number}:{shipment_in.owner_id}:{shipment_in.vendor_id}:{shipment_in.customer_id}:{datetime.utcnow().isoformat()}"
    manifest_hash = shipment_in.manifest_hash or f"0x{hashlib.sha256(manifest_string.encode()).hexdigest()[:16]}"

    new_shipment = Shipment(
        id=shipment_id,
        tracking_number=shipment_in.tracking_number,
        owner_id=shipment_in.owner_id,
        owner_name=shipment_in.owner_name,
        vendor_id=shipment_in.vendor_id,
        vendor_name=shipment_in.vendor_name,
        customer_id=shipment_in.customer_id,
        customer_name=shipment_in.customer_name,
        origin=shipment_in.origin,
        destination=shipment_in.destination,
        status=shipment_in.status or "Draft",
        container_ids=shipment_in.container_ids,
        manifest_hash=manifest_hash,
        dispatch_date=shipment_in.dispatch_date,
        estimated_delivery=shipment_in.estimated_delivery,
        actual_delivery=shipment_in.actual_delivery,
        notes=shipment_in.notes,
        created_at=datetime.utcnow()
    )
    db.add(new_shipment)
    db.flush()

    # Add items
    for item_data in shipment_in.items:
        s_item = ShipmentItem(
            id=f"sitem-{uuid.uuid4().hex[:8]}",
            shipment_id=shipment_id,
            product_id=item_data.product_id,
            product_name=item_data.product_name,
            sku=item_data.sku,
            barcode=item_data.barcode,
            container_id=item_data.container_id,
            container_number=item_data.container_number,
            expected_quantity=item_data.expected_quantity,
            verified_quantity=item_data.verified_quantity,
            scanned_quantity=item_data.scanned_quantity,
            status=item_data.status
        )
        db.add(s_item)

    # Initial event
    initial_event = ShipmentEvent(
        id=f"evt-{uuid.uuid4().hex[:8]}",
        shipment_id=shipment_id,
        status=new_shipment.status,
        location=new_shipment.origin,
        performed_by=new_shipment.owner_name,
        notes="Manifest registered in system.",
        timestamp=datetime.utcnow()
    )
    db.add(initial_event)

    db.commit()
    db.refresh(new_shipment)
    return new_shipment


@router.put("/{shipment_id}/status", response_model=ShipmentOut)
def update_shipment_status(
    shipment_id: str,
    status_update: ShipmentStatusUpdate,
    db: Session = Depends(get_db)
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found.")

    shipment.status = status_update.status
    if status_update.status == "Delivered":
        shipment.actual_delivery = datetime.utcnow()
    elif status_update.status == "Dispatched" and not shipment.dispatch_date:
        shipment.dispatch_date = datetime.utcnow()

    # Append event
    event = ShipmentEvent(
        id=f"evt-{uuid.uuid4().hex[:8]}",
        shipment_id=shipment_id,
        status=status_update.status,
        location=status_update.location or shipment.destination,
        performed_by=status_update.performed_by or "System",
        notes=status_update.notes or f"Shipment status transitioned to {status_update.status}",
        timestamp=datetime.utcnow()
    )
    db.add(event)

    db.commit()
    db.refresh(shipment)
    return shipment


@router.post("/outbound", response_model=OutboundDeliveryResponse, status_code=status.HTTP_201_CREATED, summary="Dispatch Outbound Customer Delivery")
def dispatch_outbound_customer_delivery(
    delivery_in: OutboundDeliveryCreate,
    db: Session = Depends(get_db)
):
    """
    Dispatch Outbound Customer Delivery
    Bundle verified hub inventory into customer delivery manifest and dispatch outbound shipment.
    Matches 'Dispatch Outbound Customer Delivery' modal:
    - Customer Consignee
    - Facility Address
    - Courier Vehicle / Driver Unit
    - Delivery Notes
    """
    # 1. Resolve consignee, facility address, courier vehicle, and notes
    consignee = delivery_in.customer_consignee or delivery_in.customer_name or "Anusha S (BioMed Diagnostics)"
    facility_address = delivery_in.facility_address or delivery_in.destination or "BioMed Research Campus Bay 2 (Tech Park)"
    courier_vehicle = delivery_in.courier_vehicle or delivery_in.carrier_vehicle or "Midwest Van Express #402"
    notes_body = delivery_in.delivery_notes or delivery_in.notes or "Final mile expedited courier delivery."
    full_notes = f"{notes_body} | Vehicle: {courier_vehicle}"

    # 2. Generate or verify tracking number
    tracking_number = delivery_in.tracking_number
    if not tracking_number:
        for _ in range(10):
            candidate = f"TRK-DHM-{random.randint(100000, 999999)}"
            if not db.query(Shipment).filter(Shipment.tracking_number == candidate).first():
                tracking_number = candidate
                break
        if not tracking_number:
            tracking_number = f"TRK-DHM-{int(datetime.utcnow().timestamp())}"
    else:
        if db.query(Shipment).filter(Shipment.tracking_number == tracking_number).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Shipment with tracking number '{tracking_number}' already exists."
            )

    shipment_id = f"shp-{uuid.uuid4().hex[:8]}"

    # 3. Cryptographic manifest hash
    manifest_string = f"{shipment_id}:{tracking_number}:{delivery_in.vendor_id}:{delivery_in.customer_id}:{datetime.utcnow().isoformat()}"
    manifest_hash = f"0x{hashlib.sha256(manifest_string.encode()).hexdigest()[:16]}"

    # 4. Resolve containers
    container_ids = delivery_in.container_ids
    if not container_ids:
        first_container = db.query(Container).first()
        container_ids = [first_container.id] if first_container else ["cnt-01"]

    # 5. Create shipment entity
    shipment = Shipment(
        id=shipment_id,
        tracking_number=tracking_number,
        owner_id=delivery_in.owner_id or "usr-owner-01",
        owner_name=delivery_in.owner_name or "Dhruva (Owner)",
        vendor_id=delivery_in.vendor_id or "usr-vendor-02",
        vendor_name=delivery_in.vendor_name or "Trans-Express Regional Logistics",
        customer_id=delivery_in.customer_id or "usr-cust-03",
        customer_name=consignee,
        origin=delivery_in.origin or "Midwest Sorting Hub 4 (Cross-Dock)",
        destination=facility_address,
        status=delivery_in.status or "In Transit",
        container_ids=container_ids,
        manifest_hash=manifest_hash,
        dispatch_date=datetime.utcnow(),
        estimated_delivery=datetime.utcnow() + timedelta(days=2),
        notes=full_notes,
        created_at=datetime.utcnow()
    )
    db.add(shipment)
    db.flush()

    # 6. Bundle verified items into manifest
    if delivery_in.items:
        for item_data in delivery_in.items:
            s_item = ShipmentItem(
                id=f"sitem-{uuid.uuid4().hex[:8]}",
                shipment_id=shipment_id,
                product_id=item_data.product_id,
                product_name=item_data.product_name,
                sku=item_data.sku,
                barcode=item_data.barcode,
                container_id=item_data.container_id or (container_ids[0] if container_ids else "cnt-01"),
                container_number=item_data.container_number or "CNT-ALPHA-881",
                expected_quantity=item_data.expected_quantity or 10,
                verified_quantity=item_data.verified_quantity or 10,
                scanned_quantity=item_data.scanned_quantity or 10,
                status=item_data.status or "Verified"
            )
            db.add(s_item)
    else:
        # Bundle verified inventory from existing products in DB
        db_products = db.query(Product).all()
        if db_products:
            for p in db_products[:2]:
                s_item = ShipmentItem(
                    id=f"sitem-{uuid.uuid4().hex[:8]}",
                    shipment_id=shipment_id,
                    product_id=p.id,
                    product_name=p.name,
                    sku=p.sku,
                    barcode=p.barcode,
                    container_id=container_ids[0] if container_ids else "cnt-01",
                    container_number="CNT-ALPHA-881",
                    expected_quantity=10,
                    verified_quantity=10,
                    scanned_quantity=10,
                    status="Verified"
                )
                db.add(s_item)
        else:
            s_item = ShipmentItem(
                id=f"sitem-{uuid.uuid4().hex[:8]}",
                shipment_id=shipment_id,
                product_id="prod-001",
                product_name="Cryo-Shield Specimen Transporter",
                sku="MED-CRYO-901",
                barcode="BC-901-CRYO-8821",
                container_id=container_ids[0] if container_ids else "cnt-01",
                container_number="CNT-ALPHA-881",
                expected_quantity=10,
                verified_quantity=10,
                scanned_quantity=10,
                status="Verified"
            )
            db.add(s_item)

    # 7. Initial Dispatch Event
    initial_event = ShipmentEvent(
        id=f"evt-{uuid.uuid4().hex[:8]}",
        shipment_id=shipment_id,
        status=shipment.status,
        location=shipment.origin,
        performed_by=shipment.vendor_name,
        notes=f"Outbound customer delivery manifest bundled and dispatched via {courier_vehicle}.",
        timestamp=datetime.utcnow()
    )
    db.add(initial_event)

    # 8. Audit logging
    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.utcnow(),
        actor_name=shipment.vendor_name,
        actor_role="VENDOR",
        action="OUTBOUND_DELIVERY_DISPATCHED",
        entity_type="SHIPMENT",
        entity_id=shipment.id,
        details=f"Outbound delivery {shipment.tracking_number} dispatched to {consignee} at {facility_address} via {courier_vehicle}."
    )
    db.add(audit)

    db.commit()
    db.refresh(shipment)

    return OutboundDeliveryResponse(
        status="success",
        message="Outbound customer delivery manifest generated and dispatched.",
        tracking_number=shipment.tracking_number,
        manifest_hash=shipment.manifest_hash,
        courier_vehicle=courier_vehicle,
        customer_consignee=consignee,
        facility_address=facility_address,
        shipment_status=shipment.status,
        shipment=ShipmentOut.model_validate(shipment)
    )
