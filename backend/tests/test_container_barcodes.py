import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.container import Container, ContainerItem
from app.models.product import Product
from app.models.container_product import ContainerProduct

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown_test_data():
    db = SessionLocal()
    try:
        # Ensure test container CNT-ALPHA-881 exists with open status
        c = db.query(Container).filter(
            (Container.id == "1001") | (Container.container_number == "CNT-ALPHA-881")
        ).first()
        if not c:
            c = Container(
                id="1001",
                container_number="CNT-ALPHA-881",
                type="Standard Container",
                max_capacity=150.0,
                capacity_unit="Kilograms (kg)",
                capacity_kg=150.0,
                current_weight_kg=0.0,
                utilized_capacity=0.0,
                seal_number="SEAL-SEC-88100",
                seal_status="Active",
                initial_location="Central Warehouse Bay 4",
                location="Central Warehouse Bay 4",
                status="IN_PROGRESS"
            )
            db.add(c)
        else:
            c.status = "IN_PROGRESS"
            c.current_weight_kg = 0.0
            c.utilized_capacity = 0.0

        # Ensure test product Copper Wire exists
        p1 = db.query(Product).filter(Product.barcode == "8901063139374").first()
        if not p1:
            p1 = Product(
                id="1005",
                sku="SKU-0015",
                name="Copper Wire",
                category="Raw Materials & Cabling",
                barcode="8901063139374",
                unit_weight=0.5,
                stock_quantity=100
            )
            db.add(p1)
        else:
            p1.unit_weight = 0.5

        # Clear existing items for this container
        db.query(ContainerProduct).filter(ContainerProduct.container_id == c.id).delete()
        db.query(ContainerItem).filter(ContainerItem.container_id == c.id).delete()
        db.commit()
    finally:
        db.close()

    yield

    db = SessionLocal()
    try:
        c = db.query(Container).filter(
            (Container.id == "1001") | (Container.container_number == "CNT-ALPHA-881")
        ).first()
        if c:
            db.query(ContainerProduct).filter(ContainerProduct.container_id == c.id).delete()
            db.query(ContainerItem).filter(ContainerItem.container_id == c.id).delete()
            c.status = "IN_PROGRESS"
            c.current_weight_kg = 0.0
            c.utilized_capacity = 0.0
            db.commit()
    finally:
        db.close()


def test_scan_product_success_and_quantity_increment():
    # 1. Scan product first time
    response = client.post(
        "/api/v1/containers/1001/products/scan",
        json={"barcode": "8901063139374"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Product added to container" in data["message"]
    assert data["container_id"] == "1001"
    assert data["product"]["product_id"] == "1005"
    assert data["product"]["product_name"] == "Copper Wire"
    assert data["product"]["sku"] == "SKU-0015"
    assert data["product"]["barcode"] == "8901063139374"
    assert data["product"]["quantity"] == 1
    assert data["product"]["unit_weight"] == 0.5
    assert data["product"]["total_weight"] == 0.5

    # 2. Scan same product second time -> increments quantity to 2
    response2 = client.post(
        "/api/v1/containers/1001/products/scan",
        json={"barcode": "8901063139374"}
    )
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["success"] is True
    assert data2["product"]["quantity"] == 2
    assert data2["product"]["total_weight"] == 1.0


def test_scan_product_by_container_number():
    # Scan using container_number CNT-ALPHA-881
    response = client.post(
        "/api/containers/CNT-ALPHA-881/products/scan",
        json={"barcode": "8901063139374"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["product"]["quantity"] == 1


def test_get_container_reflects_scanned_products():
    # Scan a product
    scan_resp = client.post(
        "/api/v1/containers/1001/products/scan",
        json={"barcode": "8901063139374"}
    )
    assert scan_resp.status_code == 200

    # Retrieve container via GET /api/v1/containers/{container_id}
    get_resp = client.get("/api/v1/containers/1001")
    assert get_resp.status_code == 200
    c_data = get_resp.json()

    assert c_data["id"] == "1001"
    assert c_data["containerNumber"] == "CNT-ALPHA-881"
    assert c_data["currentWeightKg"] == 0.5
    assert len(c_data["items"]) == 1
    assert c_data["items"][0]["productName"] == "Copper Wire"
    assert c_data["items"][0]["barcode"] == "8901063139374"
    assert c_data["items"][0]["quantity"] == 1

    # Check products field is also populated
    assert "products" in c_data
    assert len(c_data["products"]) == 1
    assert c_data["products"][0]["productName"] == "Copper Wire"


def test_get_container_products_list():
    client.post(
        "/api/v1/containers/1001/products/scan",
        json={"barcode": "8901063139374"}
    )
    resp = client.get("/api/v1/containers/1001/products")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) == 1
    assert items[0]["product_name"] == "Copper Wire"
    assert items[0]["barcode"] == "8901063139374"
    assert items[0]["quantity"] == 1


def test_delete_container_product():
    # Scan product first
    client.post(
        "/api/v1/containers/1001/products/scan",
        json={"barcode": "8901063139374"}
    )

    # Delete product
    del_resp = client.delete("/api/v1/containers/1001/products/1005")
    assert del_resp.status_code == 200
    data = del_resp.json()
    assert data["success"] is True

    # Verify container items are now empty and weight is 0
    get_resp = client.get("/api/v1/containers/1001")
    assert get_resp.status_code == 200
    assert len(get_resp.json()["items"]) == 0
    assert get_resp.json()["currentWeightKg"] == 0.0


def test_scan_unknown_barcode_returns_404():
    response = client.post(
        "/api/v1/containers/1001/products/scan",
        json={"barcode": "UNKNOWN-BARCODE-99999"}
    )
    assert response.status_code == 404
    assert "Barcode not found in product master" in response.json()["detail"]


def test_scan_closed_or_sealed_container_returns_409():
    db = SessionLocal()
    try:
        c = db.query(Container).filter(Container.id == "1001").first()
        c.status = "Sealed"
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/v1/containers/1001/products/scan",
        json={"barcode": "8901063139374"}
    )
    assert response.status_code == 409
    assert "Container is not open for scanning" in response.json()["detail"]
