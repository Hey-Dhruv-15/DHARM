from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
import random
from datetime import datetime

from app.database import get_db
from app.models.discrepancy import DiscrepancyCase, DiscrepancyEvidence
from app.models.shipment import Shipment, ShipmentEvent
from app.models.audit import AuditEvent
from app.schemas.discrepancy import (
    DiscrepancyCreate, DiscrepancyUpdate, DiscrepancyOut,
    DiscrepancyEvidenceBase, DiscrepancyEvidenceOut,
    DiscrepancyReportRequest, DiscrepancyReportResponse
)

router = APIRouter(prefix="/discrepancies", tags=["Discrepancy Engine"])


@router.get("", response_model=List[DiscrepancyOut])
def list_discrepancies(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    severity: Optional[str] = Query(default=None, description="Filter by severity"),
    shipment_id: Optional[str] = Query(default=None, description="Filter by shipment ID"),
    db: Session = Depends(get_db)
):
    query = db.query(DiscrepancyCase)
    if isinstance(status, str):
        query = query.filter(DiscrepancyCase.status == status)
    if isinstance(severity, str):
        query = query.filter(DiscrepancyCase.severity == severity)
    if isinstance(shipment_id, str):
        query = query.filter(DiscrepancyCase.shipment_id == shipment_id)

    return query.order_by(DiscrepancyCase.detected_at.desc()).all()


@router.get("/{discrepancy_id}", response_model=DiscrepancyOut)
def get_discrepancy(discrepancy_id: str, db: Session = Depends(get_db)):
    disc = db.query(DiscrepancyCase).filter(DiscrepancyCase.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discrepancy case not found.")
    return disc


@router.post("/report", response_model=DiscrepancyReportResponse, status_code=status.HTTP_201_CREATED)
def report_shipment_exception(report_in: DiscrepancyReportRequest, db: Session = Depends(get_db)):
    """
    Primary API for 'Report Shipment Exception / Damage' screen.
    Fields accepted:
    - Affected Shipment (shipmentId / shipmentTracking)
    - Product SKU (sku / productId / productName)
    - Discrepancy Type (discrepancyType / type)
    - Severity (severity: Low, Medium, High, Critical)
    - Expected Units (expectedUnits / expectedQuantity)
    - Observed Physical Units (observedPhysicalUnits / observedQuantity)
    - Inspection Evidence Notes (inspectionEvidenceNotes / notes)
    """
    disc_id = f"disc-{uuid.uuid4().hex[:8]}"
    rand_suffix = random.randint(100, 999)
    disc_number = f"DIS-2026-{rand_suffix}"

    # Resolve values with fallback logic
    shipment_ref = report_in.shipment_id or "shp-2026-001"
    tracking_ref = report_in.shipment_tracking or (shipment_ref if shipment_ref.startswith("TRK-") else "TRK-DHM-884920")
    disc_type = report_in.discrepancy_type or report_in.type or "Damaged Goods"
    exp_qty = report_in.expected_units if report_in.expected_units is not None else (report_in.expected_quantity or 1)
    obs_qty = report_in.observed_physical_units if report_in.observed_physical_units is not None else (report_in.observed_quantity or 0)
    notes_text = (
        report_in.inspection_evidence_notes or
        report_in.notes or
        report_in.resolution_notes or
        "Physical damage / packaging defect identified during verification scanning. Unit quarantined."
    )

    # 1. Lookup shipment to extract linked tracking and details
    shipment = db.query(Shipment).filter(
        (Shipment.id == shipment_ref) | (Shipment.tracking_number == tracking_ref)
    ).first()

    customer_id = None
    customer_name = None
    if shipment:
        tracking_ref = shipment.tracking_number
        customer_id = shipment.customer_id
        customer_name = shipment.customer_name
        # Flag shipment status to 'Discrepancy Detected'
        shipment.status = "Discrepancy Detected"
        ship_event = ShipmentEvent(
            id=f"ev-{uuid.uuid4().hex[:8]}",
            shipment_id=shipment.id,
            status="Discrepancy Detected",
            location="Verification Bay",
            performed_by=report_in.detected_by or "Vendor Verification Desk",
            timestamp=datetime.utcnow()
        )
        db.add(ship_event)

    # 2. Insert DiscrepancyCase
    new_disc = DiscrepancyCase(
        id=disc_id,
        discrepancy_number=disc_number,
        shipment_id=shipment.id if shipment else shipment_ref,
        shipment_tracking=tracking_ref,
        customer_id=customer_id,
        customer_name=customer_name,
        container_id=report_in.container_id or "cnt-alpha-01",
        container_number=report_in.container_number or "CNT-ALPHA-881",
        product_id=report_in.product_id or report_in.sku or "GEN-SAS-001",
        product_name=report_in.product_name or "SASAS (Copy)",
        sku=report_in.sku or "GEN-SAS-001",
        type=disc_type,
        severity=report_in.severity or "Medium",
        status="Detected",
        expected_quantity=exp_qty,
        observed_quantity=obs_qty,
        detection_stage=report_in.detection_stage or "Vendor Receiving",
        detected_by=report_in.detected_by or "Sinu Gunshetty (Vendor)",
        assigned_investigator=report_in.assigned_investigator or "Product Owner (Dhruva)",
        preferred_resolution=report_in.preferred_resolution or "Replacement",
        resolution_notes=f"{notes_text} (Flagged by vendor inspection. Awaiting Owner review.)",
        resolution_outcome="Pending",
        detected_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_disc)

    # 3. Insert DiscrepancyEvidence (from notes and any photos)
    evidence_desc = notes_text
    evidence = DiscrepancyEvidence(
        id=f"evd-{uuid.uuid4().hex[:8]}",
        discrepancy_id=disc_id,
        type="Photo" if report_in.evidence_photos else "Inspection Report",
        url=report_in.evidence_photos[0] if report_in.evidence_photos else "/dharm_logistics_hero.jpg",
        description=evidence_desc,
        timestamp=datetime.utcnow(),
        uploaded_by=report_in.detected_by or "Sinu Gunshetty (Vendor)"
    )
    db.add(evidence)

    # 4. Insert AuditEvent
    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.utcnow(),
        actor_name=report_in.detected_by or "Sinu Gunshetty",
        actor_role="VENDOR",
        action="DISCREPANCY_REPORTED",
        entity_type="Discrepancy",
        entity_id=disc_id,
        details=(
            f"Flagged {report_in.severity or 'Medium'} severity exception: {disc_type} on tracking {tracking_ref}. "
            f"Expected: {exp_qty}, Observed: {obs_qty}. Evidence notes logged."
        )
    )
    db.add(audit)

    # 5. Commit transaction
    db.commit()
    db.refresh(new_disc)

    return DiscrepancyReportResponse(
        success=True,
        message="Shipment exception / damage discrepancy successfully recorded and routed to Product Owner",
        discrepancy=new_disc
    )


@router.post("", response_model=DiscrepancyOut, status_code=status.HTTP_201_CREATED)
def create_discrepancy(disc_in: DiscrepancyCreate, db: Session = Depends(get_db)):
    disc_id = disc_in.id or f"disc-{uuid.uuid4().hex[:8]}"
    disc_number = disc_in.discrepancy_number or f"DIS-2026-{random.randint(100, 999)}"

    new_disc = DiscrepancyCase(
        id=disc_id,
        discrepancy_number=disc_number,
        shipment_id=disc_in.shipment_id,
        shipment_tracking=disc_in.shipment_tracking or disc_in.shipment_id,
        order_id=disc_in.order_id,
        order_number=disc_in.order_number,
        customer_id=disc_in.customer_id,
        customer_name=disc_in.customer_name,
        container_id=disc_in.container_id or "cnt-01",
        container_number=disc_in.container_number or "CNT-ALPHA-881",
        product_id=disc_in.product_id,
        product_name=disc_in.product_name,
        sku=disc_in.sku,
        type=disc_in.type,
        severity=disc_in.severity,
        status=disc_in.status or "Detected",
        expected_quantity=disc_in.expected_quantity,
        observed_quantity=disc_in.observed_quantity,
        detection_stage=disc_in.detection_stage,
        detected_by=disc_in.detected_by,
        assigned_investigator=disc_in.assigned_investigator or "Product Owner (Dhruva)",
        preferred_resolution=disc_in.preferred_resolution,
        resolution_notes=disc_in.resolution_notes,
        resolution_outcome=disc_in.resolution_outcome or "Pending",
        detected_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_disc)

    # Log audit
    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.utcnow(),
        actor_name=disc_in.detected_by or "Staff",
        actor_role="VENDOR",
        action="DISCREPANCY_RECORDED",
        entity_type="Discrepancy",
        entity_id=disc_id,
        details=f"Created discrepancy case {disc_number} ({disc_in.type}) with severity {disc_in.severity}"
    )
    db.add(audit)

    db.commit()
    db.refresh(new_disc)
    return new_disc


@router.put("/{discrepancy_id}", response_model=DiscrepancyOut)
def update_discrepancy(discrepancy_id: str, update_in: DiscrepancyUpdate, db: Session = Depends(get_db)):
    disc = db.query(DiscrepancyCase).filter(DiscrepancyCase.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discrepancy case not found.")

    data = update_in.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(disc, field, val)

    disc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(disc)
    return disc


@router.post("/{discrepancy_id}/evidence", response_model=DiscrepancyEvidenceOut)
def add_evidence(discrepancy_id: str, evidence_in: DiscrepancyEvidenceBase, db: Session = Depends(get_db)):
    disc = db.query(DiscrepancyCase).filter(DiscrepancyCase.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discrepancy case not found.")

    evidence = DiscrepancyEvidence(
        id=f"evid-{uuid.uuid4().hex[:8]}",
        discrepancy_id=discrepancy_id,
        type=evidence_in.type,
        url=evidence_in.url,
        description=evidence_in.description,
        uploaded_by=evidence_in.uploaded_by,
        timestamp=datetime.utcnow()
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence
