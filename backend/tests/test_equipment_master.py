"""실제 SQL Server 연결 없이 읽기 전용 경계와 쿼리 전달을 검증한다."""
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from backend.app.api import equipment_master as master


@pytest.mark.parametrize("path", ["", "/businesses", "/filter-options", "/export"])
def test_memory_mode_does_not_connect_database(client: TestClient, monkeypatch, path: str) -> None:
    monkeypatch.setenv("GSEM_DATA_SOURCE", "memory")
    connect = Mock(side_effect=AssertionError("DB 연결 금지"))
    monkeypatch.setattr(master, "_connect", connect)
    response = client.get(f"/api/v1/equipment-master{path}")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
    connect.assert_not_called()


def test_master_search_binds_filters_and_pagination(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GSEM_DATA_SOURCE", "sqlserver")
    connection = Mock()
    cursor = connection.cursor.return_value
    cursor.execute.return_value = cursor
    cursor.fetchone.return_value = [0]
    monkeypatch.setattr(master, "_connect", lambda: connection)
    monkeypatch.setattr(master, "_rows", lambda _: [])
    term = "' OR 1=1 --"
    response = client.get("/api/v1/equipment-master", params={
        "query": term, "businessId": 2, "vendor": "가 업체", "buyer": "김책임", "page": 3, "size": 20,
    })
    assert response.status_code == 200
    assert response.json()["readOnly"] is True
    assert response.json()["items"] == []
    calls = cursor.execute.call_args_list
    assert calls[0].args[0] == master.COUNT_SQL
    assert calls[1].args[0] == master.BASE_SQL
    assert term not in calls[1].args[0]
    assert calls[1].args[1:] == (2, 2, term, f"%{term}%", f"%{term}%", "가 업체", "가 업체", "김책임", "김책임", 40, 20)
    connection.close.assert_called_once()


def test_master_closes_connection_on_database_error(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GSEM_DATA_SOURCE", "sqlserver")
    connection = Mock()
    connection.cursor.return_value.execute.side_effect = RuntimeError("fixture error")
    monkeypatch.setattr(master, "_connect", lambda: connection)
    response = client.get("/api/v1/equipment-master")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    connection.close.assert_called_once()
