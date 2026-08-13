from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime
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

    _SORT_COLUMNS = {
        "itemId": "ii.integrated_id",
        "integratedId": "ii.integrated_id",
        "itemNumber": "i.item_num",
        "itemName": "i.item_name_kor",
        "itemNameKor": "i.item_name_kor",
        "itemNameEng": "i.item_name_eng",
        "itemType": "i.code_ICS",
        "category": "i.code_CATEG",
        "business": "b.biz_name",
        "aircraftType": "b.code_ATYPE",
        "vendor": "v.vendor_name",
        "recentChangeDate": "ii.created_at",
        "createdAt": "ii.created_at",
    }

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

    @staticmethod
    def _json_value(value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat(timespec="milliseconds")
        if isinstance(value, date):
            return value.isoformat()
        return value

    @classmethod
    def _row_to_item_summary(cls, row: dict[str, Any]) -> dict[str, Any]:
        item_name = row.get("item_name_kor") or row.get("item_name_eng") or row.get("item_num") or "품명 미등록"
        business_id = row.get("business_id")
        business_name = row.get("biz_name") or "사업 미연결"
        aircraft_type_code = row.get("code_ATYPE")
        category_code = row.get("code_CATEG")
        ics_code = row.get("code_ICS")
        vendor_id = row.get("vendor_id")
        vendor_name = row.get("vendor_name")
        created_at = cls._json_value(row.get("integrated_created_at"))

        item = {
            "itemId": row.get("integrated_id"),
            "integratedId": row.get("integrated_id"),
            "sourceItemId": row.get("item_id"),
            "itemNumber": row.get("item_num"),
            "itemNsn": row.get("item_nsn"),
            "itemName": item_name,
            "itemNameKor": row.get("item_name_kor"),
            "itemNameEng": row.get("item_name_eng"),
            "itemNameNormal": row.get("item_name_normal"),
            "itemUsageKor": row.get("item_usage_kor"),
            "itemUsageEng": row.get("item_usage_eng"),
            "itemType": ics_code or "UNASSIGNED",
            "itemTypeLabel": "품목구분 미지정" if ics_code is None else ics_code,
            "category": {
                "code": category_code,
                "name": category_code or "장비구분 미지정",
            },
            "vendor": {
                "vendorId": vendor_id,
                "name": vendor_name or "제조사 미등록",
            },
            "aircraftTypes": [
                {
                    "code": aircraft_type_code,
                    "name": aircraft_type_code or "기체구분 미지정",
                }
            ]
            if aircraft_type_code
            else [],
            "businesses": [
                {
                    "businessId": business_id,
                    "name": business_name,
                }
            ]
            if business_id is not None
            else [],
            "subsystems": [],
            "maintenanceLevels": [],
            "managers": [],
            "destinations": [],
            "status": "DB_LINKED",
            "recentChangeDate": created_at[:10] if isinstance(created_at, str) else None,
            "createdAt": created_at,
            "businessId": business_id,
            "businessName": business_name,
            "aircraftTypeCode": aircraft_type_code,
            "categoryCode": category_code,
            "icsCode": ics_code,
            "contractId": row.get("contract_id"),
            "serdInfoId": row.get("serd_info_id"),
            "dataSourceLabel": "SQL Server",
        }

        missing: list[str] = []
        if row.get("contract_id") is None:
            missing.append("계약 미연결")
        if row.get("serd_info_id") is None:
            missing.append("SERD 미연결")
        if ics_code is None:
            missing.append("품목구분 미지정")
        if category_code is None:
            missing.append("장비구분 미지정")
        if missing:
            item["dataSourceReason"] = ", ".join(missing)
        return item

    @classmethod
    def _build_item_where_clause(cls, criteria: ItemSearchCriteria) -> tuple[str, list[Any]]:
        clauses: list[str] = []
        params: list[Any] = []

        if criteria.query:
            query = f"%{criteria.query}%"
            clauses.append(
                "(" 
                "i.item_num LIKE ? OR "
                "i.item_nsn LIKE ? OR "
                "i.item_name_normal LIKE ? OR "
                "i.item_name_kor LIKE ? OR "
                "i.item_name_eng LIKE ? OR "
                "i.item_usage_kor LIKE ? OR "
                "i.item_usage_eng LIKE ? OR "
                "b.biz_name LIKE ? OR "
                "v.vendor_name LIKE ?"
                ")"
            )
            params.extend([query] * 9)

        if criteria.item_type:
            clauses.append("i.code_ICS = ?")
            params.append(criteria.item_type)

        if criteria.aircraft_type_code:
            clauses.append("b.code_ATYPE = ?")
            params.append(criteria.aircraft_type_code)

        if criteria.business_id is not None:
            clauses.append("b.business_id = ?")
            params.append(criteria.business_id)

        if criteria.category_code:
            clauses.append("i.code_CATEG = ?")
            params.append(criteria.category_code)

        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        return where_clause, params

    @classmethod
    def _sort_clause(cls, sort: ItemSort) -> str:
        column = cls._SORT_COLUMNS.get(sort.field, "ii.integrated_id")
        direction = "ASC" if sort.direction == "asc" else "DESC"
        return f"ORDER BY {column} {direction}, ii.integrated_id DESC"

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
        """Integrated_Info 기준 장비 목록을 SQL Server에서 조회한다.

        V8 1차 연동 범위는 Integrated_Info, Item, Business, Vendor 조인까지로 제한한다.
        공통코드 명칭, 담당자, 납품, 이력, 대체품 계보는 후속 범위에서 연결한다.
        """

        safe_page = max(page, 1)
        safe_size = min(max(size, 1), 200)
        offset = (safe_page - 1) * safe_size
        where_clause, params = self._build_item_where_clause(criteria)
        sort_clause = self._sort_clause(sort)

        base_from = f"""
            FROM Integrated_Info ii
            LEFT JOIN Item i
                ON ii.item_id = i.item_id
            LEFT JOIN Business b
                ON ii.business_id = b.business_id
            LEFT JOIN Vendor v
                ON i.vendor_id = v.vendor_id
            {where_clause}
        """

        count_sql = f"SELECT COUNT(1) AS total {base_from}"
        select_sql = f"""
            SELECT
                ii.integrated_id,
                ii.created_at AS integrated_created_at,

                i.item_id,
                i.item_num,
                i.item_nsn,
                i.item_name_normal,
                i.item_name_kor,
                i.item_name_eng,
                i.item_usage_kor,
                i.item_usage_eng,
                i.code_CATEG,
                i.code_ICS,
                i.vendor_id,
                i.serd_info_id,

                b.business_id,
                b.biz_name,
                b.code_ATYPE,

                v.vendor_name,

                ii.contract_id
            {base_from}
            {sort_clause}
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """

        with self._connect() as connection:
            cursor = connection.cursor()
            cursor.execute(count_sql, params)
            total_row = cursor.fetchone()
            total_elements = int(total_row.total if total_row else 0)

            cursor.execute(select_sql, [*params, offset, safe_size])
            rows = self._rows_to_dicts(cursor)

        items = [self._row_to_item_summary(row) for row in rows]
        return ItemSearchPage(items=items, total_elements=total_elements)

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
