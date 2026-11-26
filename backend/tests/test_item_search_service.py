from typing import Any

from backend.app.repositories.search import ItemSearchCriteria, ItemSearchPage, ItemSort
from backend.app.services.gsem_service import GsemService


class SearchRecordingRepository:
    def __init__(self) -> None:
        self.call: tuple[ItemSearchCriteria, ItemSort, int, int] | None = None

    def search_items(
        self,
        criteria: ItemSearchCriteria,
        sort: ItemSort,
        page: int,
        size: int,
    ) -> ItemSearchPage:
        self.call = (criteria, sort, page, size)
        return ItemSearchPage(items=[{"itemId": 21, "itemNumber": "XXXXXX-21"}], total_elements=23)

    def get_dashboard_overview(self) -> dict[str, Any]:
        raise AssertionError("품목 검색 중 호출되면 안 됩니다.")

    def get_filter_options(self) -> dict[str, Any]:
        raise AssertionError("품목 검색 중 호출되면 안 됩니다.")

    def get_item_by_id(self, item_id: int) -> dict[str, Any] | None:
        raise AssertionError("품목 검색 중 호출되면 안 됩니다.")

    def get_delivery_schedules(self) -> list[dict[str, Any]]:
        raise AssertionError("품목 검색 중 호출되면 안 됩니다.")

    def get_change_events(self) -> list[dict[str, Any]]:
        raise AssertionError("품목 검색 중 호출되면 안 됩니다.")

    def get_replacement_graph(self, root_item_id: int) -> dict[str, Any] | None:
        raise AssertionError("품목 검색 중 호출되면 안 됩니다.")


def test_service_delegates_item_search_to_repository() -> None:
    repository = SearchRecordingRepository()
    service = GsemService(repository)

    response = service.search_items(
        {
            "query": "  A장비  ",
            "itemType": "SUPPORT_EQUIPMENT",
            "businessId": 2,
            "managerUserId": 1,
        },
        "recentChangeDate,desc",
        page=3,
        size=10,
    )

    assert repository.call == (
        ItemSearchCriteria(
            query="A장비",
            item_type="SUPPORT_EQUIPMENT",
            business_id=2,
            manager_user_id=1,
        ),
        ItemSort(field="recentChangeDate", direction="desc"),
        3,
        10,
    )
    assert response == {
        "data": [{"itemId": 21, "itemNumber": "XXXXXX-21"}],
        "page": {"page": 3, "size": 10, "totalElements": 23, "totalPages": 3},
    }
