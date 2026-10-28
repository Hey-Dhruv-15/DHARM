from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.database import get_db
from app.models.return_case import ReturnCase
from app.schemas.return_case import ReturnCaseCreate, ReturnCaseUpdate, ReturnCaseOut

router = APIRouter(prefix="/returns", tags=["Customer Returns & Reverse Logistics"])


@router.get("", response_model=List[ReturnCaseOut])
def list_returns(
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    db: Session = Depends(get_db)
):
    query = db.query(ReturnCase)
    if status:
        query = query.filter(ReturnCase.status == status)
    if customer_id:
        query = query.filter(ReturnCase.customer_id == customer_id)
    return query.order_by(ReturnCase.requested_at.desc()).all()


@router.get("/{return_id}", response_model=ReturnCaseOut)
def get_return(return_id: str, db: Session = Depends(get_db)):
    ret = db.query(ReturnCase).filter(ReturnCase.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return case not found.")
    return ret


@router.post("", response_model=ReturnCaseOut, status_code=status.HTTP_201_CREATED)
def create_return(return_in: ReturnCaseCreate, db: Session = Depends(get_db)):
    rid = return_in.id or f"ret-{uuid.uuid4().hex[:8]}"
    new_return = ReturnCase(
        id=rid,
        return_number=return_in.return_number,
        original_shipment_id=return_in.original_shipment_id,
        tracking_number=return_in.tracking_number,
        customer_id=return_in.customer_id,
        customer_name=return_in.customer_name,
        product_id=return_in.product_id,
        product_name=return_in.product_name,
        quantity=return_in.quantity,
        reason=return_in.reason,
        status=return_in.status or "Requested",
        evidence_photos=return_in.evidence_photos or [],
        inspection_notes=return_in.inspection_notes,
        quarantine_location=return_in.quarantine_location,
        replacement_shipment_id=return_in.replacement_shipment_id,
        requested_at=datetime.utcnow()
    )
    db.add(new_return)
    db.commit()
    db.refresh(new_return)
    return new_return


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
