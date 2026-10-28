"""
Database Seed Script for DHARM Logistics ERP
Initializes demo users, master catalog products, tamper-evident containers,
and sample shipments for instant out-of-the-box readiness.
"""
import sys
import os
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


def seed_database():
    print("🚀 Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed Users
        print("👤 Checking users...")
        demo_users = [
            {
                "id": "usr-owner-01",
                "email": "hey.dhruvs20@gmail.com",
                "name": "Dhruva (Owner)",
                "role": UserRoleEnum.OWNER,
                "organization": "Apex Global Logistics & Medical Supply",
                "location": "Central Distribution Center, Hub Alpha",
                "avatar": "👑"
            },
            {
                "id": "usr-vendor-02",
                "email": "sinugunshetty@gmail.com",
                "name": "Sinu Gunshetty",
                "role": UserRoleEnum.VENDOR,
                "organization": "Trans-Express Regional Logistics",
                "location": "Midwest Sorting & Cross-Dock Hub 4",
                "avatar": "🏢"
            },
            {
                "id": "usr-cust-03",
                "email": "anusha.s2028@gmail.com",
                "name": "Anusha S",
                "role": UserRoleEnum.CUSTOMER,
                "organization": "BioMed Advanced Research Diagnostics",
                "location": "BioMed Campus Bay 2, Tech Park",
                "avatar": "🔬"
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
        print("📦 Checking products...")
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
            }
        ]

        for p_data in initial_products:
            existing = db.query(Product).filter(Product.id == p_data["id"]).first()
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
                    status=p_data["status"],
                    description=p_data["description"]
                )
                db.add(prod)
                print(f"  + Added product: {p_data['name']} ({p_data['sku']})")

        # 3. Seed Containers
        print("🛡 Checking tamper-evident containers...")
        initial_containers = [
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
        print("🚚 Checking shipments...")
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

        # 5. Seed Audit Event
        print("📑 Checking audit log...")
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

        db.commit()
        print("✅ Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during database seeding: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
