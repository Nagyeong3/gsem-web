import json
from copy import deepcopy
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from backend.app.repositories.search import ItemSearchCriteria, ItemSearchPage, ItemSort


class InMemoryGsemRepository:
    """일반화한 목업 데이터만 사용하는 프로토타입 Repository."""

    def __init__(self, data_path: Path | None = None, data: dict[str, Any] | None = None) -> None:
        if data is not None:
            self._data = deepcopy(data)
            return
        source = data_path or Path(__file__).parents[1] / "data" / "mock_data.json"
        self._data: dict[str, Any] = json.loads(source.read_text(encoding="utf-8"))

    def get_dashboard_overview(self) -> dict[str, Any]:
        today = datetime.now(ZoneInfo("Asia/Seoul")).date()
        recent_dates = [(today - timedelta(days=offset)).isoformat() for offset in range(1, 5)]
        first_items = self._data["itemDetails"][:4]
        return {
            "metrics": [
                {
                    "id": "ATTENTION",
                    "label": "확인이 필요한 업무",
                    "value": 12,
                    "unit": "건",
                    "tone": "BRAND",
                    "helper": "업무를 확인하고 빠르게 처리해주세요.",
                },
                {
                    "id": "REGISTERED",
                    "label": "전체 등록 품목",
                    "value": 2346,
                    "unit": "품목",
                    "tone": "NEUTRAL",
                    "helper": "통합 관리 대상",
                },
                {
                    "id": "DELIVERY",
                    "label": "이번 달 납품 예정",
                    "value": 84,
                    "unit": "건",
                    "tone": "INFO",
                    "helper": "프로토타입 목업 기준",
                },
                {"id": "DELAY", "label": "납품 지연", "value": 3, "unit": "건", "tone": "ERROR", "helper": "확인 필요"},
                {
                    "id": "REPLACEMENT",
                    "label": "단종·대체 검토",
                    "value": 5,
                    "unit": "건",
                    "tone": "WARNING",
                    "helper": "검토 필요",
                },
                {
                    "id": "APPROVAL",
                    "label": "변경 승인 대기",
                    "value": 4,
                    "unit": "건",
                    "tone": "INFO",
                    "helper": "승인 대기",
                },
            ],
            "monthlyDeliveries": [
                {
                    "month": f"{index + 1}월",
                    "plannedQuantity": 80 + index * 5,
                    "deliveredQuantity": 78 + index * 5 if index < 6 else None,
                    "achievementRate": 98 if index < 6 else None,
                }
                for index in range(12)
            ],
            "recentChanges": [
                {
                    "changeId": f"CHG-XXXXX-{index + 1:02d}",
                    "itemId": item["itemId"],
                    "itemName": item["itemNameKor"],
                    "content": "구성 변경" if index == 2 else "사양 변경",
                    "category": "구성 변경" if index == 2 else "설계 변경",
                    "requesterName": "김책임" if index % 2 == 0 else "이선임",
                    "changedAt": recent_dates[index],
                    "status": "검토 중" if index == 2 else "완료",
                }
                for index, item in enumerate(first_items)
            ],
            "upcomingDeliveries": [
                {
                    "deliveryId": item["applications"][0]["deliveries"][0]["deliveryId"],
                    "itemId": item["itemId"],
                    "itemName": item["itemNameKor"],
                    "itemNumber": item["itemNumber"],
                    "deliveryDate": (today + timedelta(days=index * 2 + 2)).isoformat(),
                    "daysLeft": index * 2 + 2,
                    "status": "임박",
                }
                for index, item in enumerate(first_items)
            ],
        }

    def get_filter_options(self) -> dict[str, Any]:
        return deepcopy(self._data["filterOptions"])

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

    @classmethod
    def _matches_item(cls, item: dict[str, Any], criteria: ItemSearchCriteria) -> bool:
        query = criteria.query.casefold()
        searchable = " ".join(
            str(item.get(key, ""))
            for key in ("itemNumber", "itemNameKor", "itemNameEng", "itemUsageKor", "itemUsageEng")
        ).casefold()
        return (
            (not query or query in searchable)
            and (not criteria.item_type or item["itemType"] == criteria.item_type)
            and (not criteria.aircraft_type_code or cls._has_code(item["aircraftTypes"], criteria.aircraft_type_code))
            and (
                criteria.business_id is None
                or any(entry["businessId"] == criteria.business_id for entry in item["businesses"])
            )
            and (not criteria.subsystem_code or cls._has_code(item["subsystems"], criteria.subsystem_code))
            and (not criteria.category_code or item["category"]["code"] == criteria.category_code)
            and (
                criteria.manager_user_id is None
                or any(entry["userId"] == criteria.manager_user_id for entry in item["managers"])
            )
            and (
                criteria.destination_id is None
                or any(entry["destinationId"] == criteria.destination_id for entry in item["destinations"])
            )
            and (not criteria.status or item["status"] == criteria.status)
        )

    def search_items(
        self,
        criteria: ItemSearchCriteria,
        sort: ItemSort,
        page: int,
        size: int,
    ) -> ItemSearchPage:
        matched = [item for item in self._data["itemDetails"] if self._matches_item(item, criteria)]
        matched.sort(
            key=lambda item: str(self._sort_value(item, sort.field)),
            reverse=sort.direction == "desc",
        )
        start = (page - 1) * size
        items = [self._to_item_summary(item) for item in matched[start : start + size]]
        return ItemSearchPage(items=items, total_elements=len(matched))

    def get_item_by_id(self, item_id: int) -> dict[str, Any] | None:
        item = next((item for item in self._data["itemDetails"] if item["itemId"] == item_id), None)
        return deepcopy(item)

    def get_delivery_schedules(self) -> list[dict[str, Any]]:
        schedules: list[dict[str, Any]] = []
        for item in self._data["itemDetails"]:
            for application in item.get("applications", []):
                for delivery in application.get("deliveries", []):
                    quantity = delivery["quantity"]
                    state = delivery["status"]
                    received_quantity = (
                        quantity if state == "COMPLETED" else max(0, quantity - 3) if state == "IN_PROGRESS" else 0
                    )
                    schedule = {
                        "deliveryId": delivery["deliveryId"],
                        "integratedInfoId": application["integratedInfoId"],
                        "item": {
                            "itemId": item["itemId"],
                            "itemNumber": item["itemNumber"],
                            "itemName": item["itemNameKor"],
                        },
                        "business": application["business"],
                        "aircraftType": application["aircraftType"],
                        "destination": delivery["destination"],
                        "plannedQuantity": quantity,
                        "orderedQuantity": max(0, quantity - 2) if state == "PLANNED" else quantity,
                        "receivedQuantity": received_quantity,
                        "deliveredQuantity": quantity if state == "COMPLETED" else 0,
                        "deliveryDate": delivery["deliveryDate"],
                        "status": state,
                        "delayed": False,
                        "managers": item["managers"],
                    }
                    if delivery.get("receiptDate"):
                        schedule["receiptDate"] = delivery["receiptDate"]
                    schedules.append(schedule)
        return deepcopy(schedules)

    def get_change_events(self) -> list[dict[str, Any]]:
        return deepcopy(self._data["changeEvents"])

    def get_replacement_graph(self, root_item_id: int) -> dict[str, Any] | None:
        graph = self._data["replacementGraph"]
        return deepcopy(graph) if graph["rootItemId"] == root_item_id else None

    def _to_item_summary(self, item: dict[str, Any]) -> dict[str, Any]:
        excluded = {"itemUsageKor", "itemUsageEng", "calibration", "applications", "replacementSummary"}
        return deepcopy({key: value for key, value in item.items() if key not in excluded})
