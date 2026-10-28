from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
import random
from datetime import datetime

from app.database import get_db
from app.models.return_case import ReturnCase
from app.models.discrepancy import DiscrepancyCase, DiscrepancyEvidence
from app.models.audit import AuditEvent
from app.schemas.return_case import (
    ReturnCaseCreate, ReturnCaseUpdate, ReturnCaseOut,
    ReturnClaimCreate, ReturnClaimResponse,
    ReturnVerifyRequest, ReturnResolveRequest
)

router = APIRouter(prefix="/returns", tags=["Customer Returns & Reverse Logistics"])


@router.get("", response_model=List[ReturnCaseOut])
def list_returns(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    customer_id: Optional[str] = Query(default=None, description="Filter by customer ID"),
    choice: Optional[str] = Query(default=None, description="Filter by customer choice (Replace/Refund)"),
    vendor_verified: Optional[bool] = Query(default=None, description="Filter by vendor verification status"),
    db: Session = Depends(get_db)
):
    """
    Returns list of all return & damage claims.
    Used by Owner 'Returns and Replacements' and Vendor 'Exceptions and Damage' (Customer Damaged Reports).
    """
    query = db.query(ReturnCase)
    if isinstance(status, str) and status != "ALL":
        query = query.filter(ReturnCase.status == status)
    if isinstance(customer_id, str):
        query = query.filter(ReturnCase.customer_id == customer_id)
    if isinstance(choice, str) and choice != "ALL":
        query = query.filter(ReturnCase.customer_choice.ilike(f"%{choice}%"))
    if isinstance(vendor_verified, bool):
        query = query.filter(ReturnCase.vendor_verified == vendor_verified)

    return query.order_by(ReturnCase.requested_at.desc()).all()


@router.get("/{return_id}", response_model=ReturnCaseOut)
def get_return(return_id: str, db: Session = Depends(get_db)):
    ret = db.query(ReturnCase).filter(ReturnCase.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return case not found.")
    return ret


@router.post("/claim", response_model=ReturnClaimResponse, status_code=status.HTTP_201_CREATED)
def submit_return_claim(claim_in: ReturnClaimCreate, db: Session = Depends(get_db)):
    """
    Primary API for 'Report Delivery Issue or Damaged Goods' screen.
    Simultaneously stores record in:
    1. 'Returns and Replacements' for Owner login (ReturnCase)
    2. 'Exception and Damage' for Vendor login:
       - Tab 1: Dock / Delivery Discrepancies (DiscrepancyCase)
       - Tab 2: Customer Damaged & Quarantine Bay (ReturnCase)
    """
    # 1. IDs and reference numbers
    rand_suffix = random.randint(100, 999)
    ret_id = f"ret-{uuid.uuid4().hex[:8]}"
    ret_number = f"RET-2026-{rand_suffix}"
    disc_id = f"dsc-{uuid.uuid4().hex[:8]}"
    disc_number = f"DSC-2026-{rand_suffix}"

    shipment_id = claim_in.shipment_id or f"shp-{uuid.uuid4().hex[:6]}"
    tracking_num = claim_in.tracking_number or "TRK-DHM-884920"
    prod_id = claim_in.product_id or claim_in.sku or "GEN-SAS-001"
    prod_name = claim_in.product_name or "SASAS (Copy)"
    sku = claim_in.sku or "GEN-SAS-001"
    cust_id = claim_in.customer_id or "usr-cust-03"
    cust_name = claim_in.customer_name or "Anusha S (BioMed Advanced Research Diagnostics)"

    notes_text = claim_in.notes or claim_in.description or "Reported via customer damage claim portal"
    quarantine_loc = "Vendor Hub Quarantine Bay Q-4B"

    # 2. Create ReturnCase (Surfaced in Owner Returns & Replacements + Vendor Customer Damaged)
    new_return = ReturnCase(
        id=ret_id,
        return_number=ret_number,
        original_shipment_id=shipment_id,
        tracking_number=tracking_num,
        order_id=claim_in.order_id,
        order_number=claim_in.order_number,
        customer_id=cust_id,
        customer_name=cust_name,
        product_id=prod_id,
        product_name=prod_name,
        sku=sku,
        quantity=claim_in.quantity,
        reason=claim_in.reason,
        status="Received at Hub",
        evidence_photos=claim_in.evidence_photos or ["/dharm_logistics_hero.jpg"],
        inspection_notes=notes_text,
        quarantine_location=quarantine_loc,
        customer_choice=claim_in.customer_choice,
        vendor_verified=False,
        problem_diagnosis=f"Reported issue: {claim_in.reason}. Awaiting vendor QA inspection.",
        refund_amount=claim_in.refund_amount if claim_in.customer_choice == "Refund Amount" else None,
        refund_status="Pending" if claim_in.customer_choice == "Refund Amount" else None,
        requested_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_return)

    # 3. Create DiscrepancyCase (Surfaced in Vendor Exceptions and Damage -> Dock Discrepancies)
    disc_type = "Damaged Goods"
    if "Incorrect" in claim_in.reason:
        disc_type = "Missing Item"
    elif "Defective" in claim_in.reason:
        disc_type = "Damaged Goods"
    elif "Transit" in claim_in.reason:
        disc_type = "Damaged Goods"

    new_disc = DiscrepancyCase(
        id=disc_id,
        discrepancy_number=disc_number,
        shipment_id=shipment_id,
        shipment_tracking=tracking_num,
        order_id=claim_in.order_id,
        order_number=claim_in.order_number,
        customer_id=cust_id,
        customer_name=cust_name,
        product_id=prod_id,
        product_name=prod_name,
        sku=sku,
        type=disc_type,
        severity="Critical",
        status="Detected",
        expected_quantity=claim_in.quantity,
        observed_quantity=0,
        detection_stage="Customer Handover / Quarantine Bay",
        detected_by=cust_name,
        assigned_investigator="Vendor QA Desk (Sinu Gunshetty)",
        preferred_resolution=claim_in.customer_choice,
        resolution_notes=f"{claim_in.reason}: {notes_text}",
        resolution_outcome="Pending",
        detected_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_disc)

    # 4. Create DiscrepancyEvidence
    if claim_in.evidence_photos:
        for photo_url in claim_in.evidence_photos:
            evidence = DiscrepancyEvidence(
                id=f"evid-{uuid.uuid4().hex[:8]}",
                discrepancy_id=disc_id,
                type="Photo",
                url=photo_url,
                description=f"Evidence for customer return claim {ret_number}",
                timestamp=datetime.utcnow(),
                uploaded_by=cust_name
            )
            db.add(evidence)

    # 5. Log immutable audit trail
    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.utcnow(),
        actor_name=cust_name,
        actor_role="CUSTOMER",
        action="RETURN_CLAIM_SUBMITTED",
        entity_type="ReturnCase",
        entity_id=ret_id,
        details=(
            f"Customer filed damage claim {ret_number} for {prod_name} (Qty: {claim_in.quantity}) "
            f"under shipment {tracking_num}. Preferred Settlement: {claim_in.customer_choice}. "
            f"Quarantined in {quarantine_loc}."
        )
    )
    db.add(audit)

    # 6. Commit transaction
    db.commit()
    db.refresh(new_return)
    db.refresh(new_disc)

    return ReturnClaimResponse(
        success=True,
        message="Claim submitted successfully. Recorded in Owner Returns and Vendor Exception & Damage modules.",
        return_case=new_return,
        discrepancy_case=new_disc
    )


@router.post("", response_model=ReturnCaseOut, status_code=status.HTTP_201_CREATED)
def create_return(return_in: ReturnCaseCreate, db: Session = Depends(get_db)):
    rid = return_in.id or f"ret-{uuid.uuid4().hex[:8]}"
    new_return = ReturnCase(
        id=rid,
        return_number=return_in.return_number,
        original_shipment_id=return_in.original_shipment_id,
        tracking_number=return_in.tracking_number,
        order_id=return_in.order_id,
        order_number=return_in.order_number,
        customer_id=return_in.customer_id,
        customer_name=return_in.customer_name,
        product_id=return_in.product_id,
        product_name=return_in.product_name,
        sku=return_in.sku,
        quantity=return_in.quantity,
        reason=return_in.reason,
        status=return_in.status or "Requested",
        evidence_photos=return_in.evidence_photos or [],
        inspection_notes=return_in.inspection_notes,
        quarantine_location=return_in.quarantine_location or "Vendor Hub Quarantine Bay Q-4B",
        customer_choice=return_in.customer_choice or "Replace Product",
        vendor_verified=return_in.vendor_verified or False,
        vendor_verified_by=return_in.vendor_verified_by,
        vendor_verified_at=return_in.vendor_verified_at,
        problem_diagnosis=return_in.problem_diagnosis,
        refund_amount=return_in.refund_amount,
        refund_status=return_in.refund_status,
        replacement_shipment_id=return_in.replacement_shipment_id,
        requested_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_return)
    db.commit()
    db.refresh(new_return)
    return new_return


@router.post("/{return_id}/verify", response_model=ReturnCaseOut)
def verify_return_inspection(return_id: str, verify_in: ReturnVerifyRequest, db: Session = Depends(get_db)):
    """
    Vendor verification action in 'Exception and Damage' (CustomerDamagedReports).
    Flags the claim as physically inspected and verified at quarantine bay.
    """
    ret = db.query(ReturnCase).filter(ReturnCase.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return case not found.")

    ret.vendor_verified = True
    ret.vendor_verified_by = verify_in.verified_by
    ret.vendor_verified_at = datetime.utcnow()
    ret.problem_diagnosis = verify_in.diagnosis
    if verify_in.notes:
        ret.inspection_notes = verify_in.notes
    ret.quarantine_location = verify_in.quarantine_location
    ret.status = "Inspected"
    ret.updated_at = datetime.utcnow()

    # Also update any linked discrepancy case
    disc = db.query(DiscrepancyCase).filter(
        (DiscrepancyCase.shipment_tracking == ret.tracking_number) |
        (DiscrepancyCase.order_number == ret.order_number)
    ).first()
    if disc:
        disc.status = "Under Investigation"
        disc.resolution_notes = f"Vendor verified in bay: {verify_in.diagnosis}"
        disc.updated_at = datetime.utcnow()

    # Audit event
    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.utcnow(),
        actor_name=verify_in.verified_by or "Vendor QA",
        actor_role="VENDOR",
        action="RETURN_VERIFIED",
        entity_type="ReturnCase",
        entity_id=ret.id,
        details=f"Vendor inspected and confirmed defect: {verify_in.diagnosis}. Holding at {verify_in.quarantine_location}."
    )
    db.add(audit)

    db.commit()
    db.refresh(ret)
    return ret


@router.post("/{return_id}/resolve", response_model=ReturnCaseOut)
def resolve_return_case(return_id: str, resolve_in: ReturnResolveRequest, db: Session = Depends(get_db)):
    """
    Vendor resolution action in 'Exception and Damage':
    Dispatches replacement shipment or processes electronic refund.
    """
    ret = db.query(ReturnCase).filter(ReturnCase.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return case not found.")

    ret.updated_at = datetime.utcnow()

    if resolve_in.resolution == "Replace Product":
        tracking = resolve_in.replacement_shipment_tracking or f"TRK-REP-2026-{random.randint(100, 999)}"
        ret.status = "Replacement Dispatched"
        ret.replacement_shipment_id = tracking
    else:
        ret.status = "Refund Processed"
        ret.refund_status = "Processed"
        if resolve_in.refund_amount:
            ret.refund_amount = resolve_in.refund_amount

    # Update discrepancy
    disc = db.query(DiscrepancyCase).filter(
        (DiscrepancyCase.shipment_tracking == ret.tracking_number) |
        (DiscrepancyCase.order_number == ret.order_number)
    ).first()
    if disc:
        disc.status = "Resolved"
        disc.resolution_outcome = resolve_in.resolution
        disc.resolution_notes = f"Resolution executed: {resolve_in.resolution}"
        disc.updated_at = datetime.utcnow()

    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.utcnow(),
        actor_name=resolve_in.resolved_by or "Vendor Lead",
        actor_role="VENDOR",
        action="RETURN_RESOLVED",
        entity_type="ReturnCase",
        entity_id=ret.id,
        details=f"Vendor executed settlement '{resolve_in.resolution}' for return case {ret.return_number}."
    )
    db.add(audit)

    db.commit()
    db.refresh(ret)
    return ret


@router.put("/{return_id}", response_model=ReturnCaseOut)
def update_return(return_id: str, update_in: ReturnCaseUpdate, db: Session = Depends(get_db)):
    ret = db.query(ReturnCase).filter(ReturnCase.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return case not found.")

    data = update_in.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(ret, field, val)

    ret.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ret)
    return ret
