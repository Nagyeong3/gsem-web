from dataclasses import dataclass
from typing import Any, Literal


@dataclass(frozen=True, slots=True)
class ItemSearchCriteria:
    """품목 검색 조건을 저장소 구현체에 전달하는 값 객체."""

    query: str = ""
    item_type: str | None = None
    aircraft_type_code: str | None = None
    business_id: int | None = None
    subsystem_code: str | None = None
    category_code: str | None = None
    manager_user_id: int | None = None
    destination_id: int | None = None
    status: str | None = None


@dataclass(frozen=True, slots=True)
class ItemSort:
    field: str
    direction: Literal["asc", "desc"]


@dataclass(frozen=True, slots=True)
class ItemSearchPage:
    items: list[dict[str, Any]]
    total_elements: int
