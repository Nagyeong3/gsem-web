"""실제 생성 SQL을 시연 DB에서 실행해 필터와 집계의 일관성을 검증한다."""
import importlib
import sqlite3
from datetime import date

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app

module = importlib.import_module("backend.app.api.delivery_rounds")


@pytest.fixture
def sql_client(monkeypatch):
    db = sqlite3.connect(":memory:", check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.executescript("""
    CREATE TABLE Business(business_id INT, biz_name TEXT);
    CREATE TABLE Contract(contract_id INT, business_id INT);
    CREATE TABLE Sub_Contract(sub_contract_id INT, contract_id INT, delivery_dest_name TEXT,
                             sub_contract_name TEXT, delivery_date_contract TEXT);
    CREATE TABLE Vendor(vendor_id INT, vendor_name TEXT);
    CREATE TABLE Item(item_id INT, item_name_kor TEXT, item_num TEXT);
    CREATE TABLE Match_Sub_Contract_Item(match_id INT, sub_contract_id INT, item_id INT, vendor_id INT,
        count INT, price_contract REAL, purchase_request_Number TEXT, purchase_order_Number TEXT,
        date_receiving TEXT, date_deliver TEXT);
    INSERT INTO Business VALUES (1, 'DEMO');
    INSERT INTO Contract VALUES (1, 1);
    INSERT INTO Sub_Contract VALUES (41, 1, 'DEST', '1', NULL);
    INSERT INTO Vendor VALUES (1, 'V1'), (2, 'V2');
    INSERT INTO Item VALUES (1, 'Pump', 'A-001'), (2, 'Pump extra', 'A-001-X'),
                           (3, 'Hose', 'B-001'), (4, 'Literal%_part', 'C-001');
    INSERT INTO Match_Sub_Contract_Item VALUES
      (1, 41, 1, 1, 2, 100, 'PR1', 'PO1', '2026-01-01', '2026-01-02'),
      (2, 41, 2, 1, 5, 300, NULL, NULL, NULL, NULL),
      (3, 41, 3, 2, 3, 200, 'PR3', NULL, NULL, NULL),
      (4, 41, 4, 1, 1, 400, 'PR4', NULL, NULL, NULL);
    """)

    class Cursor:
        def execute(self, sql, *params):
            self.rows = [dict(row) for row in db.execute(sql, params)]
            for row in self.rows:
                if row.get("latest_delivered_at"):
                    row["latest_delivered_at"] = date.fromisoformat(row["latest_delivered_at"])
            return self

    class Connection:
        def cursor(self):
            return Cursor()

        def close(self):
            pass

    monkeypatch.setattr(module, "_connect", Connection)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    with TestClient(create_app()) as client:
        yield client
    db.close()


@pytest.mark.parametrize(("params", "count", "points", "amount"), [
    ([("itemNames", "Pump")], 1, 2, 200),
    ([("itemNames", "Pump"), ("itemNameTerms", "Hose")], 2, 5, 800),
    ([("itemNumbers", "A-001"), ("itemNumbers", "B-001")], 2, 5, 800),
    ([("itemNameTerms", "Pump"), ("itemNumbers", "A-001")], 1, 2, 200),
    ([("itemNameTerms", "Pump"), ("itemNameTerms", "Hose"), ("vendors", "V2")], 1, 3, 600),
    ([("itemNameTerms", "%_")], 1, 1, 400),
    ([("itemName", "Pump")], 2, 7, 1700),
    ([("itemNames", " Pump "), ("itemNames", "Pump")], 1, 2, 200),
])
def test_filtered_totals(sql_client, params, count, points, amount):
    response = sql_client.get("/api/v1/delivery-rounds", params=[("businessIds", 1), *params])
    assert response.status_code == 200, response.text
    [row] = response.json()["items"]
    assert (row["itemCount"], row["pointCount"], row["deliveryAmount"]) == (count, points, amount)
    # 전체 차수에 미납품이 남아 있으면 일부 품목 필터로 완료 상태가 바뀌지 않는다.
    assert row["deliveryCompleted"] is False


def test_different_filters_must_match_the_same_item(sql_client):
    response = sql_client.get("/api/v1/delivery-rounds", params=[
        ("businessIds", 1), ("itemNames", "Pump"), ("itemNumbers", "B-001"),
    ])
    assert response.status_code == 200
    assert response.json()["items"] == []


@pytest.mark.parametrize("params", [
    [("itemNames", "x" * 201)],
    [("itemNumberTerms", str(index)) for index in range(101)],
])
def test_oversized_item_filters_are_rejected(sql_client, params):
    assert sql_client.get("/api/v1/delivery-rounds", params=[("businessIds", 1), *params]).status_code == 422


@pytest.mark.parametrize(("item_number", "quantity", "latest"), [
    ("A-001", 2, "2026-01-02"),
    ("A-001-X", 0, None),
])
def test_filtered_delivery_quantity_and_date(sql_client, item_number, quantity, latest):
    response = sql_client.get("/api/v1/delivery-rounds", params={
        "businessIds": 1, "itemNumbers": item_number,
    })
    assert response.status_code == 200, response.text
    [row] = response.json()["items"]
    assert row["deliveredQuantity"] == quantity
    assert row["latestDeliveredAt"] == latest
