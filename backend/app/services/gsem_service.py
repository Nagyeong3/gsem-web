from typing import Any

from backend.app.repositories.base import GsemRepository

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

    @staticmethod
    def _has_code(values: list[dict[str, Any]], code: str) -> bool:
        return any(value["code"] == code for value in values)

    @staticmethod
    def _sort_value(item: dict[str, Any], field: str) -> Any:
        first_fields = {
            "aircraftType": ("aircraftTypes", "name"),
            "business": ("businesses", "name"),
            "subsystem": ("subsystems", "name"),
            "manager": ("managers", "name"),
            "destination": ("destinations", "name"),
        }
        if field in first_fields:
            collection, key = first_fields[field]
            return item.get(collection, [{}])[0].get(key, "") if item.get(collection) else ""
        if field == "category":
            return item.get("category", {}).get("name", "")
        return item.get(field, "")

    def search_items(self, filters: dict[str, Any], sort: str, page: int, size: int) -> dict[str, Any]:
        query = (filters.get("query") or "").strip().casefold()

        def matches(item: dict[str, Any]) -> bool:
            searchable = " ".join(
                str(item.get(key, ""))
                for key in ("itemNumber", "itemNameKor", "itemNameEng", "itemUsageKor", "itemUsageEng")
            ).casefold()
            return (
                (not query or query in searchable)
                and (not filters.get("itemType") or item["itemType"] == filters["itemType"])
                and (
                    not filters.get("aircraftTypeCode")
                    or self._has_code(item["aircraftTypes"], filters["aircraftTypeCode"])
                )
                and (
                    not filters.get("businessId")
                    or any(entry["businessId"] == filters["businessId"] for entry in item["businesses"])
                )
                and (not filters.get("subsystemCode") or self._has_code(item["subsystems"], filters["subsystemCode"]))
                and (not filters.get("categoryCode") or item["category"]["code"] == filters["categoryCode"])
                and (
                    not filters.get("managerUserId")
                    or any(entry["userId"] == filters["managerUserId"] for entry in item["managers"])
                )
                and (
                    not filters.get("destinationId")
                    or any(entry["destinationId"] == filters["destinationId"] for entry in item["destinations"])
                )
                and (not filters.get("status") or item["status"] == filters["status"])
            )

        field, direction = sort.split(",")
        values = [item for item in self.repository.get_items() if matches(item)]
        values.sort(key=lambda item: str(self._sort_value(item, field)), reverse=direction == "desc")
        return self._page([self.repository.to_item_summary(item) for item in values], page, size)

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
