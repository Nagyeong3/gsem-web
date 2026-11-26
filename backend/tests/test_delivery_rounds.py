"""Contract tests for the read-only delivery-round SQL layer."""
import importlib
from datetime import date

from fastapi.testclient import TestClient

from backend.app.main import create_app

module = importlib.import_module("backend.app.api.delivery_rounds")
calendar_module = importlib.import_module("backend.app.api.delivery_calendar")


class FakeCursor:
    def __init__(self):
        self.statements = []
        self.rows = []

    def execute(self, sql, *params):
        self.statements.append((sql, params))
        self.rows = []
        if "AS item_name," in sql and "SELECT DISTINCT" in sql:
            self.rows = [
                {"item_name": "유압 시험장비", "item_number": "A-001"},
                {"item_name": "유압 시험장비", "item_number": "A-002"},
                {"item_name": None, "item_number": "A-002"},
                {"item_name": "", "item_number": None},
            ]
        if "SELECT m.match_id, i.item_id" in sql:
            item = {
                "match_id": 2, "item_id": 3, "item_num": "A-001", "item_name_kor": "시연 품목",
                "quantity": 1, "date_receiving_expect": None, "date_receiving": None,
                "date_deliver": None, "price_contract": None, "purchase_request_Number": None,
                "purchase_order_Number": None, "vendor_name": None, "buyer_name": None,
            }
            self.rows = [
                {**item, "kai_part_number": " KAI-DEMO-01 ", "date_receiving_warranty": date(2027, 8, 1),
                 "date_deliver_warranty": date(2027, 8, 12)},
                {**item, "match_id": 3, "kai_part_number": None, "date_receiving_warranty": None,
                 "date_deliver_warranty": None},
            ]
        if "AS item_count" in sql:
            self.rows = [{
                "sub_contract_id": 41, "business_id": 1, "biz_name": "가 사업",
                "delivery_dest_name": "가 부대", "sub_contract_name": "1차",
                "delivery_date_contract": None, "item_count": 2, "point_count": 8,
                "pr_count": 3, "po_count": 2, "received_count": 2,
                "delivered_count": 1, "delivered_quantity": 4, "latest_delivered_at": None,
                "delivery_completed": False, "delivery_amount": 16000,
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
        "NOT EXISTS (", "pending.date_deliver IS NULL",
        "SUM(m.price_contract * m.[count])",
        "HAVING COUNT(m.match_id) > 0",
    ):
        assert expr in sql
    assert params == (
        "가 조달원", 1, 2, "가 부대",
        __import__("datetime").date(2026, 1, 1),
        __import__("datetime").date(2026, 12, 31),
    )
    assert "? IS NULL" not in sql
    assert "CONVERT(date, sc.delivery_date_contract) <= ?" in sql
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
    assert "LTRIM(RTRIM(vf.vendor_name)) IN (?, ?)" in sql
    assert "LTRIM(RTRIM(sc.delivery_dest_name)) IN (?, ?)" in sql
    assert params[:5] == ("가 조달원", "나 조달원", 1, "가 부대", "나 부대")

    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds/41/items", params=[
            ("businessId", "1"), ("vendors", "가 조달원"), ("vendors", "나 조달원"),
        ])
    assert response.status_code == 200, response.text
    detail_sql, detail_params = conn.cursor_instance.statements[-1]
    assert "LTRIM(RTRIM(v.vendor_name)) IN (?, ?)" in detail_sql
    assert detail_params == (41, 1, "가 조달원", "나 조달원")
    assert "LEFT JOIN dbo.SERD_Info AS si ON si.serd_info_id = i.serd_info_id" in detail_sql
    populated, missing = response.json()["items"]
    assert (populated["kaiPartNumber"], populated["receivingWarrantyDate"], populated["deliveryWarrantyDate"]) == (
        "KAI-DEMO-01", "2027-08-01", "2027-08-12",
    )
    assert (missing["kaiPartNumber"], missing["receivingWarrantyDate"], missing["deliveryWarrantyDate"]) == (
        None, None, None,
    )


def test_filter_options_normalize_whitespace(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds/filter-options", params=[("businessIds", "1")])
    assert response.status_code == 200, response.text
    statements = conn.cursor_instance.statements
    assert len(statements) == 3
    assert response.json()["itemNames"] == ["유압 시험장비"]
    assert response.json()["itemNumbers"] == ["A-001", "A-002"]
    assert "JOIN Item i ON i.item_id = m.item_id" in statements[2][0]
    assert "c.business_id IN (?)" in statements[2][0]
    assert statements[2][1] == (1,)
    assert "LTRIM(RTRIM(sc.delivery_dest_name)) AS name" in statements[0][0]
    assert "LTRIM(RTRIM(v.vendor_name)) AS name" in statements[1][0]
    assert "ORDER BY name" in statements[0][0]
    assert conn.closed


def test_end_date_only_includes_datetime_and_has_one_parameter(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds", params={
            "businessIds": 1, "dateTo": "2026-12-31",
        })
    assert response.status_code == 200, response.text
    sql, params = conn.cursor_instance.statements[0]
    assert "CONVERT(date, sc.delivery_date_contract) <= ?" in sql
    assert "date_from_clause" not in sql
    assert "? IS NULL" not in sql
    assert params == (1, __import__("datetime").date(2026, 12, 31))


def test_round_items_exposes_pr_po_values(monkeypatch):
    class DetailCursor(FakeCursor):
        def execute(self, sql, *params):
            super().execute(sql, *params)
            self.rows = [{
                "match_id": 100, "item_id": 7, "item_num": "DEMO-007", "item_name_kor": "시연 품목",
                "quantity": 1, "date_receiving_expect": None, "date_receiving": None,
                "date_deliver": None, "price_contract": 1500,
                "kai_part_number": None, "date_receiving_warranty": None, "date_deliver_warranty": None,
                "purchase_request_Number": "PR-42", "purchase_order_Number": "PO-42",
                "vendor_name": "가 조달원", "buyer_name": "김책임",
            }]
            return self

    conn = FakeConnection()
    conn.cursor_instance = DetailCursor()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds/41/items", params={"businessId": 1})
    assert response.status_code == 200, response.text
    row = response.json()["items"][0]
    assert row["purchaseRequestNumber"] == "PR-42"
    assert row["purchaseOrderNumber"] == "PO-42"
    assert "m.purchase_request_Number" in conn.cursor_instance.statements[0][0]
    assert "m.purchase_order_Number" in conn.cursor_instance.statements[0][0]


def test_calendar_events_query_independent_dates_and_item_rows(monkeypatch):
    from datetime import date

    conn = FakeConnection()
    monkeypatch.setattr(calendar_module, '_connect', lambda: conn)
    monkeypatch.setattr(calendar_module, '_setting', lambda *_args: 'sqlserver')
    monkeypatch.setattr(calendar_module, '_rows', lambda cursor: [{
        'sub_contract_id': 41, 'business_id': 1, 'biz_name': '가 사업',
        'sub_contract_name': '1차', 'delivery_dest_name': '가 부대',
        'event_date': date(2026, 11, 12), 'event_type': 'receiving',
        'match_id': 21, 'item_id': 8, 'item_num': 'DEMO-008',
        'item_name_kor': '시연 품목 8', 'quantity': 3,
        'delivery_completed': False,
    }])
    with TestClient(create_app()) as client:
        result = client.get('/api/v1/delivery-calendar/events', params=[
            ('businessIds', '1'), ('businessIds', '2'),
            ('dateFrom', '2026-11-01'), ('dateTo', '2026-11-30'),
        ])
    assert result.status_code == 200, result.text
    event = result.json()['items'][0]
    assert event['type'] == 'receiving'
    assert event['date'] == '2026-11-12'
    assert event['id'] == 'receiving-21'
    assert event['itemNumber'] == 'DEMO-008'
    sql, params = conn.cursor_instance.statements[0]
    assert sql.count('UNION ALL') == 2
    assert 'sc.delivery_date_contract >= ?' in sql
    assert 'm.date_receiving_expect >= ?' in sql
    assert 'm.date_deliver >= ?' in sql
    assert sql.count('c.business_id IN (?, ?)') == 3
    assert params == (1, 2, date(2026, 11, 1), date(2026, 11, 30)) * 3
    assert conn.closed


def test_calendar_round_only_avoids_item_queries_and_context(monkeypatch):
    from datetime import date

    conn = FakeConnection()
    monkeypatch.setattr(calendar_module, '_connect', lambda: conn)
    monkeypatch.setattr(calendar_module, '_setting', lambda *_args: 'sqlserver')
    monkeypatch.setattr(calendar_module, '_rows', lambda cursor: [{
        'sub_contract_id': 41, 'business_id': 1, 'biz_name': '가 사업',
        'sub_contract_name': '1차', 'delivery_dest_name': '가 부대',
        'event_date': date(2026, 11, 12), 'event_type': 'contract',
        'match_id': None, 'item_id': None, 'item_num': None,
        'item_name_kor': None, 'quantity': None, 'delivery_completed': False,
    }])
    with TestClient(create_app()) as client:
        response = client.get('/api/v1/delivery-calendar/events', params={
            'businessIds': 1, 'dateFrom': '2026-11-01', 'dateTo': '2026-11-30',
            'roundOnly': 'true', 'includeDetails': 'true', 'includeReceived': 'true',
        })
    assert response.status_code == 200, response.text
    assert response.json()['items'][0]['id'] == 'contract-41'
    assert 'roundContexts' not in response.json()
    assert len(conn.cursor_instance.statements) == 1
    sql, params = conn.cursor_instance.statements[0]
    assert 'UNION ALL' not in sql
    assert 'm.date_receiving_expect' not in sql
    assert 'sc.delivery_date_contract >= ?' in sql
    assert params == (1, date(2026, 11, 1), date(2026, 11, 30))
    assert conn.closed


def test_calendar_events_validates_range():
    with TestClient(create_app()) as client:
        assert client.get('/api/v1/delivery-calendar/events', params={
            'businessIds': 1, 'dateFrom': '2026-11-30', 'dateTo': '2026-11-01',
        }).status_code == 422
        assert client.get('/api/v1/delivery-calendar/events', params={
            'businessIds': 1, 'dateFrom': '2026-01-01', 'dateTo': '2026-12-31',
        }).status_code == 422


def test_combined_item_filters_use_same_matched_lines_for_all_totals(monkeypatch):
    """A vendor/name/number match must exclude other items in the same round."""
    conn = FakeConnection()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    monkeypatch.setattr(module, "_date", lambda value: value)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds", params=[
            ("businessIds", "1"), ("vendors", "가 조달원"), ("vendors", "나 조달원"),
            ("itemName", "유압%"), ("itemNumber", "ABC_1"),
        ])
    assert response.status_code == 200, response.text
    sql, params = conn.cursor_instance.statements[0]
    assert "HAVING COUNT(m.match_id) > 0" in sql
    assert "EXISTS (SELECT 1 FROM Vendor AS vf" in sql
    assert "EXISTS (SELECT 1 FROM Item AS fi" in sql
    assert "EXISTS (SELECT 1 FROM Item AS fn" in sql
    assert "fi.item_name_kor LIKE ? ESCAPE '~'" in sql
    assert "fn.item_num LIKE ? ESCAPE '~'" in sql
    assert params == ("가 조달원", "나 조달원", "%유압~%%", "%ABC~_1%", 1)
    assert "COUNT(DISTINCT m.item_id)" in sql
    assert "SUM(m.[count])" in sql
    assert "SUM(m.price_contract * m.[count])" in sql
    # A filtered subtotal must not silently change whole-round completion status.
    assert "pending.date_deliver IS NULL" in sql


def test_item_name_only_excludes_rounds_without_matching_items(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds", params={
            "businessIds": 1, "itemName": "시연", "itemNumber": " "
        })
    assert response.status_code == 200
    sql, params = conn.cursor_instance.statements[0]
    assert "HAVING COUNT(m.match_id) > 0" in sql
    assert params == ("%시연%", 1)


def test_unfiltered_rounds_preserve_empty_rounds_but_never_mark_them_complete(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(module, "_connect", lambda: conn)
    monkeypatch.setattr(module, "_setting", lambda *_args: "sqlserver")
    monkeypatch.setattr(module, "_rows", lambda cursor: cursor.rows)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/delivery-rounds", params={"businessIds": 1})
    assert response.status_code == 200
    sql, params = conn.cursor_instance.statements[0]
    assert "HAVING COUNT(m.match_id) > 0" not in sql
    assert "pending.date_deliver IS NULL" in sql
    assert params == (1,)
