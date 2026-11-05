"""Contract tests for the read-only delivery-round SQL layer."""
import importlib

from fastapi.testclient import TestClient

from backend.app.main import create_app

module = importlib.import_module("backend.app.api.delivery_rounds")


class FakeCursor:
    def __init__(self):
        self.statements = []
        self.rows = []

    def execute(self, sql, *params):
        self.statements.append((sql, params))
        self.rows = []
        if "AS item_count" in sql:
            self.rows = [{
                "sub_contract_id": 41, "business_id": 1, "biz_name": "가 사업",
                "delivery_dest_name": "가 부대", "sub_contract_name": "1차",
                "delivery_date_contract": None, "item_count": 2, "point_count": 8,
                "pr_count": 3, "po_count": 2, "received_count": 2,
                "delivered_count": 1, "delivery_completed": False, "delivery_amount": 16000,
            }]
        return self


class FakeConnection:
    def __init__(self):
        self.cursor_instance = FakeCursor()
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def close(self):
        self.closed = True


def test_delivery_round_aggregates_and_vendor_params(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    monkeypatch.setattr(module, "_date", lambda value: value)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds", params=[
            ("businessIds", "1"), ("businessIds", "2"),
            ("vendor", "가 조달원"), ("destination", "가 부대"),
            ("dateFrom", "2026-01-01"), ("dateTo", "2026-12-31"),
        ])
    assert response.status_code == 200, response.text
    row = response.json()["items"][0]
    assert row["pointCount"] == 8
    assert row["prCount"] == 3
    assert row["poCount"] == 2
    assert row["deliveryCompleted"] is False
    assert row["deliveryAmount"] == 16000
    sql, params = conn.cursor_instance.statements[0]
    for expr in (
        "COUNT(DISTINCT m.item_id)", "SUM(m.[count])",
        "COUNT(m.purchase_request_Number)", "COUNT(m.purchase_order_Number)",
        "COUNT(m.date_receiving)", "COUNT(m.date_deliver)",
        "COUNT(m.item_id) = COUNT(m.date_deliver)",
        "SUM(m.price_contract * m.[count])",
        "HAVING COUNT(m.match_id) > 0",
    ):
        assert expr in sql
    assert params == (
        "가 조달원", 1, 2, "가 부대",
        __import__("datetime").date(2026, 1, 1), __import__("datetime").date(2026, 1, 1),
        __import__("datetime").date(2026, 12, 31), __import__("datetime").date(2026, 12, 31),
    )
    assert conn.closed


def test_delivery_round_rejects_reverse_dates():
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds", params={
            "businessIds": 1, "dateFrom": "2026-12-31", "dateTo": "2026-01-01",
        })
    assert response.status_code == 422


def test_delivery_round_requires_valid_business():
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds")
    assert response.status_code == 422

def test_multiple_vendor_and_destination_filters(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    monkeypatch.setattr(module, "_date", lambda value: value)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds", params=[
            ("businessIds", "1"),
            ("vendors", "가 조달원"), ("vendors", "나 조달원"),
            ("destinations", "가 부대"), ("destinations", "나 부대"),
        ])
    assert response.status_code == 200, response.text
    sql, params = conn.cursor_instance.statements[0]
    assert "vf.vendor_name IN (?, ?)" in sql
    assert "sc.delivery_dest_name IN (?, ?)" in sql
    assert params[:5] == ("가 조달원", "나 조달원", 1, "가 부대", "나 부대")

    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds/41/items", params=[
            ("businessId", "1"), ("vendors", "가 조달원"), ("vendors", "나 조달원"),
        ])
    assert response.status_code == 200, response.text
    detail_sql, detail_params = conn.cursor_instance.statements[-1]
    assert "v.vendor_name IN (?, ?)" in detail_sql
    assert detail_params == (41, 1, "가 조달원", "나 조달원")
