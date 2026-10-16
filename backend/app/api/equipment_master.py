"""변경된 GSEMS 스키마 기반 통합현황 읽기 전용 조회.

GSEM_DATA_SOURCE=sqlserver일 때만 DB에 연결한다. 기존 API는 변경하지 않는다.
"""
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


def _setting(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    if value is not None:
        return value
    env_file = Path(__file__).resolve().parents[3] / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            if "=" not in line or line.lstrip().startswith("#"):
                continue
            key, raw = line.split("=", 1)
            if key.strip() == name:
                return raw.strip().strip('"').strip("'")
    return default


def _connect():
    try:
        import pyodbc
    except ImportError as exc:
        raise HTTPException(503, "SQL Server 연결을 위해 pyodbc 설치가 필요합니다.") from exc

    required = ["GSEM_DB_HOST", "GSEM_DB_NAME", "GSEM_DB_USER", "GSEM_DB_PASSWORD"]
    missing = [key for key in required if not _setting(key)]
    if missing:
        raise HTTPException(503, "DB 접속 설정이 누락되었습니다: " + ", ".join(missing))

    connection = (
        f"DRIVER={{{_setting('GSEM_DB_DRIVER', 'ODBC Driver 17 for SQL Server')}}};"
        f"SERVER={_setting('GSEM_DB_HOST')},{_setting('GSEM_DB_PORT', '1433')};"
        f"DATABASE={_setting('GSEM_DB_NAME')};"
        f"UID={_setting('GSEM_DB_USER')};PWD={_setting('GSEM_DB_PASSWORD')};"
        f"Encrypt={_setting('GSEM_DB_ENCRYPT', 'yes')};"
        f"TrustServerCertificate={_setting('GSEM_DB_TRUST_SERVER_CERTIFICATE', 'yes')};"
        f"Connection Timeout={_setting('GSEM_DB_TIMEOUT_SECONDS', '5')};"
        "ApplicationIntent=ReadOnly;"
    )
    try:
        return pyodbc.connect(connection, timeout=5)
    except pyodbc.Error as exc:
        raise HTTPException(503, "SQL Server 연결에 실패했습니다. 서버 로그와 접속 설정을 확인하세요.") from exc


BASE_SQL = """
SELECT ii.integrated_id, ii.item_id, ii.business_id,
       i.item_num, i.item_name_kor, i.item_name_eng,
       i.item_usage_kor, i.manufacture_name, i.item_image_path,
       i.diminishing, b.biz_name, b.code_ATYPE,
       mgr.user_name AS manager_name
FROM Integrated_Info AS ii
JOIN Item AS i ON i.item_id = ii.item_id
JOIN Business AS b ON b.business_id = ii.business_id
OUTER APPLY (
    SELECT TOP (1) u.user_name
    FROM Match_Managing_Users AS mu
    JOIN Users AS u ON u.user_id = mu.user_id
    WHERE mu.integrated_id = ii.integrated_id
    ORDER BY mu.match_id
) AS mgr
WHERE (? IS NULL OR ii.business_id = ?)
  AND (? = '' OR i.item_num LIKE ? OR i.item_name_kor LIKE ?)
ORDER BY ii.integrated_id
OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
"""

COUNT_SQL = """
SELECT COUNT(*)
FROM Integrated_Info AS ii
JOIN Item AS i ON i.item_id = ii.item_id
WHERE (? IS NULL OR ii.business_id = ?)
  AND (? = '' OR i.item_num LIKE ? OR i.item_name_kor LIKE ?)
"""

DELIVERY_SQL = """
SELECT ii.integrated_id, sc.sub_contract_id, sc.sub_contract_name,
       sc.delivery_dest_name, sc.delivery_date_contract,
       m.match_id, m.[count] AS quantity, m.date_receiving_expect,
       m.date_receiving, m.date_deliver, m.price_contract,
       v.vendor_name, buyer.user_name AS buyer_name
FROM Integrated_Info AS ii
JOIN Contract AS c ON c.business_id = ii.business_id
JOIN Sub_Contract AS sc ON sc.contract_id = c.contract_id
JOIN Match_Sub_Contract_Item AS m
  ON m.sub_contract_id = sc.sub_contract_id AND m.item_id = ii.item_id
LEFT JOIN Vendor AS v ON v.vendor_id = m.vendor_id
LEFT JOIN Users AS buyer ON buyer.user_id = m.buyer
WHERE ii.integrated_id IN ({placeholders})
ORDER BY ii.integrated_id, sc.sub_contract_id, m.match_id
"""


def _rows(cursor):
    names = [column[0] for column in cursor.description]
    return [dict(zip(names, row)) for row in cursor.fetchall()]


def _date(value):
    return value.isoformat() if value is not None else None


@router.get("/equipment-master")
def list_equipment_master(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    query: str = Query("", max_length=100),
    business_id: int | None = Query(None, alias="businessId", ge=1),
):
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "통합현황 실DB 조회는 GSEM_DATA_SOURCE=sqlserver에서만 사용 가능합니다.")

    term = query.strip()
    pattern = f"%{term}%"
    params = (business_id, business_id, term, pattern, pattern)
    conn = _connect()
    try:
        cursor = conn.cursor()
        total = cursor.execute(COUNT_SQL, *params).fetchone()[0]
        records = _rows(cursor.execute(BASE_SQL, *(params + ((page - 1) * size, size))))
        ids = [row["integrated_id"] for row in records]
        deliveries = {item_id: [] for item_id in ids}
        if ids:
            placeholders = ", ".join("?" for _ in ids)
            for row in _rows(cursor.execute(DELIVERY_SQL.format(placeholders=placeholders), *ids)):
                deliveries[row["integrated_id"]].append({
                    "matchId": row["match_id"],
                    "subContractId": row["sub_contract_id"],
                    "subContractName": row["sub_contract_name"],
                    "destination": row["delivery_dest_name"],
                    "contractDate": _date(row["delivery_date_contract"]),
                    "quantity": row["quantity"],
                    "receivingExpected": _date(row["date_receiving_expect"]),
                    "receivedAt": _date(row["date_receiving"]),
                    "deliveredAt": _date(row["date_deliver"]),
                    "contractPrice": float(row["price_contract"]) if row["price_contract"] is not None else None,
                    "vendorName": row["vendor_name"],
                    "buyerName": row["buyer_name"],
                })
        items = [{
            "integratedId": row["integrated_id"],
            "itemId": row["item_id"],
            "businessId": row["business_id"],
            "businessName": row["biz_name"],
            "aircraftTypeCode": row["code_ATYPE"],
            "itemNumber": row["item_num"],
            "itemNameKor": row["item_name_kor"],
            "itemNameEng": row["item_name_eng"],
            "description": row["item_usage_kor"],
            "manufacturer": row["manufacture_name"],
            "imagePath": row["item_image_path"],
            "diminishing": bool(row["diminishing"]),
            "managerName": row["manager_name"],
            "deliveries": deliveries[row["integrated_id"]],
        } for row in records]
        return {
            "items": items, "page": page, "size": size,
            "totalElements": total, "totalPages": (total + size - 1) // size,
            "source": "sqlserver", "readOnly": True,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, "통합현황 조회 중 DB 오류가 발생했습니다. 서버 로그를 확인하세요.") from exc
    finally:
        conn.close()
