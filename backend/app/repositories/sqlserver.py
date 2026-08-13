from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

from backend.app.core.config import settings
from backend.app.repositories.memory import InMemoryGsemRepository
from backend.app.repositories.search import ItemSearchCriteria, ItemSearchPage, ItemSort

try:
    import pyodbc
except ImportError:  # pragma: no cover - memory 모드에서는 설치되지 않아도 앱이 실행되어야 함
    pyodbc = None  # type: ignore[assignment]


class SqlServerGsemRepository:
    """GSEMS SQL Server 조회 어댑터.

    V8에서는 실제 ERD 기준으로 안전하게 조회 가능한 기본 테이블만 DB에서 읽고,
    변경 이력·대체품 계보·문서처럼 DB 구조가 미확정인 영역은 명시적으로 Mock 데이터를 반환한다.
    """

    def __init__(self, fallback: InMemoryGsemRepository | None = None) -> None:
        self._fallback = fallback or InMemoryGsemRepository()

    @contextmanager
    def _connect(self) -> Iterator[Any]:
        if pyodbc is None:
            raise RuntimeError("pyodbc가 설치되어 있지 않습니다. requirements.txt 설치 후 다시 실행하세요.")
        connection = pyodbc.connect(settings.odbc_connection_string)
        try:
            yield connection
        finally:
            connection.close()

    @staticmethod
    def _rows_to_dicts(cursor: Any) -> list[dict[str, Any]]:
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def health_check(self) -> dict[str, Any]:
        with self._connect() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT DB_NAME() AS dbName, @@SERVERNAME AS serverName")
            row = cursor.fetchone()
            return {"dbName": row.dbName, "serverName": row.serverName}

    def get_dashboard_overview(self) -> dict[str, Any]:
        overview = self._fallback.get_dashboard_overview()
        overview["dataNotice"] = {
            "source": "MIXED",
            "message": "대시보드는 일부 집계 기준이 미확정되어 V7 Mock 데이터를 함께 표시합니다.",
        }
        return overview

    def get_filter_options(self) -> dict[str, Any]:
        options = self._fallback.get_filter_options()
        options["dataNotice"] = {
            "source": "MIXED",
            "message": "공통코드 연동 전까지 필터 옵션은 Mock 데이터를 사용합니다.",
        }
        return options

    def search_items(
        self,
        criteria: ItemSearchCriteria,
        sort: ItemSort,
        page: int,
        size: int,
    ) -> ItemSearchPage:
        """장비 검색은 Integrated_Info 중심으로 전환 예정.

        실제 SQL은 테이블/코드값 검증 후 추가한다. 현재는 화면 안정성을 위해 Mock 검색을 유지한다.
        """

        result = self._fallback.search_items(criteria, sort, page, size)
        for item in result.items:
            item["dataSourceLabel"] = "Mock 데이터"
            item["dataSourceReason"] = "Integrated_Info 기준 SQL 조회 검증 전까지 Mock 검색 결과를 표시합니다."
        return result

    def get_item_by_id(self, item_id: int) -> dict[str, Any] | None:
        item = self._fallback.get_item_by_id(item_id)
        if item is None:
            return None
        item["dataNotice"] = {
            "source": "MOCK",
            "message": "상세 화면은 실제 DB DTO 확정 전까지 V7 Mock 데이터를 표시합니다.",
        }
        return item

    def get_delivery_schedules(self) -> list[dict[str, Any]]:
        schedules = self._fallback.get_delivery_schedules()
        for schedule in schedules:
            schedule["dataSourceLabel"] = "Mock 데이터"
            schedule["dataSourceReason"] = "Delivery 테이블에 납품일 필드가 없어 일정 화면은 DB 구조 확정 전까지 Mock 데이터를 표시합니다."
        return schedules

    def get_change_events(self) -> list[dict[str, Any]]:
        events = self._fallback.get_change_events()
        for event in events:
            event["dataSourceLabel"] = "Mock 데이터"
            event["dataSourceReason"] = "History 테이블은 종합이력 수준이라 변경 신청·승인 흐름은 후순위 DB 연동 대상입니다."
        return events

    def get_replacement_graph(self, root_item_id: int) -> dict[str, Any] | None:
        graph = self._fallback.get_replacement_graph(root_item_id)
        if graph is None:
            return None
        graph["dataNotice"] = {
            "source": "MOCK",
            "message": "대체품 계보 저장 구조가 미확정되어 V7 Mock 계보를 표시합니다.",
        }
        return graph
