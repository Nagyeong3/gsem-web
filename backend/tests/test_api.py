from fastapi.testclient import TestClient


def test_health_and_request_id(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "test-request-1"})
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "dataSource": "memory", "requestId": "test-request-1"}
    assert response.headers["X-Request-ID"] == "test-request-1"
    assert response.headers["Cache-Control"] == "no-store"


def test_dashboard_metric_integrity(client: TestClient) -> None:
    data = client.get("/api/v1/dashboard/overview").json()["data"]
    metrics = {metric["id"]: metric["value"] for metric in data["metrics"]}
    assert metrics["ATTENTION"] == 12
    assert metrics["ATTENTION"] == metrics["DELAY"] + metrics["REPLACEMENT"] + metrics["APPROVAL"]
    assert len(data["monthlyDeliveries"]) == 12


def test_item_filter_sort_page_and_detail(client: TestClient) -> None:
    response = client.get(
        "/api/v1/items",
        params={
            "businessId": 2,
            "sort": "itemNumber,asc",
            "page": 1,
            "size": 2,
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["page"]["totalElements"] == 4
    assert len(body["data"]) == 2
    assert body["data"][0]["itemNumber"] < body["data"][1]["itemNumber"]

    detail = client.get("/api/v1/items/1").json()["data"]
    assert [entry["name"] for entry in detail["businesses"]] == ["가 사업", "나 사업"]
    assert [entry["name"] for entry in detail["managers"]] == ["김책임", "이선임"]


def test_empty_result_and_not_found(client: TestClient) -> None:
    body = client.get("/api/v1/items", params={"query": "존재하지 않는 품목"}).json()
    assert body["data"] == []
    assert body["page"]["totalElements"] == 0
    assert body["page"]["totalPages"] == 0
    not_found = client.get("/api/v1/items/999")
    assert not_found.status_code == 404
    assert not_found.json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_delivery_change_and_graph(client: TestClient) -> None:
    deliveries = client.get("/api/v1/deliveries", params={"businessId": 1, "status": "IN_PROGRESS"}).json()["data"]
    assert deliveries
    assert all(entry["business"]["name"] == "가 사업" and entry["status"] == "IN_PROGRESS" for entry in deliveries)

    changes = client.get("/api/v1/change-events", params={"status": "PROCESSED", "requesterUserId": 1}).json()["data"]
    assert len(changes) == 2
    graph = client.get("/api/v1/items/1/replacement-graph").json()["data"]
    assert len(graph["nodes"]) == 12
    assert len(graph["edges"]) == 12


def test_common_validation_and_method_errors(client: TestClient) -> None:
    invalid = client.get("/api/v1/items", params={"page": 0, "sort": "unknown,up"})
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "INVALID_REQUEST"
    method = client.post("/api/v1/items")
    assert method.status_code == 405
    assert method.json()["error"]["code"] == "METHOD_NOT_ALLOWED"
