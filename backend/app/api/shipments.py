from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
import hashlib
from datetime import datetime

from app.database import get_db
from app.models.shipment import Shipment, ShipmentItem, ShipmentEvent
from app.schemas.shipment import (
    ShipmentCreate, ShipmentStatusUpdate, ShipmentOut,
    ShipmentItemOut, ShipmentEventOut
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
