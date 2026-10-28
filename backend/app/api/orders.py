from datetime import datetime, timedelta
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.audit import AuditEvent
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, OrderCancelRequest
from app.core.security import get_current_user_optional

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Create a new Purchase Order directly in the ERP.
    Calculates line items, subtotal, GST rates, tracking, and logs custody audit.
    """
    if not order_in.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one deliverable item."
        )

    # Determine customer info from authenticated session or payload fallback
    customer_id = (current_user.id if current_user else order_in.customer_id) or "usr-cust-03"
    customer_name = (current_user.name if current_user else order_in.customer_name) or "Anusha S (BioMed)"
    customer_account = order_in.customer_account or (current_user.organization if current_user else "BioMed Advanced Research Diagnostics Pvt Ltd")

    order_id = f"ord-{int(datetime.utcnow().timestamp() * 1000)}"
    order_number = f"ORD-DHM-2026-{random.randint(1000, 9999)}"
    tracking_number = f"TRK-DHM-{random.randint(100000, 999999)}"
    invoice_number = f"INV-DHM-2026-{random.randint(1000, 9999)}"
    expected_delivery = datetime.utcnow() + timedelta(days=4)

    # Compute financial calculations
    subtotal = 0.0
    tax_total = 0.0
    order_items: List[OrderItem] = []

    for idx, item in enumerate(order_in.items):
        item_subtotal = round(item.unit_price * item.quantity, 2)
        item_tax = round(item_subtotal * (item.gst_rate or 0.18), 2)
        item_total = item_subtotal + item_tax

        subtotal += item_subtotal
        tax_total += item_tax

        order_item = OrderItem(
            id=f"{order_id}-item-{idx + 1}",
            order_id=order_id,
            product_id=item.product_id,
            product_name=item.product_name,
            sku=item.sku,
            image=item.image,
            quantity=item.quantity,
            unit_price=item.unit_price,
            gst_rate=item.gst_rate,
            total_price=item_total
        )
        order_items.append(order_item)

    grand_total = round(subtotal + tax_total, 2)

    new_order = Order(
        id=order_id,
        order_number=order_number,
        customer_id=customer_id,
        customer_name=customer_name,
        customer_account=customer_account,
        customer_po_reference=order_in.customer_po_reference.strip(),
        delivery_location=order_in.delivery_location,
        logistics_carrier=order_in.logistics_carrier or "Bluedart Express",
        payment_terms=order_in.payment_terms or "Corporate Net Banking",
        order_remarks=order_in.order_remarks,
        order_date=datetime.utcnow(),
        status="Processing",
        expected_delivery_date=expected_delivery,
        payment_status="Paid",
        subtotal=subtotal,
        tax_total=tax_total,
        grand_total=grand_total,
        shipping_address=order_in.shipping_address,
        billing_address=order_in.billing_address,
        tracking_number=tracking_number,
        invoice_number=invoice_number,
        invoice_available=True,
        can_cancel=True,
        created_at=datetime.utcnow(),
        items=order_items
    )

    db.add(new_order)

    # Record custody audit trail
    audit_entry = AuditEvent(
        id=f"aud-{int(datetime.utcnow().timestamp() * 1000)}",
        timestamp=datetime.utcnow(),
        actor_name=customer_name,
        actor_role="CUSTOMER",
        action="ORDER_CREATED",
        entity_type="Order",
        entity_id=order_id,
        details=f"Customer placed purchase order {order_number} (Ref: {order_in.customer_po_reference}) for {len(order_items)} items. Total: ₹{grand_total:,.2f}"
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(new_order)
    return new_order


@router.get("", response_model=List[OrderOut])
@router.get("/", response_model=List[OrderOut])
def list_orders(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    List purchase orders with role-based filtering and status search.
    """
    query = db.query(Order)

    # Strict isolation for customer users
    if current_user and getattr(current_user, "role", None) == "CUSTOMER":
        query = query.filter(Order.customer_id == current_user.id)
    elif customer_id:
        query = query.filter(Order.customer_id == customer_id)

    if status and status.upper() != "ALL":
        query = query.filter(Order.status.ilike(status))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Order.order_number.ilike(s)) |
            (Order.customer_po_reference.ilike(s)) |
            (Order.customer_name.ilike(s)) |
            (Order.tracking_number.ilike(s))
        )

    orders = query.order_date.desc() if hasattr(query, "order_date") else query.order_by(Order.order_date.desc()).all()
    return orders


@router.get("/{id}", response_model=OrderOut)
def get_order(id: str, db: Session = Depends(get_db)):
    """
    Retrieve single order by ID or Order Number.
    """
    order = db.query(Order).filter((Order.id == id) | (Order.order_number == id)).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{id}' not found."
        )
    return order


@router.put("/{id}/status", response_model=OrderOut)
def update_order_status(
    id: str,
    status_update: OrderStatusUpdate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Update the fulfillment lifecycle status of a purchase order.
    """
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{id}' not found."
        )

    old_status = order.status
    order.status = status_update.status
    order.updated_at = datetime.utcnow()

    actor_name = current_user.name if current_user else "ERP System"
    actor_role = getattr(current_user, "role", "SYSTEM") if current_user else "SYSTEM"

    audit_entry = AuditEvent(
        id=f"aud-{int(datetime.utcnow().timestamp() * 1000)}",
        timestamp=datetime.utcnow(),
        actor_name=actor_name,
        actor_role=actor_role if isinstance(actor_role, str) else getattr(actor_role, "value", str(actor_role)),
        action="ORDER_STATUS_UPDATED",
        entity_type="Order",
        entity_id=order.id,
        details=f"Order {order.order_number} status changed from '{old_status}' to '{status_update.status}'. Notes: {status_update.notes or 'None'}"
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(order)
    return order


@router.post("/{id}/cancel", response_model=OrderOut)
def cancel_order(
    id: str,
    cancel_in: OrderCancelRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Cancel a customer purchase order if fulfillment has not progressed past Dispatched.
    """
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{id}' not found."
        )

    if order.status in ["Dispatched", "Delivered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order '{order.order_number}' has already been {order.status.lower()} and cannot be cancelled directly."
        )

    order.status = "Cancelled"
    order.can_cancel = False
    order.cancellation_reason = cancel_in.reason
    order.cancelled_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()

    actor_name = current_user.name if current_user else order.customer_name
    audit_entry = AuditEvent(
        id=f"aud-{int(datetime.utcnow().timestamp() * 1000)}",
        timestamp=datetime.utcnow(),
        actor_name=actor_name,
        actor_role="CUSTOMER",
        action="ORDER_CANCELLED",
        entity_type="Order",
        entity_id=order.id,
        details=f"Order {order.order_number} cancelled. Reason: {cancel_in.reason}"
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(order)
    return order
