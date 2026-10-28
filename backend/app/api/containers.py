from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.database import get_db
from app.models.container import Container, ContainerItem
from app.models.product import Product
from app.schemas.container import (
    ContainerCreate, ContainerUpdate, ContainerOut,
    ContainerItemCreate, ContainerItemOut
)

router = APIRouter(prefix="/containers", tags=["Tamper-Evident Containers"])


def _to_container_out(container: Container) -> dict:
    return {
        "id": container.id,
        "container_number": container.container_number,
        "type": container.type,
        "max_capacity": container.max_capacity,
        "capacity_unit": container.capacity_unit,
        "capacity_kg": container.capacity_kg,
        "current_weight_kg": container.current_weight_kg,
        "utilized_capacity": container.utilized_capacity,
        "seal_number": container.seal_number,
        "seal_status": container.seal_status,
        "initial_location": container.initial_location,
        "location": container.location,
        "description": container.description,
        "status": container.status,
        "assigned_shipment_id": container.assigned_shipment_id,
        "assigned_shipment_tracking": container.assigned_shipment_tracking,
        "created_by": container.created_by,
        "is_active": container.is_active,
        "created_at": container.created_at,
        "item_count": len(container.items),
        "items": container.items
    }


@router.get("", response_model=List[ContainerOut])
def list_containers(
    status: Optional[str] = Query(None, description="Filter by container status"),
    search: Optional[str] = Query(None, description="Search by number or seal"),
    db: Session = Depends(get_db)
):
    query = db.query(Container)
    if status:
        query = query.filter(Container.status == status)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Container.container_number.ilike(s)) |
            (Container.seal_number.ilike(s))
        )
    containers = query.order_by(Container.created_at.desc()).all()
    return [_to_container_out(c) for c in containers]


@router.get("/{container_id}", response_model=ContainerOut)
def get_container(container_id: str, db: Session = Depends(get_db)):
    c = db.query(Container).filter(Container.id == container_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")
    return _to_container_out(c)


@router.post("", response_model=ContainerOut, status_code=status.HTTP_201_CREATED)
def create_container(container_in: ContainerCreate, db: Session = Depends(get_db)):
    if db.query(Container).filter(Container.container_number == container_in.container_number).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Container number already exists.")

    cid = container_in.id or f"cnt-{uuid.uuid4().hex[:8]}"
    new_c = Container(
        id=cid,
        container_number=container_in.container_number,
        type=container_in.type,
        max_capacity=container_in.max_capacity,
        capacity_unit=container_in.capacity_unit,
        capacity_kg=container_in.capacity_kg,
        current_weight_kg=container_in.current_weight_kg,
        utilized_capacity=container_in.utilized_capacity or 0.0,
        seal_number=container_in.seal_number,
        seal_status=container_in.seal_status or "Active",
        initial_location=container_in.initial_location or "Central Distribution Center, Hub Alpha",
        location=container_in.location or "Central Distribution Center, Hub Alpha",
        description=container_in.description,
        status=container_in.status or "Empty",
        assigned_shipment_id=container_in.assigned_shipment_id,
        assigned_shipment_tracking=container_in.assigned_shipment_tracking,
        created_by=container_in.created_by or "System",
        is_active=container_in.is_active if container_in.is_active is not None else True
    )
    db.add(new_c)
    db.commit()
    db.refresh(new_c)
    return _to_container_out(new_c)


@router.put("/{container_id}", response_model=ContainerOut)
def update_container(container_id: str, update_in: ContainerUpdate, db: Session = Depends(get_db)):
    c = db.query(Container).filter(Container.id == container_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")

    data = update_in.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(c, field, val)

    db.commit()
    db.refresh(c)
    return _to_container_out(c)


@router.post("/{container_id}/items", response_model=ContainerItemOut)
def add_item_to_container(container_id: str, item_in: ContainerItemCreate, db: Session = Depends(get_db)):
    c = db.query(Container).filter(Container.id == container_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")

    item_id = item_in.id or f"item-{uuid.uuid4().hex[:8]}"
    item = ContainerItem(
        id=item_id,
        container_id=container_id,
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
    if c.status == "Empty":
        c.status = "Active"

    db.commit()
    db.refresh(item)
    return item


@router.post("/{container_id}/seal")
def seal_container(container_id: str, seal_number: str = Query(..., description="Security Seal Barcode"), db: Session = Depends(get_db)):
    c = db.query(Container).filter(Container.id == container_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found.")
    c.seal_number = seal_number
    c.seal_status = "Active"
    c.status = "Sealed"
    db.commit()
    return {"message": f"Container {c.container_number} successfully sealed with seal {seal_number}."}
