import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.container import Container

client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_test_containers():
    # Clean up any test containers before and after tests
    db = SessionLocal()
    try:
        test_numbers = ["CNT-ALPHA-206", "CNT-TEST-001", "CNT-TEST-002", "CNT-TEST-003", "CNT-LEGACY-001"]
        for num in test_numbers:
            c = db.query(Container).filter(Container.container_number == num).first()
            if c:
                db.delete(c)
        db.commit()
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        test_numbers = ["CNT-ALPHA-206", "CNT-TEST-001", "CNT-TEST-002", "CNT-TEST-003", "CNT-LEGACY-001"]
        for num in test_numbers:
            c = db.query(Container).filter(Container.container_number == num).first()
            if c:
                db.delete(c)
        db.commit()
    finally:
        db.close()


def test_create_container_success():
    payload = {
        "containerNumber": "CNT-ALPHA-206",
        "containerType": "Cold-Chain Bin",
        "maximumCapacity": 150,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-19007",
        "initialLocation": "Central Warehouse Bay 4",
        "description": "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."
    }
    response = client.post("/api/v1/containers", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Container created and initialized successfully"

    c_data = data["data"]
    assert c_data["id"] == "CNT-ALPHA-206"
    assert c_data["containerNumber"] == "CNT-ALPHA-206"
    assert c_data["containerType"] == "Cold-Chain Bin"
    assert c_data["maximumCapacity"] == 150.0
    assert c_data["capacityUnit"] == "Kilograms (kg)"
    assert c_data["tamperEvidentSealNumber"] == "SEAL-SEC-19007"
    assert c_data["initialLocation"] == "Central Warehouse Bay 4"
    assert c_data["description"] == "Maintain temperature between 2°C and 8°C. Handle with care and verify the seal before dispatch."
    assert c_data["status"] == "Available"
    assert c_data["initializationStatus"] == "Initialized"
    assert "createdAt" in c_data
    assert "updatedAt" in c_data


def test_create_container_via_legacy_path():
    payload = {
        "containerNumber": "CNT-LEGACY-001",
        "containerType": "Security Crate",
        "maximumCapacity": 80,
        "capacityUnit": "kg",
        "tamperEvidentSealNumber": "SEAL-LEGACY-001",
        "initialLocation": "Apex Central Depot (Hub Alpha)"
    }
    response = client.post("/api/containers", json=payload)
    assert response.status_code == 201
    assert response.json()["data"]["containerNumber"] == "CNT-LEGACY-001"


def test_swagger_dummy_payload_executes_successfully():
    # When user clicks Execute in Swagger UI with the default placeholder template
    dummy_payload = {
        "containerNumber": "string",
        "containerType": "string",
        "maximumCapacity": 0,
        "capacityUnit": "string",
        "tamperEvidentSealNumber": "string",
        "initialLocation": "string",
        "description": "string",
        "id": "string"
    }
    response = client.post("/api/containers", json=dummy_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "Available"
    assert data["data"]["initializationStatus"] == "Initialized"
    assert data["data"]["maximumCapacity"] > 0


def test_duplicate_container_number():
    payload = {
        "containerNumber": "CNT-ALPHA-206",
        "containerType": "Cold-Chain Bin",
        "maximumCapacity": 150,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-19007",
        "initialLocation": "Central Warehouse Bay 4",
        "description": "Test initial create"
    }
    res1 = client.post("/api/v1/containers", json=payload)
    assert res1.status_code == 201

    duplicate_payload = {
        "containerNumber": "CNT-ALPHA-206",
        "containerType": "Security Crate",
        "maximumCapacity": 200,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-99999",
        "initialLocation": "Apex Central Depot (Hub Alpha)"
    }
    res2 = client.post("/api/v1/containers", json=duplicate_payload)
    assert res2.status_code == 409
    assert res2.json() == {"detail": "Container number already exists"}


def test_duplicate_seal_number():
    payload1 = {
        "containerNumber": "CNT-TEST-001",
        "containerType": "Cold-Chain Bin",
        "maximumCapacity": 150,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-19007",
        "initialLocation": "Central Warehouse Bay 4"
    }
    res1 = client.post("/api/v1/containers", json=payload1)
    assert res1.status_code == 201

    payload2 = {
        "containerNumber": "CNT-TEST-002",
        "containerType": "Security Crate",
        "maximumCapacity": 100,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-19007",
        "initialLocation": "Central Warehouse Bay 4"
    }
    res2 = client.post("/api/v1/containers", json=payload2)
    assert res2.status_code == 409
    assert res2.json() == {"detail": "Tamper-evident seal number already in use"}


def test_invalid_capacity():
    payload = {
        "containerNumber": "CNT-TEST-003",
        "containerType": "Cold-Chain Bin",
        "maximumCapacity": 0,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-11111",
        "initialLocation": "Central Warehouse Bay 4"
    }
    response = client.post("/api/v1/containers", json=payload)
    assert response.status_code == 422
    err_detail = response.json()["detail"]
    assert any(
        err["loc"] == ["body", "maximumCapacity"] and
        err["msg"] == "Maximum capacity must be greater than zero" and
        err["type"] == "value_error"
        for err in err_detail
    )


def test_unsupported_container_type():
    payload = {
        "containerNumber": "CNT-TEST-003",
        "containerType": "Unrecognized Type",
        "maximumCapacity": 100,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-11111",
        "initialLocation": "Central Warehouse Bay 4"
    }
    response = client.post("/api/v1/containers", json=payload)
    assert response.status_code == 422
    err_detail = response.json()["detail"]
    assert any(
        err["loc"] == ["body", "containerType"] and
        "not supported" in err["msg"]
        for err in err_detail
    )


def test_unsupported_capacity_unit():
    payload = {
        "containerNumber": "CNT-TEST-003",
        "containerType": "Cold-Chain Bin",
        "maximumCapacity": 100,
        "capacityUnit": "Unrecognized Unit",
        "tamperEvidentSealNumber": "SEAL-SEC-11111",
        "initialLocation": "Central Warehouse Bay 4"
    }
    response = client.post("/api/v1/containers", json=payload)
    assert response.status_code == 422
    err_detail = response.json()["detail"]
    assert any(
        err["loc"] == ["body", "capacityUnit"] and
        "not supported" in err["msg"]
        for err in err_detail
    )


def test_full_container_lifecycle():
    # 1. Create container
    payload = {
        "containerNumber": "CNT-ALPHA-206",
        "containerType": "Cold-Chain Bin",
        "maximumCapacity": 150,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-SEC-19007",
        "initialLocation": "Central Warehouse Bay 4",
        "description": "Maintain temperature between 2°C and 8°C."
    }
    create_res = client.post("/api/v1/containers", json=payload)
    assert create_res.status_code == 201

    # 2. List containers
    list_res = client.get("/api/v1/containers")
    assert list_res.status_code == 200
    containers = list_res.json()
    assert any(c["containerNumber"] == "CNT-ALPHA-206" for c in containers)

    # 3. Get single container
    detail_res = client.get("/api/v1/containers/CNT-ALPHA-206")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["containerNumber"] == "CNT-ALPHA-206"
    assert detail["status"] == "Available"
    assert detail["initializationStatus"] == "Initialized"

    # 4. Add item to container
    item_payload = {
        "productId": "prod-001",
        "productName": "Cryo Vaccine Vial",
        "sku": "SKU-CRYO-001",
        "barcode": "8901234567890",
        "quantity": 5,
        "weightKg": 17.5,
        "unitWeightKg": 3.5
    }
    add_item_res = client.post("/api/v1/containers/CNT-ALPHA-206/items", json=item_payload)
    assert add_item_res.status_code == 200
    item_data = add_item_res.json()
    assert item_data["sku"] == "SKU-CRYO-001"

    # Check updated container weight
    updated_res = client.get("/api/v1/containers/CNT-ALPHA-206")
    assert updated_res.status_code == 200
    assert updated_res.json()["currentWeightKg"] == 17.5

    # 5. Apply seal to container
    seal_res = client.post("/api/v1/containers/CNT-ALPHA-206/seal?seal_number=SEAL-FINAL-999")
    assert seal_res.status_code == 200

    # 6. Delete container
    del_res = client.delete("/api/v1/containers/CNT-ALPHA-206")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 7. Verify deletion
    verify_del = client.get("/api/v1/containers/CNT-ALPHA-206")
    assert verify_del.status_code == 404


def test_update_container_swagger_dummy_payload():
    # Ensure CNT-ALPHA-881 exists
    client.post("/api/v1/containers", json={
        "containerNumber": "CNT-TEST-001",
        "containerType": "Security Crate",
        "maximumCapacity": 100,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-TEST-001",
        "initialLocation": "Central Warehouse Bay 4"
    })

    swagger_dummy_payload = {
        "containerNumber": "string",
        "containerType": "string",
        "type": "string",
        "maximumCapacity": 0,
        "maxCapacity": 0,
        "capacityUnit": "string",
        "capacityKg": 0,
        "currentWeightKg": 0,
        "utilizedCapacity": 0,
        "tamperEvidentSealNumber": "string",
        "sealNumber": "string",
        "sealStatus": "string",
        "initialLocation": "string",
        "location": "string",
        "description": "string",
        "status": "string",
        "initializationStatus": "string",
        "assignedShipmentId": "string",
        "assignedShipmentTracking": "string",
        "isActive": True
    }

    # Execute PUT with Swagger's unedited dummy payload
    response = client.put("/api/v1/containers/CNT-TEST-001", json=swagger_dummy_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["containerNumber"] == "CNT-TEST-001"
    assert data["status"] == "Active"


def test_update_container_valid_payload():
    client.post("/api/v1/containers", json={
        "containerNumber": "CNT-TEST-002",
        "containerType": "Cold-Chain Bin",
        "maximumCapacity": 150,
        "capacityUnit": "Kilograms (kg)",
        "tamperEvidentSealNumber": "SEAL-TEST-002",
        "initialLocation": "Central Warehouse Bay 4"
    })

    update_payload = {
        "location": "Apex Central Depot (Hub Alpha)",
        "description": "Updated temperature requirements",
        "maximumCapacity": 200.0,
        "status": "Active"
    }

    response = client.put("/api/v1/containers/CNT-TEST-002", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["location"] == "Apex Central Depot (Hub Alpha)"
    assert data["description"] == "Updated temperature requirements"
    assert data["maximumCapacity"] == 200.0

