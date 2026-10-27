from fastapi.testclient import TestClient

EXPECTED_PATHS = {
    "/api/v1/dashboard/overview",
    "/api/v1/items/filter-options",
    "/api/v1/items",
    "/api/v1/items/{item_id}",
    "/api/v1/items/{item_id}/replacement-graph",
    "/api/v1/deliveries",
    "/api/v1/change-events",
    "/api/v1/equipment-master",
    "/api/v1/equipment-master/businesses",
    "/api/v1/equipment-master/filter-options",
    "/api/v1/equipment-master/export",
    "/api/v1/equipment-master/image/{item_id}",
}


def test_generated_openapi_contains_all_runtime_endpoints(client: TestClient) -> None:
    document = client.get("/openapi.json").json()
    runtime_paths = {path for path in document["paths"] if path.startswith("/api/v1")}
    assert runtime_paths == EXPECTED_PATHS
    assert all("get" in document["paths"][path] for path in runtime_paths)
