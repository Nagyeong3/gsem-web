from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request

from backend.app.core.errors import ApiError
from backend.app.services.gsem_service import ALLOWED_SORT_FIELDS, GsemService


def generated_at() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def request_id(request: Request) -> str:
    return request.state.request_id


def success(data: Any, request: Request) -> dict[str, Any]:
    return {"data": data, "meta": {"generatedAt": generated_at(), "requestId": request_id(request)}}


def paged(result: dict[str, Any], request: Request) -> dict[str, Any]:
    return {**result, "meta": {"generatedAt": generated_at(), "requestId": request_id(request)}}


def validate_sort(sort: str) -> str:
    parts = sort.split(",")
    if len(parts) != 2 or parts[0] not in ALLOWED_SORT_FIELDS or parts[1] not in {"asc", "desc"}:
        raise ApiError(
            400,
            "INVALID_REQUEST",
            "요청 조건을 확인해주세요.",
            [{"field": "sort", "reason": "지원하는 정렬 형식을 사용해야 합니다."}],
        )
    return sort


def create_api_router(service: GsemService) -> APIRouter:
    router = APIRouter()
    get_service = lambda: service  # noqa: E731
    service_dependency = Annotated[GsemService, Depends(get_service)]
    page_query = Annotated[int, Query(ge=1)]
    size_query = Annotated[int, Query(ge=1, le=100)]
    text_query = Annotated[str | None, Query(max_length=100)]

    @router.get("/dashboard/overview")
    def dashboard(request: Request, current: service_dependency) -> dict[str, Any]:
        return success(current.get_dashboard_overview(), request)

    @router.get("/items/filter-options")
    def filter_options(request: Request, current: service_dependency) -> dict[str, Any]:
        return success(current.get_filter_options(), request)

    @router.get("/items")
    def items(
        request: Request,
        current: service_dependency,
        query: text_query = None,
        item_type: Annotated[str | None, Query(alias="itemType")] = None,
        aircraft_type_code: Annotated[str | None, Query(alias="aircraftTypeCode")] = None,
        business_id: Annotated[int | None, Query(alias="businessId", ge=1)] = None,
        subsystem_code: Annotated[str | None, Query(alias="subsystemCode")] = None,
        category_code: Annotated[str | None, Query(alias="categoryCode")] = None,
        manager_user_id: Annotated[int | None, Query(alias="managerUserId", ge=1)] = None,
        destination_id: Annotated[int | None, Query(alias="destinationId", ge=1)] = None,
        status: str | None = None,
        sort: str = "recentChangeDate,desc",
        page: page_query = 1,
        size: size_query = 20,
    ) -> dict[str, Any]:
        result = current.search_items(
            {
                "query": query,
                "itemType": item_type,
                "aircraftTypeCode": aircraft_type_code,
                "businessId": business_id,
                "subsystemCode": subsystem_code,
                "categoryCode": category_code,
                "managerUserId": manager_user_id,
                "destinationId": destination_id,
                "status": status,
            },
            validate_sort(sort),
            page,
            size,
        )
        return paged(result, request)

    @router.get("/items/{item_id}/replacement-graph")
    def replacement_graph(item_id: int, request: Request, current: service_dependency) -> dict[str, Any]:
        graph = current.get_replacement_graph(item_id)
        if graph is None:
            raise ApiError(404, "ITEM_NOT_FOUND", "요청한 품목이 없습니다.")
        return success(graph, request)

    @router.get("/items/{item_id}")
    def item_detail(item_id: int, request: Request, current: service_dependency) -> dict[str, Any]:
        item = current.get_item_by_id(item_id)
        if item is None:
            raise ApiError(404, "ITEM_NOT_FOUND", "요청한 품목이 없습니다.")
        return success(item, request)

    @router.get("/deliveries")
    def deliveries(
        request: Request,
        current: service_dependency,
        query: text_query = None,
        business_id: Annotated[int | None, Query(alias="businessId", ge=1)] = None,
        aircraft_type_code: Annotated[str | None, Query(alias="aircraftTypeCode")] = None,
        destination_id: Annotated[int | None, Query(alias="destinationId", ge=1)] = None,
        status: str | None = None,
        from_date: Annotated[str | None, Query(alias="from")] = None,
        to_date: Annotated[str | None, Query(alias="to")] = None,
        page: page_query = 1,
        size: size_query = 20,
    ) -> dict[str, Any]:
        del from_date, to_date  # 날짜 범위 규칙은 미확정이며 기존 프로토타입과 동일하게 보존한다.
        return paged(
            current.search_deliveries(
                {
                    "query": query,
                    "businessId": business_id,
                    "aircraftTypeCode": aircraft_type_code,
                    "destinationId": destination_id,
                    "status": status,
                },
                page,
                size,
            ),
            request,
        )

    @router.get("/change-events")
    def change_events(
        request: Request,
        current: service_dependency,
        query: text_query = None,
        item_id: Annotated[int | None, Query(alias="itemId", ge=1)] = None,
        change_type: Annotated[str | None, Query(alias="changeType")] = None,
        status: str | None = None,
        requester_user_id: Annotated[int | None, Query(alias="requesterUserId", ge=1)] = None,
        from_date: Annotated[str | None, Query(alias="from")] = None,
        to_date: Annotated[str | None, Query(alias="to")] = None,
        page: page_query = 1,
        size: size_query = 20,
    ) -> dict[str, Any]:
        del from_date, to_date
        return paged(
            current.search_change_events(
                {
                    "query": query,
                    "itemId": item_id,
                    "changeType": change_type,
                    "status": status,
                    "requesterUserId": requester_user_id,
                },
                page,
                size,
            ),
            request,
        )

    return router
