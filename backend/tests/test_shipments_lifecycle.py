import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.shipment import Shipment, ShipmentItem
from app.models.container import Container
from app.models.product import Product
from app.models.discrepancy import DiscrepancyCase

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown_shipment_tests():
    db = SessionLocal()
    try:
        # Ensure demo products 101, 102, 103 exist
        p101 = db.query(Product).filter(Product.id == "101").first()
        if not p101:
            p101 = Product(
                id="101",
                sku="MED-CRYO-901",
                name="Cryo-Shield Specimen Transporter",
                barcode="BC-MED-CRYO-0001",
                category="Medical Transport",
                stock_quantity=100
            )
            db.add(p101)

        p102 = db.query(Product).filter(Product.id == "102").first()
        if not p102:
            p102 = Product(
                id="102",
                sku="BIO-DIAG-440",
                name="OptiTrace Diagnostic Sensor Array",
                barcode="BC-BIO-DIAG-0002",
                category="Diagnostic Sensors",
                stock_quantity=80
            )
            db.add(p102)

        p103 = db.query(Product).filter(Product.id == "103").first()
        if not p103:
            p103 = Product(
                id="103",
                sku="PHRM-COLD-102",
                name="BioReagent Lyophilized Stabilizer",
                barcode="BC-PHRM-COLD-0003",
                category="Reagents",
                stock_quantity=120
            )
            db.add(p103)

        # Ensure container CNT-ALPHA-881 exists
        cnt = db.query(Container).filter(
            (Container.id == "1001") | (Container.container_number == "CNT-ALPHA-881")
        ).first()
        if not cnt:
            cnt = Container(
                id="1001",
                container_number="CNT-ALPHA-881",
                type="Standard Container",
                max_capacity=150.0,
                status="Available"
            )
            db.add(cnt)

        db.commit()
    finally:
        db.close()

    yield

    # Teardown any test shipments created during test
    db = SessionLocal()
    try:
        test_shipments = db.query(Shipment).filter(
            (Shipment.id.like("SHP-2026%")) | (Shipment.id.like("SHP-TEST%"))
        ).all()
        for s in test_shipments:
            if s.id not in ["shp-2026-101", "SHP-2026-001"]:
                db.query(DiscrepancyCase).filter(DiscrepancyCase.shipment_id == s.id).delete()
                db.delete(s)
        db.commit()
    finally:
        db.close()


def test_shipment_lifecycle_full_flow():
    # -------------------------------------------------------------
    # 1. POST /api/shipments - Create Shipment Manifest
    # -------------------------------------------------------------
    manifest_payload = {
        "origin_hub": "Central Depot (Hub Alpha)",
        "destination_bay": "BioMed Campus Bay 2",
        "vendor_id": 12,
        "customer_id": 24,
        "container_id": "CNT-ALPHA-881",
        "handling_notes": "Cold-chain priority handling required.",
        "items": [
            {"product_id": 101, "expected_quantity": 12},
            {"product_id": 102, "expected_quantity": 8},
            {"product_id": 103, "expected_quantity": 20}
        ]
    }

    res = client.post("/api/shipments", json=manifest_payload)
    assert res.status_code == 201, res.text
    create_body = res.json()
    assert create_body["success"] is True
    assert create_body["message"] == "Shipment manifest created successfully."
    data = create_body["data"]
    shipment_id = data["shipment_id"]
    tracking_id = data["tracking_id"]
    assert data["status"] == "draft"
    assert data["manifest_locked"] is False
    assert data["container_id"] == "CNT-ALPHA-881"
    assert data["expected_units"] == 40
    assert data["product_lines"] == 3
    assert "created_at" in data

    # -------------------------------------------------------------
    # 2. POST /api/shipments/{shipment_id}/owner-scans
    # -------------------------------------------------------------
    # Owner scans 10 units of product 101
    for i in range(1, 11):
        scan_res = client.post(
            f"/api/shipments/{shipment_id}/owner-scans",
            json={"barcode": "BC-MED-CRYO-0001", "container_id": "CNT-ALPHA-881"}
        )
        assert scan_res.status_code == 200, scan_res.text
        scan_data = scan_res.json()["data"]
        assert scan_data["shipment_id"] == shipment_id
        assert scan_data["barcode"] == "BC-MED-CRYO-0001"
        assert scan_data["product_id"] == 101
        assert scan_data["product_code"] == "MED-CRYO-901"
        assert scan_data["product_name"] == "Cryo-Shield Specimen Transporter"
        assert scan_data["packed_quantity"] == i
        assert scan_data["expected_quantity"] == 12
        assert scan_data["remaining_quantity"] == 12 - i
        assert scan_data["packing_status"] == ("completed" if i >= 12 else "in_progress")

    # Invalid barcode scan returns 422
    invalid_scan = client.post(
        f"/api/shipments/{shipment_id}/owner-scans",
        json={"barcode": "BC-INVALID-9999"}
    )
    assert invalid_scan.status_code == 422
    err_body = invalid_scan.json()
    assert err_body["success"] is False
    assert err_body["error"]["code"] == "INVALID_BARCODE"

    # -------------------------------------------------------------
    # 3. Vendor scan BEFORE dispatch must fail with 409 Conflict
    # -------------------------------------------------------------
    premature_vendor_scan = client.post(
        f"/api/shipments/{shipment_id}/vendor-scans",
        json={"barcode": "BC-MED-CRYO-0001", "container_id": "CNT-ALPHA-881"}
    )
    assert premature_vendor_scan.status_code == 409
    assert premature_vendor_scan.json()["error"]["code"] == "INVALID_SHIPMENT_STATUS"
    assert "not allowed before dispatch" in premature_vendor_scan.json()["error"]["message"]

    # -------------------------------------------------------------
    # 4. POST /api/shipments/{shipment_id}/dispatch
    # -------------------------------------------------------------
    dispatch_res = client.post(
        f"/api/shipments/{shipment_id}/dispatch",
        json={
            "container_id": "CNT-ALPHA-881",
            "checkpoint_location": "Apex Central Depot (Hub Alpha)",
            "seal_number": "SEAL-2026-001",
            "notes": "Manifest verified and cargo sealed."
        }
    )
    assert dispatch_res.status_code == 200, dispatch_res.text
    disp_data = dispatch_res.json()["data"]
    assert disp_data["shipment_id"] == shipment_id
    assert disp_data["tracking_id"] == tracking_id
    assert disp_data["status"] == "dispatched"
    assert disp_data["manifest_locked"] is True
    assert disp_data["expected_units"] == 40
    assert "dispatched_at" in disp_data

    # Repeated dispatch returns 409 Conflict
    repeat_dispatch = client.post(
        f"/api/shipments/{shipment_id}/dispatch",
        json={
            "container_id": "CNT-ALPHA-881",
            "checkpoint_location": "Apex Central Depot",
            "seal_number": "SEAL-2026-001"
        }
    )
    assert repeat_dispatch.status_code == 409
    assert repeat_dispatch.json()["error"]["code"] == "ALREADY_DISPATCHED"

    # Owner scan after dispatch returns 409 Conflict
    post_dispatch_owner_scan = client.post(
        f"/api/shipments/{shipment_id}/owner-scans",
        json={"barcode": "BC-MED-CRYO-0001"}
    )
    assert post_dispatch_owner_scan.status_code == 409
    assert post_dispatch_owner_scan.json()["error"]["code"] == "MANIFEST_LOCKED"

    # -------------------------------------------------------------
    # 5. POST /api/shipments/{shipment_id}/vendor-scans
    # -------------------------------------------------------------
    # Vendor scans 10 units of product 101
    for v in range(1, 11):
        v_res = client.post(
            f"/api/shipments/{shipment_id}/vendor-scans",
            json={"barcode": "BC-MED-CRYO-0001", "container_id": "CNT-ALPHA-881"}
        )
        assert v_res.status_code == 200, v_res.text
        v_data = v_res.json()["data"]
        assert v_data["barcode"] == "BC-MED-CRYO-0001"
        assert v_data["product_code"] == "MED-CRYO-901"
        assert v_data["expected_quantity"] == 12
        assert v_data["received_quantity"] == v
        assert v_data["remaining_quantity"] == 12 - v
        assert v_data["shipment_status"] == "in_transit"
        assert v_data["scan_status"] == "valid"

    # Vendor scans all 8 units of product 102
    for _ in range(8):
        v_res = client.post(
            f"/api/shipments/{shipment_id}/vendor-scans",
            json={"barcode": "BC-BIO-DIAG-0002", "container_id": "CNT-ALPHA-881"}
        )
        assert v_res.status_code == 200

    # Vendor scans all 20 units of product 103
    for _ in range(20):
        v_res = client.post(
            f"/api/shipments/{shipment_id}/vendor-scans",
            json={"barcode": "BC-PHRM-COLD-0003", "container_id": "CNT-ALPHA-881"}
        )
        assert v_res.status_code == 200

    # Vendor scans unrecognized barcode -> 422
    inv_vendor_scan = client.post(
        f"/api/shipments/{shipment_id}/vendor-scans",
        json={"barcode": "BC-UNKNOWN-0000"}
    )
    assert inv_vendor_scan.status_code == 422
    assert inv_vendor_scan.json()["error"]["code"] == "INVALID_BARCODE"

    # -------------------------------------------------------------
    # 6. POST /api/shipments/{shipment_id}/fulfillment
    # -------------------------------------------------------------
    # Attempting to manually force status to 'reconciled' should be blocked (400)
    bypass_res = client.post(
        f"/api/shipments/{shipment_id}/fulfillment",
        json={
            "status": "reconciled",
            "checkpoint_location": "Midwest Sorting Hub 4",
            "notes": "Attempting manual bypass."
        }
    )
    assert bypass_res.status_code == 400
    assert bypass_res.json()["error"]["code"] == "CANNOT_BYPASS_RECONCILIATION"

    # Valid checkpoint update succeeds
    f_res = client.post(
        f"/api/shipments/{shipment_id}/fulfillment",
        json={
            "status": "in_transit",
            "checkpoint_location": "Midwest Sorting Hub 4",
            "notes": "Shipment received at sorting hub."
        }
    )
    assert f_res.status_code == 200
    assert f_res.json()["data"]["status"] == "in_transit"
    assert f_res.json()["data"]["checkpoint_location"] == "Midwest Sorting Hub 4"

    # -------------------------------------------------------------
    # 7. POST /api/shipments/{shipment_id}/complete-receiving
    # Product 101 has 10 received vs 12 expected -> Discrepancy (shortage: 2)
    # Products 102 (8/8) and 103 (20/20) match
    # -------------------------------------------------------------
    rec_res = client.post(
        f"/api/shipments/{shipment_id}/complete-receiving",
        json={
            "container_id": "CNT-ALPHA-881",
            "confirmation": True,
            "checkpoint_location": "Midwest Sorting Hub 4 Scanning Bay",
            "notes": "All physically received products have been scanned."
        }
    )
    assert rec_res.status_code == 200, rec_res.text
    rec_body = rec_res.json()
    assert rec_body["success"] is True
    assert rec_body["message"] == "Shipment discrepancy detected."
    rec_data = rec_body["data"]
    assert rec_data["status"] == "discrepancy"
    assert rec_data["expected_units"] == 40
    assert rec_data["received_units"] == 38
    assert rec_data["shortage_units"] == 2
    assert rec_data["overage_units"] == 0
    assert rec_data["discrepancy_count"] == 1
    assert len(rec_data["discrepancies"]) == 1

    disc_item = rec_data["discrepancies"][0]
    discrepancy_id = disc_item["discrepancy_id"]
    assert disc_item["product_id"] == 101
    assert disc_item["product_code"] == "MED-CRYO-901"
    assert disc_item["product_name"] == "Cryo-Shield Specimen Transporter"
    assert disc_item["container_id"] == "CNT-ALPHA-881"
    assert disc_item["expected_quantity"] == 12
    assert disc_item["received_quantity"] == 10
    assert disc_item["variance"] == -2
    assert disc_item["type"] == "shortage"
    assert disc_item["status"] == "open"
    assert disc_item["message"] == "2 units are unaccounted for."
    assert rec_data["notifications"]["owner"] == "pending"

    # -------------------------------------------------------------
    # 8. GET /api/shipments/{shipment_id} - Shipment Details
    # -------------------------------------------------------------
    details_res = client.get(f"/api/shipments/{shipment_id}")
    assert details_res.status_code == 200, details_res.text
    details = details_res.json()["data"]
    assert details["shipment_id"] == shipment_id
    assert details["tracking_id"] == tracking_id
    assert details["origin_hub"] == "Central Depot (Hub Alpha)"
    assert details["destination_bay"] == "BioMed Campus Bay 2"
    assert details["container_id"] == "CNT-ALPHA-881"
    assert details["assigned_vendor"]["id"] == 12
    assert "Sinu Gunshetty" in details["assigned_vendor"]["name"]
    assert details["recipient_customer"]["id"] == 24
    assert "Anusha S" in details["recipient_customer"]["name"]
    assert details["status"] == "discrepancy"
    assert details["expected_units"] == 40
    assert details["verified_units"] == 38
    assert details["open_discrepancies"] == 1
    assert details["container"]["id"] == "CNT-ALPHA-881"
    assert details["manifest_locked"] is True
    assert len(details["discrepancies"]) == 1
    assert len(details["events"]) >= 1

    lines = {line["product_code"]: line for line in details["product_lines"]}
    assert lines["MED-CRYO-901"]["expected"] == 12
    assert lines["MED-CRYO-901"]["verified"] == 10
    assert lines["MED-CRYO-901"]["variance"] == -2
    assert lines["MED-CRYO-901"]["status"] == "mismatch"

    assert lines["BIO-DIAG-440"]["expected"] == 8
    assert lines["BIO-DIAG-440"]["verified"] == 8
    assert lines["BIO-DIAG-440"]["variance"] == 0
    assert lines["BIO-DIAG-440"]["status"] == "verified"

    assert lines["PHRM-COLD-102"]["expected"] == 20
    assert lines["PHRM-COLD-102"]["verified"] == 20
    assert lines["PHRM-COLD-102"]["variance"] == 0
    assert lines["PHRM-COLD-102"]["status"] == "verified"

    # -------------------------------------------------------------
    # 9. GET /api/shipments/{shipment_id}/reconciliation
    # -------------------------------------------------------------
    recon_res = client.get(f"/api/shipments/{shipment_id}/reconciliation")
    assert recon_res.status_code == 200, recon_res.text
    recon_data = recon_res.json()["data"]
    assert recon_data["shipment_id"] == shipment_id
    assert recon_data["reconciliation_status"] == "discrepancy"
    assert recon_data["expected_units"] == 40
    assert recon_data["verified_units"] == 38
    assert recon_data["variance_units"] == -2
    assert len(recon_data["lines"]) == 1
    assert recon_data["lines"][0]["product_code"] == "MED-CRYO-901"
    assert recon_data["lines"][0]["expected_quantity"] == 12
    assert recon_data["lines"][0]["verified_quantity"] == 10
    assert recon_data["lines"][0]["variance"] == -2
    assert recon_data["lines"][0]["status"] == "shortage"
    assert "generated_at" in recon_data

    # -------------------------------------------------------------
    # 10. PATCH /api/shipments/{shipment_id}/discrepancies/{discrepancy_id}
    # -------------------------------------------------------------
    patch_res = client.patch(
        f"/api/shipments/{shipment_id}/discrepancies/{discrepancy_id}",
        json={
            "resolution_status": "resolved",
            "resolution_type": "shortage_confirmed",
            "notes": "Physical recount confirmed that two units were missing."
        }
    )
    assert patch_res.status_code == 200, patch_res.text
    patch_body = patch_res.json()
    assert patch_body["success"] is True
    assert patch_body["message"] == "Discrepancy investigation updated."
    patch_data = patch_body["data"]
    assert patch_data["discrepancy_id"] == discrepancy_id
    assert patch_data["shipment_id"] == shipment_id
    assert patch_data["status"] == "resolved"
    assert patch_data["resolution_type"] == "shortage_confirmed"
    assert patch_data["notes"] == "Physical recount confirmed that two units were missing."
    assert "resolved_at" in patch_data

    # Recheck GET details: open discrepancies should now be 0
    updated_details = client.get(f"/api/shipments/{shipment_id}").json()["data"]
    assert updated_details["open_discrepancies"] == 0
    # Original scan records remain unchanged
    assert updated_details["verified_units"] == 38


def test_shipment_reconciled_when_quantities_match():
    # Test perfect match scenario
    manifest_payload = {
        "origin_hub": "Central Hub",
        "destination_bay": "Bay 1",
        "vendor_id": 12,
        "customer_id": 24,
        "container_id": "CNT-ALPHA-881",
        "items": [
            {"product_id": 101, "expected_quantity": 2}
        ]
    }
    c_res = client.post("/api/shipments", json=manifest_payload)
    assert c_res.status_code == 201
    shp_id = c_res.json()["data"]["shipment_id"]

    # Dispatch
    d_res = client.post(
        f"/api/shipments/{shp_id}/dispatch",
        json={"container_id": "CNT-ALPHA-881", "checkpoint_location": "Dock", "seal_number": "SEAL-01"}
    )
    assert d_res.status_code == 200

    # Scan 2 units
    for _ in range(2):
        client.post(f"/api/shipments/{shp_id}/vendor-scans", json={"barcode": "BC-MED-CRYO-0001"})

    # Complete receiving
    rec_res = client.post(
        f"/api/shipments/{shp_id}/complete-receiving",
        json={"container_id": "CNT-ALPHA-881", "checkpoint_location": "Dock"}
    )
    assert rec_res.status_code == 200
    rec_data = rec_res.json()["data"]
    assert rec_data["status"] == "reconciled"
    assert rec_data["expected_units"] == 2
    assert rec_data["received_units"] == 2
    assert rec_data["shortage_units"] == 0
    assert rec_data["discrepancy_count"] == 0
    assert rec_data["discrepancies"] == []


def test_get_all_shipments_pagination_and_filter():
    # 1. Fetch paginated list
    res = client.get("/api/shipments?page=1&limit=5")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)
    assert "pagination" in body
    p = body["pagination"]
    assert p["page"] == 1
    assert p["limit"] == 5
    assert "total_records" in p
    assert "total_pages" in p

    # 2. Test status filter
    filter_res = client.get("/api/shipments?page=1&limit=10&status=draft")
    assert filter_res.status_code == 200
    filter_body = filter_res.json()
    assert filter_body["success"] is True
    for item in filter_body["data"]:
        assert item["status"] == "draft"


def test_put_and_patch_shipment_update():
    # 1. Create temporary shipment to update
    create_res = client.post("/api/shipments", json={
        "origin_hub": "Test Depot",
        "destination_bay": "Test Bay",
        "vendor_id": 12,
        "customer_id": 24,
        "container_id": "CNT-ALPHA-881",
        "items": [{"product_id": 101, "expected_quantity": 5}]
    })
    assert create_res.status_code == 201
    shp_id = create_res.json()["data"]["shipment_id"]

    # 2. Test PUT with Swagger placeholder dummy payload (must be sanitized and succeed)
    swagger_dummy = {
        "trackingNumber": "string",
        "ownerId": "string",
        "ownerName": "string",
        "vendorId": "string",
        "vendorName": "string",
        "customerId": "string",
        "customerName": "string",
        "origin": "string",
        "destination": "string",
        "status": "Draft",
        "containerIds": [],
        "manifestHash": "string",
        "dispatchDate": "2026-10-28T23:06:05.393Z",
        "estimatedDelivery": "2026-10-28T23:06:05.393Z",
        "actualDelivery": "2026-10-28T23:06:05.393Z",
        "notes": "string",
        "id": "string",
        "items": []
    }
    put_res = client.put(f"/api/shipments/{shp_id}", json=swagger_dummy)
    assert put_res.status_code == 200
    assert put_res.json()["success"] is True
    assert put_res.json()["message"] == "Shipment updated successfully."

    # 3. Test PATCH with real updated values
    patch_payload = {
        "trackingNumber": f"TRK-TEST-{shp_id}",
        "origin": "Updated Hub Alpha",
        "destination": "Updated Bay 4",
        "status": "In Transit",
        "notes": "Updated route instructions.",
        "containerIds": ["CNT-ALPHA-881"]
    }
    patch_res = client.patch(f"/api/shipments/{shp_id}", json=patch_payload)
    assert patch_res.status_code == 200
    patch_data = patch_res.json()["data"]
    assert patch_data["trackingNumber"] == f"TRK-TEST-{shp_id}"
    assert patch_data["origin"] == "Updated Hub Alpha"
    assert patch_data["destination"] == "Updated Bay 4"
    assert patch_data["status"] == "In Transit"
    assert patch_data["notes"] == "Updated route instructions."


