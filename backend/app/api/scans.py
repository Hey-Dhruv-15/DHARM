from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.database import get_db
from app.models.scan import ScanRecord
from app.models.product import Product
from app.models.container import Container
from app.models.shipment import Shipment, ShipmentItem
from app.schemas.scan import (
    ScanRecordCreate, ScanRecordOut,
    ScanVerificationRequest, ScanVerificationResponse
)

router = APIRouter(prefix="/scans", tags=["Barcode & Tamper-Evident Scanning"])


@router.get("", response_model=List[ScanRecordOut])
def list_scans(
    limit: int = Query(50, le=200),
    shipment_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ScanRecord)
    if shipment_id:
        query = query.filter(ScanRecord.shipment_id == shipment_id)
    if role:
        query = query.filter(ScanRecord.role == role)
    return query.order_by(ScanRecord.scanned_at.desc()).limit(limit).all()


@router.post("", response_model=ScanRecordOut, status_code=status.HTTP_201_CREATED)
def record_scan(scan_in: ScanRecordCreate, db: Session = Depends(get_db)):
    scan_id = scan_in.id or f"scan-{uuid.uuid4().hex[:8]}"
    new_scan = ScanRecord(
        id=scan_id,
        scanned_code=scan_in.scanned_code,
        scanned_by=scan_in.scanned_by,
        role=scan_in.role,
        shipment_id=scan_in.shipment_id,
        container_id=scan_in.container_id,
        type=scan_in.type,
        result=scan_in.result,
        notes=scan_in.notes,
        scanned_at=datetime.utcnow()
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)
    return new_scan


@router.post("/verify", response_model=ScanVerificationResponse)
def verify_scan(req: ScanVerificationRequest, db: Session = Depends(get_db)):
    code = req.scanned_code.strip()

    # 1. Check if it's a Container Number
    container = db.query(Container).filter(Container.container_number.ilike(code)).first()
    if container:
        # Record scan
        db.add(ScanRecord(
            id=f"scan-{uuid.uuid4().hex[:8]}",
            scanned_code=code,
            scanned_by=req.scanned_by,
            role=req.role,
            shipment_id=req.shipment_id,
            container_id=container.id,
            type="Container",
            result="Expected Match",
            notes=f"Container {container.container_number} verified",
            scanned_at=datetime.utcnow()
        ))
        db.commit()
        return ScanVerificationResponse(
            scanned_code=code,
            type="Container",
            is_valid=True,
            result="Expected Match",
            message=f"Container {container.container_number} recognized ({container.status}).",
            matched_entity={"id": container.id, "containerNumber": container.container_number, "status": container.status}
        )

    # 2. Check if it's a Security Seal
    seal_container = db.query(Container).filter(Container.seal_number.ilike(code)).first()
    if seal_container:
        is_compromised = seal_container.seal_status in ["Compromised", "Broken"]
        result = "Compromised Seal" if is_compromised else "Expected Match"
        db.add(ScanRecord(
            id=f"scan-{uuid.uuid4().hex[:8]}",
            scanned_code=code,
            scanned_by=req.scanned_by,
            role=req.role,
            shipment_id=req.shipment_id,
            container_id=seal_container.id,
            type="Seal",
            result=result,
            notes=f"Seal verified for {seal_container.container_number}",
            scanned_at=datetime.utcnow()
        ))
        db.commit()
        return ScanVerificationResponse(
            scanned_code=code,
            type="Seal",
            is_valid=not is_compromised,
            result=result,
            message=f"Security seal associated with container {seal_container.container_number} ({seal_container.seal_status}).",
            matched_entity={"containerId": seal_container.id, "sealStatus": seal_container.seal_status}
        )

    # 3. Check if it's a Product Barcode
    product = db.query(Product).filter(Product.barcode.ilike(code)).first()
    if product:
        # Check against shipment if provided
        result = "Expected Match"
        message = f"Product '{product.name}' ({product.sku}) verified."
        if req.shipment_id:
            s_item = db.query(ShipmentItem).filter(
                ShipmentItem.shipment_id == req.shipment_id,
                ShipmentItem.product_id == product.id
            ).first()
            if s_item:
                s_item.scanned_quantity += 1
                if s_item.scanned_quantity > s_item.expected_quantity:
                    result = "Duplicate Attempt"
                    message = f"Warning: Scanned quantity exceeds expected manifest quantity for '{product.name}'."
                elif s_item.scanned_quantity == s_item.expected_quantity:
                    s_item.status = "Verified"
                    s_item.verified_quantity = s_item.scanned_quantity
            else:
                result = "Unexpected Product"
                message = f"Anomaly: Item '{product.name}' is not in the declared shipment manifest."

        db.add(ScanRecord(
            id=f"scan-{uuid.uuid4().hex[:8]}",
            scanned_code=code,
            scanned_by=req.scanned_by,
            role=req.role,
            shipment_id=req.shipment_id,
            container_id=req.container_id,
            type="Product",
            result=result,
            notes=message,
            scanned_at=datetime.utcnow()
        ))
        db.commit()
        return ScanVerificationResponse(
            scanned_code=code,
            type="Product",
            is_valid=(result == "Expected Match"),
            result=result,
            message=message,
            matched_entity={"id": product.id, "sku": product.sku, "name": product.name}
        )

    # Unknown Code
    db.add(ScanRecord(
        id=f"scan-{uuid.uuid4().hex[:8]}",
        scanned_code=code,
        scanned_by=req.scanned_by,
        role=req.role,
        shipment_id=req.shipment_id,
        container_id=req.container_id,
        type="Unknown",
        result="Unexpected Product",
        notes="Unrecognized code scanned.",
        scanned_at=datetime.utcnow()
    ))
    db.commit()

    return ScanVerificationResponse(
        scanned_code=code,
        type="Unknown",
        is_valid=False,
        result="Unexpected Product",
        message=f"Code '{code}' was not found in catalog, containers, or active seals.",
        matched_entity=None
    )
