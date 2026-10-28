"""
Database Seed Script for DHARM Logistics ERP
Initializes demo users, master catalog products, tamper-evident containers,
and sample shipments for instant out-of-the-box readiness.
"""
import sys
import os

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRoleEnum
from app.models.product import Product
from app.models.container import Container, ContainerItem
from app.models.shipment import Shipment, ShipmentItem, ShipmentEvent
from app.models.discrepancy import DiscrepancyCase
from app.models.audit import AuditEvent
from app.models.order import Order, OrderItem


def seed_database():
    print("[INIT] Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed Users
        print("[USERS] Checking users...")
        demo_users = [
            {
                "id": "usr-owner-01",
                "email": "hey.dhruvs20@gmail.com",
                "name": "Dhruva (Owner)",
                "role": UserRoleEnum.OWNER,
                "organization": "Apex Global Logistics & Medical Supply",
                "location": "Central Distribution Center, Hub Alpha",
                "avatar": "Owner"
            },
            {
                "id": "usr-vendor-02",
                "email": "sinugunshetty@gmail.com",
                "name": "Sinu Gunshetty",
                "role": UserRoleEnum.VENDOR,
                "organization": "Trans-Express Regional Logistics",
                "location": "Midwest Sorting & Cross-Dock Hub 4",
                "avatar": "Vendor"
            },
            {
                "id": "usr-cust-03",
                "email": "anusha.s2028@gmail.com",
                "name": "Anusha S",
                "role": UserRoleEnum.CUSTOMER,
                "organization": "BioMed Advanced Research Diagnostics",
                "location": "BioMed Campus Bay 2, Tech Park",
                "avatar": "Customer"
            },
            {
                "id": "12",
                "email": "sinu.vendor@dharm.com",
                "name": "Sinu Gunshetty",
                "role": UserRoleEnum.VENDOR,
                "organization": "Trans-Express Regional Logistics",
                "location": "Midwest Sorting Hub 4",
                "avatar": "Vendor"
            },
            {
                "id": "24",
                "email": "anusha.biomed@dharm.com",
                "name": "Anusha S (BioMed)",
                "role": UserRoleEnum.CUSTOMER,
                "organization": "BioMed Campus Bay 2",
                "location": "BioMed Campus Bay 2",
                "avatar": "Customer"
            }
        ]

        for u_data in demo_users:
            existing = db.query(User).filter(User.email.ilike(u_data["email"])).first()
            if not existing:
                user = User(
                    id=u_data["id"],
                    email=u_data["email"].lower(),
                    name=u_data["name"],
                    hashed_password=get_password_hash("Dharam@123"),
                    role=u_data["role"],
                    organization=u_data["organization"],
                    location=u_data["location"],
                    avatar=u_data["avatar"]
                )
                db.add(user)
                print(f"  + Added user: {u_data['email']} ({u_data['role'].value})")

        # 2. Seed Master Catalog Products
        print("[PRODUCTS] Checking products...")
        initial_products = [
            {
                "id": "prod-sas-01",
                "sku": "GEN-SAS-001",
                "name": "SASAS (Copy)",
                "category": "General / Uncategorized",
                "barcode": "BC-SAS-001",
                "is_serialized": False,
                "unit": "Unit",
                "billing_unit": "One-time",
                "stock_quantity": 10,
                "reorder_level": 2,
                "unit_price": 500.0,
                "gst_rate": 18.0,
                "gross_price": 590.0,
                "currency": "INR",
                "status": "Active",
                "description": "General system service profile copy."
            },
            {
                "id": "prod-apl-01",
                "sku": "AI-APL-001",
                "name": "Apple AI Diagnostic Model",
                "category": "AI, ML & Data Intelligence",
                "barcode": "BC-APL-001",
                "is_serialized": True,
                "unit": "License",
                "billing_unit": "Quarterly",
                "stock_quantity": 25,
                "reorder_level": 5,
                "unit_price": 150000.0,
                "gst_rate": 18.0,
                "gross_price": 177000.0,
                "currency": "INR",
                "status": "Active",
                "description": "Enterprise AI diagnostic vision model license."
            },
            {
                "id": "prod-mkt-01",
                "sku": "SAAS-MKT-101",
                "name": "Agamin Marketing Automation Pro",
                "category": "Enterprise Software & SaaS",
                "barcode": "BC-MKT-101",
                "is_serialized": True,
                "unit": "Instance",
                "billing_unit": "One-time / Per Unit",
                "stock_quantity": 50,
                "reorder_level": 10,
                "unit_price": 250000.0,
                "gst_rate": 18.0,
                "gross_price": 295000.0,
                "currency": "INR",
                "status": "Active",
                "description": "Omnichannel multi-tenant logistics notification and marketing engine."
            },
            {
                "id": "prod-efe-01",
                "sku": "AI-DAT-003",
                "name": "Sensory Classification Sensor",
                "category": "Sensors & Diagnostics",
                "barcode": "BC-DAT-003",
                "is_serialized": False,
                "unit": "Unit",
                "billing_unit": "One-time",
                "stock_quantity": 12,
                "reorder_level": 3,
                "unit_price": 59500.0,
                "gst_rate": 28.0,
                "gross_price": 76160.0,
                "currency": "INR",
                "status": "Active",
                "description": "High-throughput sensory classification model."
            },
            {
                "id": "1005",
                "sku": "SKU-0015",
                "name": "Copper Wire",
                "category": "Raw Materials & Cabling",
                "barcode": "8901063139374",
                "is_serialized": False,
                "unit": "Roll",
                "billing_unit": "One-time",
                "stock_quantity": 150,
                "reorder_level": 15,
                "unit_price": 1250.0,
                "gst_rate": 18.0,
                "gross_price": 1475.0,
                "currency": "INR",
                "unit_weight": 0.5,
                "status": "Active",
                "description": "High conductivity copper wire roll (0.5 kg)."
            },
            {
                "id": "1006",
                "sku": "SKU-0016",
                "name": "Switch",
                "category": "Electrical & Controls",
                "barcode": "8901063139375",
                "is_serialized": False,
                "unit": "Unit",
                "billing_unit": "One-time",
                "stock_quantity": 200,
                "reorder_level": 20,
                "unit_price": 450.0,
                "gst_rate": 18.0,
                "gross_price": 531.0,
                "currency": "INR",
                "unit_weight": 0.25,
                "status": "Active",
                "description": "Standard industrial electrical switch."
            },
            {
                "id": "101",
                "sku": "MED-CRYO-901",
                "name": "Cryo-Shield Specimen Transporter",
                "category": "Medical Transport & Cold Chain",
                "barcode": "BC-MED-CRYO-0001",
                "is_serialized": False,
                "unit": "Unit",
                "billing_unit": "One-time",
                "stock_quantity": 100,
                "reorder_level": 10,
                "unit_price": 14500.0,
                "gst_rate": 18.0,
                "gross_price": 17110.0,
                "currency": "INR",
                "unit_weight": 2.5,
                "status": "Active",
                "description": "Precision thermal-insulated cold-chain specimen transporter."
            },
            {
                "id": "102",
                "sku": "BIO-DIAG-440",
                "name": "OptiTrace Diagnostic Sensor Array",
                "category": "Diagnostic Sensors",
                "barcode": "BC-BIO-DIAG-0002",
                "is_serialized": False,
                "unit": "Unit",
                "billing_unit": "One-time",
                "stock_quantity": 80,
                "reorder_level": 10,
                "unit_price": 28000.0,
                "gst_rate": 18.0,
                "gross_price": 33040.0,
                "currency": "INR",
                "unit_weight": 1.2,
                "status": "Active",
                "description": "Multi-spectral optical diagnostic sensor array."
            },
            {
                "id": "103",
                "sku": "PHRM-COLD-102",
                "name": "BioReagent Lyophilized Stabilizer",
                "category": "Pharmaceutical Reagents",
                "barcode": "BC-PHRM-COLD-0003",
                "is_serialized": False,
                "unit": "Unit",
                "billing_unit": "One-time",
                "stock_quantity": 120,
                "reorder_level": 15,
                "unit_price": 9500.0,
                "gst_rate": 18.0,
                "gross_price": 11210.0,
                "currency": "INR",
                "unit_weight": 0.8,
                "status": "Active",
                "description": "Stabilizing reagent for clinical and diagnostic specimens."
            }
        ]

        for p_data in initial_products:
            existing = db.query(Product).filter(
                (Product.id == p_data["id"]) |
                (Product.barcode == p_data["barcode"]) |
                (Product.sku == p_data["sku"])
            ).first()
            if not existing:
                prod = Product(
                    id=p_data["id"],
                    sku=p_data["sku"],
                    name=p_data["name"],
                    category=p_data["category"],
                    barcode=p_data["barcode"],
                    is_serialized=p_data["is_serialized"],
                    unit=p_data["unit"],
                    billing_unit=p_data["billing_unit"],
                    stock_quantity=p_data["stock_quantity"],
                    reorder_level=p_data["reorder_level"],
                    unit_price=p_data["unit_price"],
                    gst_rate=p_data["gst_rate"],
                    gross_price=p_data["gross_price"],
                    currency=p_data["currency"],
                    unit_weight=p_data.get("unit_weight", 1.0),
                    status=p_data["status"],
                    description=p_data["description"]
                )
                db.add(prod)
                print(f"  + Added product: {p_data['name']} ({p_data['sku']})")
            else:
                if "unit_weight" in p_data and (existing.unit_weight is None or existing.unit_weight == 1.0):
                    existing.unit_weight = p_data["unit_weight"]
                    db.commit()

        # 3. Seed Containers
        print("[CONTAINERS] Checking tamper-evident containers...")
        initial_containers = [
            {
                "id": "1001",
                "container_number": "CNT-ALPHA-881",
                "type": "Standard Container",
                "max_capacity": 150.0,
                "capacity_unit": "Kilograms (kg)",
                "capacity_kg": 150.0,
                "current_weight_kg": 0.0,
                "utilized_capacity": 0.0,
                "seal_number": "SEAL-SEC-88100",
                "seal_status": "Active",
                "initial_location": "Central Warehouse Bay 4",
                "location": "Central Warehouse Bay 4",
                "status": "IN_PROGRESS"
            },
            {
                "id": "cnt-001",
                "container_number": "CNT-2026-001",
                "type": "Cold-Chain Bin",
                "max_capacity": 50.0,
                "capacity_unit": "kg",
                "capacity_kg": 50.0,
                "current_weight_kg": 15.5,
                "utilized_capacity": 31.0,
                "seal_number": "SEAL-88901",
                "seal_status": "Active",
                "initial_location": "Central Distribution Center, Hub Alpha",
                "location": "Central Distribution Center, Hub Alpha",
                "status": "Sealed"
            },
            {
                "id": "cnt-002",
                "container_number": "CNT-2026-002",
                "type": "Security Crate",
                "max_capacity": 100.0,
                "capacity_unit": "kg",
                "capacity_kg": 100.0,
                "current_weight_kg": 0.0,
                "utilized_capacity": 0.0,
                "seal_number": "SEAL-88902",
                "seal_status": "Active",
                "initial_location": "Midwest Sorting & Cross-Dock Hub 4",
                "location": "Midwest Sorting & Cross-Dock Hub 4",
                "status": "Empty"
            }
        ]

        for c_data in initial_containers:
            existing = db.query(Container).filter(Container.id == c_data["id"]).first()
            if not existing:
                cnt = Container(
                    id=c_data["id"],
                    container_number=c_data["container_number"],
                    type=c_data["type"],
                    max_capacity=c_data["max_capacity"],
                    capacity_unit=c_data["capacity_unit"],
                    capacity_kg=c_data["capacity_kg"],
                    current_weight_kg=c_data["current_weight_kg"],
                    utilized_capacity=c_data["utilized_capacity"],
                    seal_number=c_data["seal_number"],
                    seal_status=c_data["seal_status"],
                    initial_location=c_data["initial_location"],
                    location=c_data["location"],
                    status=c_data["status"]
                )
                db.add(cnt)
                print(f"  + Added container: {c_data['container_number']}")

        # 4. Seed Initial Shipment
        print("[SHIPMENTS] Checking shipments...")
        existing_shp = db.query(Shipment).filter(Shipment.id == "shp-2026-101").first()
        if not existing_shp:
            shipment = Shipment(
                id="shp-2026-101",
                tracking_number="DHRM-TRK-77421",
                owner_id="usr-owner-01",
                owner_name="Dhruva (Owner)",
                vendor_id="usr-vendor-02",
                vendor_name="Sinu Gunshetty",
                customer_id="usr-cust-03",
                customer_name="Anusha S",
                origin="Central Distribution Center, Hub Alpha",
                destination="BioMed Campus Bay 2, Tech Park",
                status="In Transit",
                container_ids=["cnt-001"],
                manifest_hash="0x9a8f4c21e5b8719a",
                dispatch_date=datetime.utcnow() - timedelta(days=1),
                estimated_delivery=datetime.utcnow() + timedelta(days=2),
                notes="Cold-chain temperature logs verified prior to dispatch."
            )
            db.add(shipment)
            db.flush()

            # Add shipment items
            shp_item = ShipmentItem(
                id="sitem-101",
                shipment_id="shp-2026-101",
                product_id="prod-apl-01",
                product_name="Apple AI Diagnostic Model",
                sku="AI-APL-001",
                barcode="BC-APL-001",
                container_id="cnt-001",
                container_number="CNT-2026-001",
                expected_quantity=5,
                verified_quantity=5,
                scanned_quantity=5,
                status="Verified"
            )
            db.add(shp_item)

            # Add shipment events
            events = [
                ShipmentEvent(
                    id="evt-101-1",
                    shipment_id="shp-2026-101",
                    status="Draft",
                    location="Central Distribution Center, Hub Alpha",
                    performed_by="Dhruva (Owner)",
                    notes="Manifest drafted and items allocated to container CNT-2026-001",
                    timestamp=datetime.utcnow() - timedelta(days=2)
                ),
                ShipmentEvent(
                    id="evt-101-2",
                    shipment_id="shp-2026-101",
                    status="Dispatched",
                    location="Central Distribution Center, Hub Alpha",
                    performed_by="Dhruva (Owner)",
                    notes="Sealed with tamper-evident seal SEAL-88901 and dispatched via Trans-Express",
                    timestamp=datetime.utcnow() - timedelta(days=1)
                ),
                ShipmentEvent(
                    id="evt-101-3",
                    shipment_id="shp-2026-101",
                    status="In Transit",
                    location="Midwest Sorting & Cross-Dock Hub 4",
                    performed_by="Sinu Gunshetty",
                    notes="Cross-dock inspection passed. Container seal intact.",
                    timestamp=datetime.utcnow() - timedelta(hours=6)
                )
            ]
            db.add_all(events)
            print("  + Added shipment: DHRM-TRK-77421")

        # Seed Demo Discrepancy Shipment SHP-2026-001
        existing_demo_shp = db.query(Shipment).filter(Shipment.id == "SHP-2026-001").first()
        if not existing_demo_shp:
            demo_shp = Shipment(
                id="SHP-2026-001",
                tracking_number="TRK-DHM-884920",
                owner_id="usr-owner-01",
                owner_name="Dhruva (Owner)",
                vendor_id="12",
                vendor_name="Sinu Gunshetty (Trans-Express)",
                customer_id="24",
                customer_name="Anusha S (BioMed)",
                origin="Apex Central Depot (Hub Alpha)",
                destination="BioMed Research Campus Bay 2",
                status="discrepancy",
                manifest_locked=True,
                container_ids=["CNT-ALPHA-881"],
                manifest_hash="0x7890abcdef123456",
                dispatch_date=datetime(2026, 10, 26, 8, 0, 0),
                notes="Cold-chain priority handling required.",
                created_at=datetime(2026, 10, 26, 7, 30, 0)
            )
            db.add(demo_shp)
            db.flush()

            demo_items = [
                ShipmentItem(
                    id="sitem-demo-001",
                    shipment_id="SHP-2026-001",
                    product_id="101",
                    product_name="Cryo-Shield Specimen Transporter",
                    sku="MED-CRYO-901",
                    barcode="BC-MED-CRYO-0001",
                    container_id="CNT-ALPHA-881",
                    container_number="CNT-ALPHA-881",
                    expected_quantity=12,
                    verified_quantity=10,
                    scanned_quantity=10,
                    status="Pending"
                ),
                ShipmentItem(
                    id="sitem-demo-002",
                    shipment_id="SHP-2026-001",
                    product_id="102",
                    product_name="OptiTrace Diagnostic Sensor Array",
                    sku="BIO-DIAG-440",
                    barcode="BC-BIO-DIAG-0002",
                    container_id="CNT-ALPHA-881",
                    container_number="CNT-ALPHA-881",
                    expected_quantity=8,
                    verified_quantity=8,
                    scanned_quantity=8,
                    status="Verified"
                ),
                ShipmentItem(
                    id="sitem-demo-003",
                    shipment_id="SHP-2026-001",
                    product_id="103",
                    product_name="BioReagent Lyophilized Stabilizer",
                    sku="PHRM-COLD-102",
                    barcode="BC-PHRM-COLD-0003",
                    container_id="CNT-SEC-409",
                    container_number="CNT-SEC-409",
                    expected_quantity=20,
                    verified_quantity=20,
                    scanned_quantity=20,
                    status="Verified"
                )
            ]
            db.add_all(demo_items)

            # Discrepancy Case
            disc_case = DiscrepancyCase(
                id="dsp-demo-001",
                discrepancy_number="DSP-2026-001",
                shipment_id="SHP-2026-001",
                shipment_tracking="TRK-DHM-884920",
                container_id="CNT-ALPHA-881",
                container_number="CNT-ALPHA-881",
                product_id="101",
                product_name="Cryo-Shield Specimen Transporter",
                sku="MED-CRYO-901",
                type="shortage",
                severity="Medium",
                status="open",
                expected_quantity=12,
                observed_quantity=10,
                detection_stage="Midwest Sorting Hub 4 Scanning Bay",
                detected_by="System",
                resolution_notes="2 units are unaccounted for.",
                detected_at=datetime(2026, 10, 27, 3, 10, 0)
            )
            db.add(disc_case)

            # Events
            demo_events = [
                ShipmentEvent(
                    id="evt-demo-001",
                    shipment_id="SHP-2026-001",
                    status="dispatched",
                    location="Apex Central Depot Gate 3",
                    performed_by="Dhruva (Owner)",
                    notes="Manifest locked and handed over to freight carrier.",
                    timestamp=datetime(2026, 10, 26, 8, 0, 0)
                ),
                ShipmentEvent(
                    id="evt-demo-002",
                    shipment_id="SHP-2026-001",
                    status="discrepancy_detected",
                    location="Midwest Sorting Hub 4 Scanning Bay",
                    performed_by="System",
                    notes="Observed count 10/12 for SKU MED-CRYO-901.",
                    timestamp=datetime(2026, 10, 27, 3, 10, 0)
                )
            ]
            db.add_all(demo_events)
            print("  + Added demo shipment: SHP-2026-001")

        # 5. Seed Audit Event
        print("[AUDIT] Checking audit log...")
        aud = db.query(AuditEvent).filter(AuditEvent.id == "aud-init-01").first()
        if not aud:
            aud = AuditEvent(
                id="aud-init-01",
                actor_name="Dhruva (Owner)",
                actor_role="OWNER",
                action="SYSTEM_INIT",
                entity_type="System",
                entity_id="sys-dharm",
                details="DHARM ERP backend initialized with PostgreSQL master ledger.",
                timestamp=datetime.utcnow()
            )
            db.add(aud)

        # 6. Seed Demo Orders
        print("[ORDERS] Checking orders...")
        if not db.query(Order).filter(Order.id == "ord-sample-01").first():
            sample_order = Order(
                id="ord-sample-01",
                order_number="ORD-DHM-2026-8819",
                customer_id="usr-cust-03",
                customer_name="Anusha S (BioMed)",
                customer_account="BioMed Advanced Research Diagnostics Pvt Ltd",
                customer_po_reference="PO-BIO-2026-7835",
                delivery_location="Primary Receiving Dock — Bengaluru, Karnataka",
                logistics_carrier="Bluedart Express",
                payment_terms="Corporate Net Banking",
                order_remarks="Expedited clinical reagent delivery for cold storage bay.",
                order_date=datetime.utcnow() - timedelta(days=2),
                status="Processing",
                expected_delivery_date=datetime.utcnow() + timedelta(days=2),
                payment_status="Paid",
                subtotal=29000.0,
                tax_total=5220.0,
                grand_total=34220.0,
                shipping_address={"label": "Primary Receiving Dock", "addressLine1": "Plot 42, Electronic City Phase 1", "city": "Bengaluru", "state": "Karnataka", "postalCode": "560100"},
                billing_address={"companyName": "BioMed Advanced Research Diagnostics Pvt Ltd", "addressLine1": "Plot 42, Electronic City", "city": "Bengaluru", "state": "Karnataka", "postalCode": "560100", "gstin": "29AABCU9603R1ZM"},
                tracking_number="TRK-DHM-884920",
                invoice_number="INV-DHM-2026-1049",
                invoice_available=True,
                can_cancel=True,
                created_at=datetime.utcnow() - timedelta(days=2),
                items=[
                    OrderItem(
                        id="ord-sample-01-item-1",
                        order_id="ord-sample-01",
                        product_id="prod-001",
                        product_name="Cryo-Shield Specimen Transporter",
                        sku="MED-CRYO-901",
                        quantity=2,
                        unit_price=14500.0,
                        gst_rate=0.18,
                        total_price=34220.0
                    )
                ]
            )
            db.add(sample_order)
            print("  + Added demo order: ORD-DHM-2026-8819")

        db.commit()
        print("[SUCCESS] Database tables verified and seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during database seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()