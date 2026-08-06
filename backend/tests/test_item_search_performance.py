from time import perf_counter
from typing import Any

from backend.app.repositories.memory import InMemoryGsemRepository
from backend.app.repositories.search import ItemSearchCriteria, ItemSort


def _make_item(index: int) -> dict[str, Any]:
    return {
        "itemId": index,
        "itemNumber": f"XXXXXX-{index:05d}",
        "itemNameKor": "목표장비" if index == 20_000 else "A장비",
        "itemNameEng": "",
        "itemUsageKor": "목업 용도",
        "itemUsageEng": "",
        "itemType": "SUPPORT_EQUIPMENT",
        "category": {"code": "CA0001", "name": "일반공구"},
        "aircraftTypes": [{"code": "AT001", "name": "가 기종"}],
        "businesses": [{"businessId": 1, "name": "가 사업"}],
        "subsystems": [{"code": "SS0001", "name": "가 계통"}],
        "managers": [{"userId": 1, "name": "김책임"}],
        "destinations": [{"destinationId": 1, "name": "가 납지"}],
        "status": "IN_USE",
        "recentChangeDate": "2026-01-01",
    }


def test_large_mock_search_returns_only_requested_page() -> None:
    repository = InMemoryGsemRepository(data={"itemDetails": [_make_item(index) for index in range(1, 20_001)]})

    started_at = perf_counter()
    result = repository.search_items(
        ItemSearchCriteria(query="목표장비", business_id=1, subsystem_code="SS0001"),
        ItemSort("itemNumber", "asc"),
        page=1,
        size=20,
    )
    elapsed_seconds = perf_counter() - started_at

    assert result.total_elements == 1
    assert [item["itemNumber"] for item in result.items] == ["XXXXXX-20000"]
    # 실제 DB 성능 목표가 아니라 목업 구현의 우발적인 급격한 퇴행을 감지하는 완화된 기준이다.
    assert elapsed_seconds < 2.0


def test_large_mock_search_pages_after_repository_sorting() -> None:
    repository = InMemoryGsemRepository(data={"itemDetails": [_make_item(index) for index in range(1, 20_001)]})

    result = repository.search_items(
        ItemSearchCriteria(),
        ItemSort("itemNumber", "desc"),
        page=250,
        size=20,
    )

    assert result.total_elements == 20_000
    assert len(result.items) == 20
    assert result.items[0]["itemNumber"] > result.items[-1]["itemNumber"]
