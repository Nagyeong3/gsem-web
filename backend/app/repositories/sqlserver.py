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

    @staticmethod
    def _display_text(value: Any, fallback: str = "-") -> str:
        if value is None:
            return fallback
        text = str(value).strip()
        if not text or text.lower() == "nan":
            return fallback
        return text

    @classmethod
    def _row_to_item_summary(cls, row: dict[str, Any]) -> dict[str, Any]:
        raw_item_num = cls._display_text(row.get("item_num"), "품번 미등록")
        raw_item_name_kor = cls._display_text(row.get("item_name_kor"), "")
        raw_item_name_eng = cls._display_text(row.get("item_name_eng"), "")
        item_name = raw_item_name_kor or raw_item_name_eng or raw_item_num or "품명 미등록"
        business_id = row.get("business_id")
        business_name = cls._display_text(row.get("biz_name"), "사업 미연결")
        aircraft_type_code = cls._display_text(row.get("code_ATYPE"), "")
        category_code = cls._display_text(row.get("code_CATEG"), "")
        ics_code = cls._display_text(row.get("code_ICS"), "")
        vendor_id = row.get("vendor_id")
        vendor_name = cls._display_text(row.get("vendor_name"), "제조사 미등록")
        created_at = cls._json_value(row.get("integrated_created_at"))

        item = {
            "itemId": row.get("integrated_id"),
            "integratedId": row.get("integrated_id"),
            "sourceItemId": row.get("item_id"),
            "itemNumber": raw_item_num,
            "itemNsn": cls._display_text(row.get("item_nsn"), ""),
            "itemName": item_name,
            "itemNameKor": item_name,
            "itemNameEng": raw_item_name_eng,
            "itemNameNormal": cls._display_text(row.get("item_name_normal"), ""),
            "itemUsageKor": cls._display_text(row.get("item_usage_kor"), ""),
            "itemUsageEng": cls._display_text(row.get("item_usage_eng"), ""),
            "itemType": ics_code or "UNASSIGNED",
            "itemTypeLabel": "품목구분 미지정" if not ics_code else ics_code,
            "category": {
                "code": category_code,
                "name": category_code or "장비구분 미지정",
            },
            "vendor": {
                "vendorId": vendor_id,
                "name": vendor_name,
            },
            "aircraftTypes": [
                {
                    "code": aircraft_type_code,
                    "name": aircraft_type_code,
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
            "status": "IN_USE",
            "recentChangeDate": created_at[:10] if isinstance(created_at, str) else None,
            "createdAt": created_at,
            "businessId": business_id,
            "businessName": business_name,
            "aircraftTypeCode": aircraft_type_code or None,
            "categoryCode": category_code or None,
            "icsCode": ics_code or None,
            "contractId": row.get("contract_id"),
            "serdInfoId": row.get("serd_info_id"),
            "dataSourceLabel": "SQL Server",
        }

        missing: list[str] = []
        if row.get("contract_id") is None:
            missing.append("계약 미연결")
        if row.get("serd_info_id") is None:
            missing.append("SERD 미연결")
        if not ics_code:
            missing.append("품목구분 미지정")
        if not category_code:
            missing.append("장비구분 미지정")
        if missing:
            item["dataSourceReason"] = ", ".join(missing)
        return item

    @classmethod
    def _row_to_delivery(cls, row: dict[str, Any]) -> dict[str, Any] | None:
        delivery_id = row.get("delivery_id")
        if delivery_id is None:
            return None
        destination_id = row.get("delivery_dest_id")
        destination_name = cls._display_text(row.get("delivery_dest_name"), "납지 미등록")
        return {
            "deliveryId": delivery_id,
            "destination": {
                "code": str(destination_id) if destination_id is not None else "UNASSIGNED",
                "name": destination_name,
            },
            "quantity": int(row.get("quantity") or 0),
            "deliveryDate": "-",
            "status": "COMPLETED" if cls._display_text(row.get("delivery_status"), "") == "COMPLETED" else "IN_PROGRESS",
            "sourceStatus": cls._display_text(row.get("delivery_status"), ""),
        }

    @classmethod
    def _rows_to_item_detail(cls, rows: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not rows:
            return None

        first = rows[0]
        item = cls._row_to_item_summary(first)
        business_id = first.get("business_id")
        business_name = cls._display_text(first.get("biz_name"), "사업 미연결")
        aircraft_type_code = cls._display_text(first.get("code_ATYPE"), "")

        deliveries = [delivery for row in rows if (delivery := cls._row_to_delivery(row)) is not None]
        item["destinations"] = [
            {
                "destinationId": delivery["destination"]["code"],
                "name": delivery["destination"]["name"],
            }
            for delivery in deliveries
        ]
        item["applications"] = [
            {
                "integratedInfoId": first.get("integrated_id"),
                "business": {
                    "businessId": business_id,
                    "name": business_name,
                },
                "aircraftType": {
                    "code": aircraft_type_code or "UNASSIGNED",
                    "name": aircraft_type_code or "기체구분 미지정",
                },
                "deliveries": deliveries,
            }
        ]
        item["replacementSummary"] = {"predecessors": 0, "successors": 0, "hasBranch": False}
        item["dataNotice"] = {
            "source": "SQL_SERVER_PARTIAL",
            "message": "상세 기본정보와 납품 수량은 SQL Server에서 조회하고, 대체품 계보 등 미확정 영역은 후속 연동 대상입니다.",
        }
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
        detail_sql = """
            SELECT
                ii.integrated_id,
                ii.created_at AS integrated_created_at,
                ii.contract_id,

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

                d.delivery_id,
                d.delivery_dest_id,
                d.quantity,
                d.delivery_status,
                dd.delivery_dest_name
            FROM Integrated_Info ii
            LEFT JOIN Item i
                ON ii.item_id = i.item_id
            LEFT JOIN Business b
                ON ii.business_id = b.business_id
            LEFT JOIN Vendor v
                ON i.vendor_id = v.vendor_id
            LEFT JOIN Delivery d
                ON ii.integrated_id = d.integrated_id
            LEFT JOIN Delivery_Destination dd
                ON d.delivery_dest_id = dd.delivery_dest_id
            WHERE ii.integrated_id = ?
            ORDER BY d.delivery_id ASC
        """

        with self._connect() as connection:
            cursor = connection.cursor()
            cursor.execute(detail_sql, item_id)
            rows = self._rows_to_dicts(cursor)

        return self._rows_to_item_detail(rows)

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
