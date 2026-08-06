import pytest

from backend.app.repositories.access import MsAccessGsemRepository
from backend.app.repositories.memory import InMemoryGsemRepository
from backend.app.repositories.search import ItemSearchCriteria, ItemSort


def test_memory_repository_preserves_multiple_relations() -> None:
    repository = InMemoryGsemRepository()
    result = repository.search_items(ItemSearchCriteria(), ItemSort("itemNumber", "asc"), page=1, size=100)
    assert result.total_elements == 12
    assert len(result.items) == 12
    assert len(repository.get_item_by_id(1)["businesses"]) == 2  # type: ignore[index]
    assert len(repository.get_replacement_graph(1)["nodes"]) == 12  # type: ignore[index]
    assert repository.get_replacement_graph(999) is None


def test_repository_returns_defensive_copy() -> None:
    repository = InMemoryGsemRepository()
    item = repository.get_item_by_id(1)
    assert item is not None
    item["itemNameKor"] = "변경값"
    assert repository.get_item_by_id(1)["itemNameKor"] == "A장비"  # type: ignore[index]

    result = repository.search_items(ItemSearchCriteria(), ItemSort("itemNumber", "asc"), page=1, size=1)
    result.items[0]["itemNameKor"] = "변경값"
    repeated = repository.search_items(ItemSearchCriteria(), ItemSort("itemNumber", "asc"), page=1, size=1)
    assert repeated.items[0]["itemNameKor"] == "A장비"


def test_repository_applies_filter_sort_and_page() -> None:
    repository = InMemoryGsemRepository()
    result = repository.search_items(
        ItemSearchCriteria(query="장비", business_id=2),
        ItemSort("itemNumber", "desc"),
        page=2,
        size=2,
    )
    assert result.total_elements == 4
    assert [item["itemNumber"] for item in result.items] == ["XXXXXX-03", "XXXXXX-01"]


def test_access_adapter_blocks_accidental_use() -> None:
    with pytest.raises(RuntimeError, match="아직 구성되지 않았습니다"):
        MsAccessGsemRepository()
