from typing import Any

from backend.app.repositories.base import GsemRepository
from backend.app.repositories.search import ItemSearchCriteria, ItemSort

ALLOWED_SORT_FIELDS = {
    "itemNumber",
    "itemNameKor",
    "aircraftType",
    "business",
    "subsystem",
    "category",
    "manager",
    "destination",
    "status",
    "recentChangeDate",
}


class GsemService:
    def __init__(self, repository: GsemRepository) -> None:
        self.repository = repository

    def get_dashboard_overview(self) -> dict[str, Any]:
        return self.repository.get_dashboard_overview()

    def get_filter_options(self) -> dict[str, Any]:
        return self.repository.get_filter_options()

    def search_items(self, filters: dict[str, Any], sort: str, page: int, size: int) -> dict[str, Any]:
        field, direction = sort.split(",")
        criteria = ItemSearchCriteria(
            query=(filters.get("query") or "").strip(),
            item_type=filters.get("itemType"),
            aircraft_type_code=filters.get("aircraftTypeCode"),
            business_id=filters.get("businessId"),
            subsystem_code=filters.get("subsystemCode"),
            category_code=filters.get("categoryCode"),
            manager_user_id=filters.get("managerUserId"),
            destination_id=filters.get("destinationId"),
            status=filters.get("status"),
        )
        result = self.repository.search_items(
            criteria,
            ItemSort(field=field, direction="desc" if direction == "desc" else "asc"),
            page,
            size,
        )
        total_pages = 0 if result.total_elements == 0 else (result.total_elements + size - 1) // size
        return {
            "data": result.items,
            "page": {
                "page": page,
                "size": size,
                "totalElements": result.total_elements,
                "totalPages": total_pages,
            },
        }

    def get_item_by_id(self, item_id: int) -> dict[str, Any] | None:
        return self.repository.get_item_by_id(item_id)

    def search_deliveries(self, filters: dict[str, Any], page: int, size: int) -> dict[str, Any]:
        query = (filters.get("query") or "").strip().casefold()
        values = []
        for delivery in self.repository.get_delivery_schedules():
            searchable = " ".join(
                (
                    delivery["item"]["itemNumber"],
                    delivery["item"]["itemName"],
                    delivery["business"]["name"],
                    delivery["destination"]["name"],
                )
            ).casefold()
            if (
                (not query or query in searchable)
                and (not filters.get("businessId") or delivery["business"]["businessId"] == filters["businessId"])
                and (
                    not filters.get("aircraftTypeCode")
                    or delivery["aircraftType"]["code"] == filters["aircraftTypeCode"]
                )
                and (
                    not filters.get("destinationId") or int(delivery["destination"]["code"]) == filters["destinationId"]
                )
                and (not filters.get("status") or delivery["status"] == filters["status"])
            ):
                values.append(delivery)
        return self._page(values, page, size)

    def search_change_events(self, filters: dict[str, Any], page: int, size: int) -> dict[str, Any]:
        query = (filters.get("query") or "").strip().casefold()
        values = []
        for event in self.repository.get_change_events():
            searchable = " ".join(
                (event["changeId"], event["item"]["itemNumber"], event["item"]["itemName"], event["changeType"])
            ).casefold()
            if (
                (not query or query in searchable)
                and (not filters.get("itemId") or event["item"]["itemId"] == filters["itemId"])
                and (not filters.get("changeType") or event["changeType"] == filters["changeType"])
                and (not filters.get("status") or event["status"] == filters["status"])
                and (not filters.get("requesterUserId") or event["requestedBy"]["userId"] == filters["requesterUserId"])
            ):
                values.append(event)
        return self._page(values, page, size)

    def get_replacement_graph(self, root_item_id: int) -> dict[str, Any] | None:
        return self.repository.get_replacement_graph(root_item_id)

    @staticmethod
    def _page(values: list[dict[str, Any]], page: int, size: int) -> dict[str, Any]:
        total = len(values)
        total_pages = 0 if total == 0 else (total + size - 1) // size
        start = (page - 1) * size
        return {
            "data": values[start : start + size],
            "page": {
                "page": page,
                "size": size,
                "totalElements": total,
                "totalPages": total_pages,
            },
        }
