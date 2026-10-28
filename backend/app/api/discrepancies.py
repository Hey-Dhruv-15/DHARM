from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.database import get_db
from app.models.discrepancy import DiscrepancyCase, DiscrepancyEvidence
from app.schemas.discrepancy import (
    DiscrepancyCreate, DiscrepancyUpdate, DiscrepancyOut,
    DiscrepancyEvidenceBase, DiscrepancyEvidenceOut
)

router = APIRouter(prefix="/discrepancies", tags=["Discrepancy Engine"])


@router.get("", response_model=List[DiscrepancyOut])
def list_discrepancies(
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    shipment_id: Optional[str] = Query(None, description="Filter by shipment ID"),
    db: Session = Depends(get_db)
):
    query = db.query(DiscrepancyCase)
    if status:
        query = query.filter(DiscrepancyCase.status == status)
    if severity:
        query = query.filter(DiscrepancyCase.severity == severity)
    if shipment_id:
        query = query.filter(DiscrepancyCase.shipment_id == shipment_id)

    return query.order_by(DiscrepancyCase.detected_at.desc()).all()


@router.get("/{discrepancy_id}", response_model=DiscrepancyOut)
def get_discrepancy(discrepancy_id: str, db: Session = Depends(get_db)):
    disc = db.query(DiscrepancyCase).filter(DiscrepancyCase.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discrepancy case not found.")
    return disc


@router.post("", response_model=DiscrepancyOut, status_code=status.HTTP_201_CREATED)
def create_discrepancy(disc_in: DiscrepancyCreate, db: Session = Depends(get_db)):
    disc_id = disc_in.id or f"disc-{uuid.uuid4().hex[:8]}"
    new_disc = DiscrepancyCase(
        id=disc_id,
        discrepancy_number=disc_in.discrepancy_number,
        shipment_id=disc_in.shipment_id,
        shipment_tracking=disc_in.shipment_tracking,
        container_id=disc_in.container_id,
        container_number=disc_in.container_number,
        product_id=disc_in.product_id,
        product_name=disc_in.product_name,
        sku=disc_in.sku,
        type=disc_in.type,
        severity=disc_in.severity,
        status=disc_in.status,
        expected_quantity=disc_in.expected_quantity,
        observed_quantity=disc_in.observed_quantity,
        detection_stage=disc_in.detection_stage,
        detected_by=disc_in.detected_by,
        assigned_investigator=disc_in.assigned_investigator,
        resolution_notes=disc_in.resolution_notes,
        resolution_outcome=disc_in.resolution_outcome or "Pending",
        detected_at=datetime.utcnow()
    )
    db.add(new_disc)
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
