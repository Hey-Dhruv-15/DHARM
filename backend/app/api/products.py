from typing import Optional
import io
import math
import random
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import or_, desc, asc
from sqlalchemy.orm import Session
try:
    import barcode
    try:
        from barcode.writer import ImageWriter
    except Exception:
        ImageWriter = None
except Exception:
    barcode = None
    ImageWriter = None

try:
    import qrcode
except Exception:
    qrcode = None

FALLBACK_1X1_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

from app.database import get_db
from app.models.product import Product
from app.models.shipment import ShipmentItem
from app.models.container import ContainerItem
from app.schemas.product import (
    ProductCreate,
    ProductPut,
    ProductPatch,
    ProductStatusUpdate,
    ProductOut,
    ProductListResponse,
    PaginationMeta,
    ProductLookupResponse,
    BarcodeGenerateRequest,
    BarcodeGenerateResponse,
    QrCodeGenerateRequest,
    QrCodeGenerateResponse,
    ProductScanRequest,
    ProductScanResponse,
    ProductLabelResponse,
    ProductMetaOptionsResponse,
    CurrencyOption,
)

router = APIRouter(prefix="/products", tags=["Products & SKU Master"])


# ---------------------------------------------------------
# Helper Utilities
# ---------------------------------------------------------

def product_to_out(product: Product) -> ProductOut:
    """Format SQLAlchemy Product into standardized ProductOut schema."""
    rate = product.gst_rate if product.gst_rate is not None else 18.0
    calc_gross = round((product.unit_price or 0.0) * (1 + (rate / 100.0)), 2)
    gross = product.gross_price if product.gross_price is not None and product.gross_price > 0 else calc_gross

    return ProductOut(
        id=product.id,
        sku=product.sku,
        name=product.name,
        category=product.category or "General / Uncategorized",
        barcode=product.barcode or "",
        barcodeFormat=product.barcode_format or "CODE128",
        isSerialized=bool(product.is_serialized),
        unit=product.unit or "Unit",
        billingUnit=product.billing_unit or "One-time",
        stockQuantity=product.stock_quantity or 0,
        reorderLevel=product.reorder_level or 0,
        unitPrice=product.unit_price or 0.0,
        gstRate=rate,
        grossPrice=gross,
        currency=product.currency or "INR",
        status=product.status or "Active",
        description=product.description,
        deliverables=product.deliverables,
        barcodeUrl=f"/api/products/{product.id}/barcode",
        qrCodeUrl=f"/api/products/{product.id}/qr-code",
        createdAt=product.created_at,
        updatedAt=product.updated_at or product.created_at,
    )


def generate_next_product_id(db: Session) -> str:
    """Generate incremental numeric product ID e.g. 1001, 1002 or fallback."""
    all_ids = [p[0] for p in db.query(Product.id).all()]
    numeric_ids = []
    for pid in all_ids:
        try:
            numeric_ids.append(int(pid))
        except (ValueError, TypeError):
            pass
    if numeric_ids:
        return str(max(numeric_ids) + 1)
    if not all_ids:
        return "1001"
    return str(1001 + db.query(Product).count())


def generate_unique_barcode(db: Session, product_id: str, sku: str) -> str:
    """Generate unique industrial CODE128 barcode."""
    clean_digits = "".join(c for c in product_id if c.isdigit())
    if clean_digits:
        candidate = f"PRD{clean_digits.zfill(10)}"
    else:
        clean_sku = "".join(c for c in sku if c.isalnum()).upper()[:6]
        candidate = f"PRD{clean_sku}{uuid.uuid4().hex[:6].upper()}"

    while db.query(Product).filter(Product.barcode == candidate).first():
        candidate = f"PRD{random.randint(1000000000, 9999999999)}"
    return candidate


def render_barcode_png(code_value: str, code_format: str = "code128") -> bytes:
    """Render PNG barcode image using python-barcode."""
    try:
        fmt = (code_format or "code128").lower().replace("-", "")
        if fmt not in barcode.PROVIDED_BARCODES:
            fmt = "code128"
        bc_class = barcode.get_barcode_class(fmt)
        bc = bc_class(code_value, writer=ImageWriter())
        buf = io.BytesIO()
        bc.write(buf, options={"write_text": True, "text_distance": 3.0, "font_size": 10})
        return buf.getvalue()
    except Exception:
        bc_class = barcode.get_barcode_class("code128")
        bc = bc_class(str(code_value), writer=ImageWriter())
        buf = io.BytesIO()
        bc.write(buf)
        return buf.getvalue()


def render_qr_png(content: str) -> bytes:
    """Render PNG QR code image using qrcode."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(content)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------
# 1. POST /api/products — Create Product
# ---------------------------------------------------------
@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db)):
    """Create a product with its identification, classification, pricing, GST, and deliverables."""
    # Check SKU uniqueness
    if db.query(Product).filter(Product.sku == product_in.sku).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product_in.sku}' already exists."
        )

    # Determine or generate Product ID
    product_id = product_in.id or generate_next_product_id(db)

    # Determine or generate unique barcode
    if product_in.barcode and product_in.barcode.strip():
        barcode_val = product_in.barcode.strip()
        if db.query(Product).filter(Product.barcode == barcode_val).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with Barcode '{barcode_val}' already exists."
            )
    else:
        barcode_val = generate_unique_barcode(db, product_id, product_in.sku)

    # Calculate gross price from list price and GST rate
    rate = product_in.gst_rate if product_in.gst_rate is not None else 18.0
    calc_gross = round(product_in.unit_price * (1 + (rate / 100.0)), 2)

    now = datetime.utcnow()
    new_product = Product(
        id=product_id,
        sku=product_in.sku,
        name=product_in.name,
        category=product_in.category or "General / Uncategorized",
        barcode=barcode_val,
        barcode_format=product_in.barcode_format or "CODE128",
        qr_code_url=f"/api/products/{product_id}/qr-code",
        is_serialized=product_in.is_serialized,
        unit=product_in.unit or "Unit",
        billing_unit=product_in.billing_unit or "One-time",
        stock_quantity=product_in.stock_quantity or 0,
        reorder_level=product_in.reorder_level or 5,
        unit_price=product_in.unit_price,
        gst_rate=rate,
        gross_price=calc_gross,
        currency=product_in.currency or "INR",
        status=product_in.status or "Active",
        description=product_in.description,
        deliverables=product_in.deliverables,
        created_at=now,
        updated_at=now,
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return product_to_out(new_product)


# ---------------------------------------------------------
# 2. GET /api/products — Retrieve All Products
# ---------------------------------------------------------
@router.get("", response_model=ProductListResponse)
def list_products(
    search: Optional[str] = Query(None, description="Search product name, SKU, or barcode"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    billingUnit: Optional[str] = Query(None, description="Filter by billing frequency"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Records per page"),
    sortBy: str = Query("name", description="Field to sort by"),
    sortOrder: str = Query("asc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db),
):
    """Display Products Catalog with search, filtering, sorting, and pagination."""
    query = db.query(Product)

    if search:
        sf = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(sf),
                Product.sku.ilike(sf),
                Product.barcode.ilike(sf),
            )
        )
    if category:
        query = query.filter(Product.category == category)
    if status:
        query = query.filter(Product.status == status)
    if billingUnit:
        query = query.filter(Product.billing_unit == billingUnit)
    if currency:
        query = query.filter(Product.currency == currency)

    total = query.count()
    total_pages = max(1, math.ceil(total / limit))

    # Sorting
    sort_column_map = {
        "name": Product.name,
        "sku": Product.sku,
        "unitPrice": Product.unit_price,
        "grossPrice": Product.gross_price,
        "stockQuantity": Product.stock_quantity,
        "createdAt": Product.created_at,
        "status": Product.status,
    }
    col = sort_column_map.get(sortBy, Product.name)
    order_func = desc if sortOrder.lower() == "desc" else asc
    query = query.order_by(order_func(col))

    offset = (page - 1) * limit
    products = query.offset(offset).limit(limit).all()

    return ProductListResponse(
        items=[product_to_out(p) for p in products],
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            totalPages=total_pages
        )
    )


# ---------------------------------------------------------
# 8. GET /api/products/meta/options — Dropdown Options
# ---------------------------------------------------------
@router.get("/meta/options", response_model=ProductMetaOptionsResponse)
def get_meta_options():
    """Retrieve categories, billing frequencies, units, and dropdown options."""
    return ProductMetaOptionsResponse(
        categories=[
            "Software",
            "Hardware",
            "Services",
            "Subscription",
            "Enterprise Software & SaaS",
            "AI, ML & Data Intelligence",
            "General / Uncategorized"
        ],
        billingUnits=[
            "One-time",
            "Monthly",
            "Quarterly",
            "Annual"
        ],
        units=[
            "Unit",
            "Piece",
            "License",
            "Hour",
            "Service",
            "Box",
            "Kg"
        ],
        currencies=[
            CurrencyOption(code="INR", name="Indian Rupee", symbol="₹"),
            CurrencyOption(code="USD", name="US Dollar", symbol="$")
        ],
        statuses=[
            "Active",
            "Inactive",
            "Archived"
        ],
        barcodeFormats=[
            "CODE128",
            "EAN13"
        ]
    )


# ---------------------------------------------------------
# 13. GET /api/products/lookup/barcode/{barcode} — Lookup by Barcode
# ---------------------------------------------------------
@router.get("/lookup/barcode/{barcode}", response_model=ProductLookupResponse)
def lookup_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Find a product when the barcode value is known."""
    clean_bc = barcode.strip()
    prod = db.query(Product).filter(Product.barcode == clean_bc).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with barcode '{barcode}' not found."
        )
    return ProductLookupResponse(
        id=prod.id,
        sku=prod.sku,
        name=prod.name,
        category=prod.category,
        barcode=prod.barcode,
        unitPrice=prod.unit_price,
        gstRate=prod.gst_rate,
        grossPrice=prod.gross_price,
        currency=prod.currency or "INR",
        status=prod.status
    )


# ---------------------------------------------------------
# 14. POST /api/products/scan — Resolve Barcode or QR Scan
# ---------------------------------------------------------
@router.post("/scan", response_model=ProductScanResponse)
def scan_product(scan_req: ProductScanRequest, db: Session = Depends(get_db)):
    """Resolve a scanned barcode or QR code to the matching product."""
    code = scan_req.code.strip()
    scan_type = scan_req.scan_type.upper()

    prod = None

    # If QR scan might contain a product URL or URI
    if scan_type == "QR":
        if "/products/" in code:
            extracted_id = code.split("/products/")[-1].split("?")[0].split("/")[0].strip()
            prod = db.query(Product).filter(Product.id == extracted_id).first()

    # Match barcode, SKU, or direct ID
    if not prod:
        prod = (
            db.query(Product)
            .filter(
                or_(
                    Product.barcode == code,
                    Product.sku.ilike(code),
                    Product.id == code
                )
            )
            .first()
        )

    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scanned {scan_req.scan_type} code '{code}' could not be resolved to any active product."
        )

    return ProductScanResponse(
        success=True,
        scanType=scan_req.scan_type,
        product=ProductLookupResponse(
            id=prod.id,
            sku=prod.sku,
            name=prod.name,
            category=prod.category,
            barcode=prod.barcode,
            unitPrice=prod.unit_price,
            gstRate=prod.gst_rate,
            grossPrice=prod.gross_price,
            currency=prod.currency or "INR",
            status=prod.status
        )
    )


# ---------------------------------------------------------
# 3. GET /api/products/{product_id} — Retrieve Product by ID
# ---------------------------------------------------------
@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Retrieve all details for a particular product by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )
    return product_to_out(product)


# ---------------------------------------------------------
# 4. PUT /api/products/{product_id} — Update Complete Product
# ---------------------------------------------------------
@router.put("/{product_id}", response_model=ProductOut)
def update_complete_product(
    product_id: str,
    put_in: ProductPut,
    db: Session = Depends(get_db)
):
    """Replace/update the complete product information."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    # Validate SKU uniqueness if changed
    if put_in.sku != prod.sku:
        if db.query(Product).filter(Product.sku == put_in.sku, Product.id != product_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{put_in.sku}' already exists."
            )

    # Validate Barcode uniqueness if changed
    barcode_val = put_in.barcode or prod.barcode
    if barcode_val != prod.barcode:
        if db.query(Product).filter(Product.barcode == barcode_val, Product.id != product_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with Barcode '{barcode_val}' already exists."
            )

    # Recalculate gross price on server
    rate = put_in.gst_rate if put_in.gst_rate is not None else 18.0
    calc_gross = round(put_in.unit_price * (1 + (rate / 100.0)), 2)

    prod.sku = put_in.sku
    prod.name = put_in.name
    prod.category = put_in.category
    prod.barcode = barcode_val
    prod.barcode_format = put_in.barcode_format or prod.barcode_format or "CODE128"
    prod.is_serialized = put_in.is_serialized
    prod.unit = put_in.unit
    prod.billing_unit = put_in.billing_unit
    prod.stock_quantity = put_in.stock_quantity
    prod.reorder_level = put_in.reorder_level
    prod.unit_price = put_in.unit_price
    prod.gst_rate = rate
    prod.gross_price = calc_gross
    prod.currency = put_in.currency or "INR"
    prod.status = put_in.status or "Active"
    prod.description = put_in.description
    prod.deliverables = put_in.deliverables
    prod.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(prod)
    return product_to_out(prod)


# ---------------------------------------------------------
# 5. PATCH /api/products/{product_id} — Update Selected Product Fields
# ---------------------------------------------------------
@router.patch("/{product_id}", response_model=ProductOut)
def patch_product_fields(
    product_id: str,
    patch_in: ProductPatch,
    db: Session = Depends(get_db)
):
    """Update only selected fields changed by the user."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    patch_data = patch_in.model_dump(exclude_unset=True)

    # Validate SKU if updated
    if "sku" in patch_data and patch_data["sku"] != prod.sku:
        if db.query(Product).filter(Product.sku == patch_data["sku"], Product.id != product_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{patch_data['sku']}' already exists."
            )

    # Validate Barcode if updated
    if "barcode" in patch_data and patch_data["barcode"] != prod.barcode:
        if db.query(Product).filter(Product.barcode == patch_data["barcode"], Product.id != product_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with Barcode '{patch_data['barcode']}' already exists."
            )

    for field, val in patch_data.items():
        setattr(prod, field, val)

    # Recalculate gross price if unit_price or gst_rate changed
    if "unit_price" in patch_data or "gst_rate" in patch_data:
        rate = prod.gst_rate if prod.gst_rate is not None else 18.0
        prod.gross_price = round(prod.unit_price * (1 + (rate / 100.0)), 2)

    prod.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prod)
    return product_to_out(prod)


# ---------------------------------------------------------
# 6. DELETE /api/products/{product_id} — Delete Product
# ---------------------------------------------------------
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    """Delete a product, subject to historical transaction business rules."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    # Business Rule: Check if product is referenced in shipments or containers
    has_shipment_items = db.query(ShipmentItem).filter(ShipmentItem.product_id == product_id).first()
    has_container_items = db.query(ContainerItem).filter(ContainerItem.product_id == product_id).first()

    if has_shipment_items or has_container_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Product '{prod.name}' ({prod.sku}) cannot be permanently deleted because it is referenced "
                "in historical shipments or container records. Please deactivate it by setting status to 'Inactive' instead."
            )
        )

    db.delete(prod)
    db.commit()
    return None


# ---------------------------------------------------------
# 7. PATCH /api/products/{product_id}/status — Activate / Deactivate
# ---------------------------------------------------------
@router.patch("/{product_id}/status", response_model=ProductOut)
def update_product_status(
    product_id: str,
    status_update: ProductStatusUpdate,
    db: Session = Depends(get_db)
):
    """Change product availability (Active/Inactive) without deleting the record."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    new_status = status_update.status.strip()
    valid_statuses = ["Active", "Inactive", "Archived"]
    if new_status.title() in valid_statuses:
        new_status = new_status.title()
    elif new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{new_status}'. Allowed statuses are: {', '.join(valid_statuses)}."
        )

    prod.status = new_status
    prod.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prod)
    return product_to_out(prod)


# ---------------------------------------------------------
# 9. POST /api/products/{product_id}/barcode/generate
# ---------------------------------------------------------
@router.post("/{product_id}/barcode/generate", response_model=BarcodeGenerateResponse)
def generate_barcode(
    product_id: str,
    barcode_req: BarcodeGenerateRequest = BarcodeGenerateRequest(),
    db: Session = Depends(get_db)
):
    """Generate or assign an industrial barcode for an existing product."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    fmt = barcode_req.format or "CODE128"
    new_barcode = generate_unique_barcode(db, product_id, prod.sku)
    prod.barcode = new_barcode
    prod.barcode_format = fmt
    prod.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prod)

    return BarcodeGenerateResponse(
        productId=prod.id,
        sku=prod.sku,
        barcode=prod.barcode,
        format=fmt,
        barcodeUrl=f"/api/products/{prod.id}/barcode",
        generatedAt=datetime.utcnow()
    )


# ---------------------------------------------------------
# 10. GET /api/products/{product_id}/barcode — Barcode Image
# ---------------------------------------------------------
@router.get("/{product_id}/barcode")
def get_barcode_image(product_id: str, db: Session = Depends(get_db)):
    """Retrieve the generated product barcode PNG image."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    barcode_val = prod.barcode or generate_unique_barcode(db, product_id, prod.sku)
    img_bytes = render_barcode_png(barcode_val, prod.barcode_format or "CODE128")

    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=barcode-{prod.sku}.png"
        }
    )


# ---------------------------------------------------------
# 11. POST /api/products/{product_id}/qr-code/generate
# ---------------------------------------------------------
@router.post("/{product_id}/qr-code/generate", response_model=QrCodeGenerateResponse)
def generate_qr_code(
    product_id: str,
    qr_req: QrCodeGenerateRequest = QrCodeGenerateRequest(),
    db: Session = Depends(get_db)
):
    """Generate or refresh QR code associated with the product."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    prod.qr_code_url = f"/api/products/{prod.id}/qr-code"
    prod.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prod)

    return QrCodeGenerateResponse(
        productId=prod.id,
        sku=prod.sku,
        qrCodeUrl=prod.qr_code_url,
        contentType="image/png",
        generatedAt=datetime.utcnow()
    )


# ---------------------------------------------------------
# 12. GET /api/products/{product_id}/qr-code — QR Code Image
# ---------------------------------------------------------
@router.get("/{product_id}/qr-code")
def get_qr_code_image(product_id: str, db: Session = Depends(get_db)):
    """Retrieve the product QR code PNG image."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    target_content = f"https://dharm-erp.com/products/{prod.id}"
    img_bytes = render_qr_png(target_content)

    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=qr-{prod.sku}.png"
        }
    )


# ---------------------------------------------------------
# 15. GET /api/products/{product_id}/labels — Product Label Data
# ---------------------------------------------------------
@router.get("/{product_id}/labels", response_model=ProductLabelResponse)
def get_product_labels(product_id: str, db: Session = Depends(get_db)):
    """Retrieve product label information for thermal/sticker printing."""
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found."
        )

    return ProductLabelResponse(
        productId=prod.id,
        name=prod.name,
        sku=prod.sku,
        barcode=prod.barcode or "",
        barcodeUrl=f"/api/products/{prod.id}/barcode",
        qrCodeUrl=f"/api/products/{prod.id}/qr-code",
        unitPrice=prod.unit_price,
        currency=prod.currency or "INR"
    )
