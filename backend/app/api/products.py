from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut

router = APIRouter(prefix="/products", tags=["Products & SKU Master"])


@router.get("", response_model=List[ProductOut])
def list_products(
    search: Optional[str] = Query(None, description="Search by name, SKU or barcode"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_filter)) |
            (Product.sku.ilike(search_filter)) |
            (Product.barcode.ilike(search_filter))
        )
    if category:
        query = query.filter(Product.category == category)
    if status:
        query = query.filter(Product.status == status)

    return query.order_by(Product.name.asc()).all()


@router.get("/barcode/{barcode}", response_model=ProductOut)
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.barcode == barcode.strip()).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with barcode '{barcode}' not found."
        )
    return product


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id '{product_id}' not found."
        )
    return product


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    # Check if SKU or Barcode exists
    if db.query(Product).filter(Product.sku == product_in.sku).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product with this SKU already exists.")
    if db.query(Product).filter(Product.barcode == product_in.barcode).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product with this Barcode already exists.")

    product_id = product_in.id or f"prod-{uuid.uuid4().hex[:8]}"
    
    # Calculate gross price if unit_price and gst_rate provided
    gross = product_in.gross_price
    if gross is None or gross == 0.0:
        rate = product_in.gst_rate or 0.0
        gross = product_in.unit_price * (1 + (rate / 100.0))

    new_prod = Product(
        id=product_id,
        sku=product_in.sku,
        name=product_in.name,
        category=product_in.category,
        barcode=product_in.barcode,
        is_serialized=product_in.is_serialized,
        unit=product_in.unit,
        billing_unit=product_in.billing_unit,
        stock_quantity=product_in.stock_quantity,
        reorder_level=product_in.reorder_level,
        unit_price=product_in.unit_price,
        gst_rate=product_in.gst_rate or 0.0,
        gross_price=round(gross, 2),
        currency=product_in.currency or "INR",
        status=product_in.status or "Active",
        description=product_in.description,
        deliverables=product_in.deliverables
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return new_prod


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: str, product_update: ProductUpdate, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    update_data = product_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prod, field, val)

    # Recalculate gross price if needed
    if "unit_price" in update_data or "gst_rate" in update_data:
        rate = prod.gst_rate or 0.0
        prod.gross_price = round(prod.unit_price * (1 + (rate / 100.0)), 2)

    db.commit()
    db.refresh(prod)
    return prod


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    db.delete(prod)
    db.commit()
    return None
