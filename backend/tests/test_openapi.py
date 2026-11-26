from fastapi.testclient import TestClient

EXPECTED_PATHS = {
    "/api/v1/dashboard/overview",
    "/api/v1/items/filter-options",
    "/api/v1/items",
    "/api/v1/items/{item_id}",
    "/api/v1/items/{item_id}/replacement-graph",
    "/api/v1/deliveries",
    "/api/v1/change-events",
    "/api/v1/equipment-search",
    "/api/v1/equipment-search/filter-options",
    "/api/v1/equipment-search/suggestions",
    "/api/v1/equipment-search/batch",
    "/api/v1/equipment-search/{item_id}",
    "/api/v1/equipment-master",
    "/api/v1/equipment-master/businesses",
    "/api/v1/equipment-master/filter-options",
    "/api/v1/equipment-master/export",
    "/api/v1/equipment-master/image/{item_id}",
    "/api/v1/delivery-calendar/events",
    "/api/v1/delivery-rounds",
    "/api/v1/delivery-rounds/filter-options",
    "/api/v1/delivery-rounds/{sub_contract_id}/items",
}


def test_generated_openapi_contains_all_runtime_endpoints(client: TestClient) -> None:
    document = client.get("/openapi.json").json()
    runtime_paths = {path for path in document["paths"] if path.startswith("/api/v1")}
    assert runtime_paths == EXPECTED_PATHS
    assert all(("post" if path.endswith("/batch") else "get") in document["paths"][path] for path in runtime_paths)


def test_delivery_calendar_route_registered_but_db_unavailable_is_not_404(client: TestClient) -> None:
    response = client.get(
        "/api/v1/delivery-calendar/events",
        params={"dateFrom": "2026-11-01", "dateTo": "2026-11-30", "businessIds": 101},
    )
    # A missing endpoint returns 404; an existing endpoint with no SQL server returns 503.
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SERVICE_UNAVAILABLE"
    assert "SQL Server" in response.json()["error"]["message"]
