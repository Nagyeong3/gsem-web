import pytest

from backend.app.repositories.access import MsAccessGsemRepository
from backend.app.repositories.memory import InMemoryGsemRepository


def test_memory_repository_preserves_multiple_relations() -> None:
    repository = InMemoryGsemRepository()
    assert len(repository.get_items()) == 12
    assert len(repository.get_item_by_id(1)["businesses"]) == 2  # type: ignore[index]
    assert len(repository.get_replacement_graph(1)["nodes"]) == 12  # type: ignore[index]
    assert repository.get_replacement_graph(999) is None


def test_repository_returns_defensive_copy() -> None:
    repository = InMemoryGsemRepository()
    item = repository.get_item_by_id(1)
    assert item is not None
    item["itemNameKor"] = "변경값"
    assert repository.get_item_by_id(1)["itemNameKor"] == "A장비"  # type: ignore[index]


def test_access_adapter_blocks_accidental_use() -> None:
    with pytest.raises(RuntimeError, match="아직 구성되지 않았습니다"):
        MsAccessGsemRepository()
