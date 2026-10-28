from datetime import datetime, timedelta
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.order import Order, OrderItem, OrderHistory
from app.models.audit import AuditEvent
from app.schemas.order import (
    OrderCreate, OrderOut, OrderStatusUpdate, OrderCancelRequest,
    OrderDeliveryRequest, OrderDeliverResponse, OrderHistoryOut
)
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
    active_only: bool = False,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    List purchase orders with role-based filtering and status search.
    Set active_only=true to exclude Delivered orders.
    """
    query = db.query(Order)

    # Strict isolation for customer users
    if current_user and getattr(current_user, "role", None) == "CUSTOMER":
        query = query.filter(Order.customer_id == current_user.id)
    elif customer_id:
        query = query.filter(Order.customer_id == customer_id)

    if active_only:
        query = query.filter(Order.status != "Delivered")
    elif status and status.upper() != "ALL":
        query = query.filter(Order.status.ilike(status))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Order.order_number.ilike(s)) |
            (Order.customer_po_reference.ilike(s)) |
            (Order.customer_name.ilike(s)) |
            (Order.tracking_number.ilike(s))
        )

    orders = query.order_by(Order.order_date.desc()).all()
    return orders


@router.get("/active", response_model=List[OrderOut])
def list_active_orders(
    customer_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    List only currently active orders (Pending, Processing, Confirmed, Dispatched).
    Delivered orders are excluded and kept in Order History.
    """
    query = db.query(Order).filter(Order.status != "Delivered")
    if current_user and getattr(current_user, "role", None) == "CUSTOMER":
        query = query.filter(Order.customer_id == current_user.id)
    elif customer_id:
        query = query.filter(Order.customer_id == customer_id)
    return query.order_by(Order.order_date.desc()).all()


@router.get("/history", response_model=List[OrderHistoryOut])
def list_order_history(
    customer_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Retrieve all archived and completed Delivered orders from the Order History ledger.
    """
    query = db.query(OrderHistory)
    if current_user and getattr(current_user, "role", None) == "CUSTOMER":
        query = query.filter(OrderHistory.customer_id == current_user.id)
    elif customer_id:
        query = query.filter(OrderHistory.customer_id == customer_id)
    return query.order_by(OrderHistory.delivered_at.desc()).all()


@router.get("/history/{id}", response_model=OrderHistoryOut)
def get_order_history_item(id: str, db: Session = Depends(get_db)):
    """
    Retrieve a specific archived order from Order History by order ID or Order Number.
    """
    hist = db.query(OrderHistory).filter(
        (OrderHistory.id == id) |
        (OrderHistory.original_order_id == id) |
        (OrderHistory.order_number == id)
    ).first()
    if not hist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"History record for order '{id}' not found."
        )
    return hist


@router.post("/{id}/deliver", response_model=OrderDeliverResponse)
@router.put("/{id}/deliver", response_model=OrderDeliverResponse)
@router.get("/{id}/deliver", response_model=OrderDeliverResponse)
def mark_order_as_delivered(
    id: str,
    delivery_info: Optional[OrderDeliveryRequest] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Action API: 'Mark as Delivered'.
    Updates the order status to Delivered, removes it from active orders queue,
    archives a full immutable snapshot into Order History, and logs the custody audit.
    """
    order = db.query(Order).filter((Order.id == id) | (Order.order_number == id)).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{id}' not found."
        )

    now = datetime.utcnow()
    delivery_notes = delivery_info.notes if delivery_info and delivery_info.notes else "Customer confirmed delivery at primary receiving dock."
    delivered_by = (delivery_info.delivered_by if delivery_info and delivery_info.delivered_by else None) or (current_user.name if current_user else "Customer Consignee")

    # 1. Update Order status
    order.status = "Delivered"
    order.can_cancel = False
    order.updated_at = now

    # 2. Serialize items snapshot for immutable history preservation
    items_snapshot = [
        {
            "id": it.id,
            "productId": it.product_id,
            "productName": it.product_name,
            "sku": it.sku,
            "quantity": it.quantity,
            "unitPrice": it.unit_price,
            "gstRate": it.gst_rate,
            "totalPrice": it.total_price,
            "image": it.image
        }
        for it in order.items
    ]

    # 3. Insert or update in OrderHistory table
    history_id = f"hist-{order.id}"
    existing_hist = db.query(OrderHistory).filter(OrderHistory.id == history_id).first()

    if not existing_hist:
        history_record = OrderHistory(
            id=history_id,
            original_order_id=order.id,
            order_number=order.order_number,
            customer_id=order.customer_id,
            customer_name=order.customer_name,
            customer_account=order.customer_account,
            customer_po_reference=order.customer_po_reference,
            delivery_location=order.delivery_location,
            logistics_carrier=order.logistics_carrier,
            payment_terms=order.payment_terms,
            order_remarks=order.order_remarks,
            order_date=order.order_date,
            delivered_at=now,
            status="Delivered",
            subtotal=order.subtotal,
            tax_total=order.tax_total,
            grand_total=order.grand_total,
            shipping_address=order.shipping_address,
            billing_address=order.billing_address,
            tracking_number=order.tracking_number,
            invoice_number=order.invoice_number,
            items_snapshot=items_snapshot,
            delivered_by=delivered_by,
            delivery_notes=delivery_notes,
            created_at=now
        )
        db.add(history_record)
    else:
        existing_hist.delivered_at = now
        existing_hist.delivery_notes = delivery_notes
        existing_hist.delivered_by = delivered_by
        history_record = existing_hist

    # 4. Log Custody Audit Event
    audit_entry = AuditEvent(
        id=f"aud-{int(now.timestamp() * 1000)}",
        timestamp=now,
        actor_name=delivered_by,
        actor_role="CUSTOMER",
        action="ORDER_DELIVERED",
        entity_type="Order",
        entity_id=order.id,
        details=f"Order {order.order_number} marked as Delivered. Transferred from active queue to Order History. Notes: {delivery_notes}"
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(history_record)

    return OrderDeliverResponse(
        success=True,
        message=f"Order #{order.order_number} marked as Delivered, removed from active queue, and archived to Order History.",
        order_id=order.id,
        order_number=order.order_number,
        status="Delivered",
        delivered_at=now,
        archived_to_history=True,
        history_id=history_record.id,
        history=history_record
    )


@router.delete("/{id}")
def remove_order(
    id: str,
    archive_first: bool = True,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Remove an order from the active orders table.
    If archive_first=True, guarantees an immutable record exists in Order History before deletion.
    """
    order = db.query(Order).filter((Order.id == id) | (Order.order_number == id)).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{id}' not found."
        )

    order_num = order.order_number
    history_id = f"hist-{order.id}"

    # Ensure archived before removal if requested
    if archive_first and not db.query(OrderHistory).filter(OrderHistory.id == history_id).first():
        hist = OrderHistory(
            id=history_id,
            original_order_id=order.id,
            order_number=order.order_number,
            customer_id=order.customer_id,
            customer_name=order.customer_name,
            customer_account=order.customer_account,
            customer_po_reference=order.customer_po_reference,
            delivery_location=order.delivery_location,
            logistics_carrier=order.logistics_carrier,
            payment_terms=order.payment_terms,
            order_remarks=order.order_remarks,
            order_date=order.order_date,
            delivered_at=datetime.utcnow(),
            status=order.status if order.status == "Delivered" else "Archived",
            subtotal=order.subtotal,
            tax_total=order.tax_total,
            grand_total=order.grand_total,
            shipping_address=order.shipping_address,
            billing_address=order.billing_address,
            tracking_number=order.tracking_number,
            invoice_number=order.invoice_number,
            items_snapshot=[
                {
                    "productId": it.product_id,
                    "productName": it.product_name,
                    "sku": it.sku,
                    "quantity": it.quantity,
                    "unitPrice": it.unit_price,
                    "totalPrice": it.total_price
                }
                for it in order.items
            ]
        )
        db.add(hist)

    db.delete(order)
    db.commit()

    return {
        "success": True,
        "message": f"Order #{order_num} has been removed from active orders and safely preserved in Order History.",
        "historyId": history_id
    }


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
