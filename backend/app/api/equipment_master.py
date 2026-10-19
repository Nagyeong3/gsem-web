"""변경된 GSEMS 스키마 기반 통합현황 읽기 전용 조회.

GSEM_DATA_SOURCE=sqlserver일 때만 DB에 연결한다. 기존 API는 변경하지 않는다.
"""
import os
import csv
import io
from pathlib import Path
from fastapi.responses import StreamingResponse, FileResponse

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
  AND (? = '' OR EXISTS (
    SELECT 1 FROM Contract cf
    JOIN Sub_Contract sf ON sf.contract_id = cf.contract_id
    JOIN Match_Sub_Contract_Item mf ON mf.sub_contract_id = sf.sub_contract_id AND mf.item_id = ii.item_id
    JOIN Vendor vf ON vf.vendor_id = mf.vendor_id
    WHERE cf.business_id = ii.business_id AND vf.vendor_name = ?
  ))
  AND (? = '' OR EXISTS (
    SELECT 1 FROM Contract cf
    JOIN Sub_Contract sf ON sf.contract_id = cf.contract_id
    JOIN Match_Sub_Contract_Item mf ON mf.sub_contract_id = sf.sub_contract_id AND mf.item_id = ii.item_id
    JOIN Users uf ON uf.user_id = mf.buyer
    WHERE cf.business_id = ii.business_id AND uf.user_name = ?
  ))
ORDER BY ii.integrated_id
OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
"""

COUNT_SQL = """
SELECT COUNT(*)
FROM Integrated_Info AS ii
JOIN Item AS i ON i.item_id = ii.item_id
WHERE (? IS NULL OR ii.business_id = ?)
  AND (? = '' OR i.item_num LIKE ? OR i.item_name_kor LIKE ?)
  AND (? = '' OR EXISTS (
    SELECT 1 FROM Contract cf JOIN Sub_Contract sf ON sf.contract_id = cf.contract_id
    JOIN Match_Sub_Contract_Item mf ON mf.sub_contract_id = sf.sub_contract_id AND mf.item_id = ii.item_id
    JOIN Vendor vf ON vf.vendor_id = mf.vendor_id
    WHERE cf.business_id = ii.business_id AND vf.vendor_name = ?
  ))
  AND (? = '' OR EXISTS (
    SELECT 1 FROM Contract cf JOIN Sub_Contract sf ON sf.contract_id = cf.contract_id
    JOIN Match_Sub_Contract_Item mf ON mf.sub_contract_id = sf.sub_contract_id AND mf.item_id = ii.item_id
    JOIN Users uf ON uf.user_id = mf.buyer
    WHERE cf.business_id = ii.business_id AND uf.user_name = ?
  ))
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


@router.get("/equipment-master/businesses")
def list_equipment_master_businesses():
    """Return all businesses appearing in the equipment master, not just current page."""
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "통합현황 실DB 조회는 GSEM_DATA_SOURCE=sqlserver에서만 사용 가능합니다.")
    conn = _connect()
    try:
        cursor = conn.cursor()
        rows = _rows(cursor.execute("""
            SELECT DISTINCT b.business_id, b.biz_name
            FROM Business AS b
            JOIN Integrated_Info AS ii ON ii.business_id = b.business_id
            ORDER BY b.biz_name, b.business_id
        """))
        return [{"businessId": row["business_id"], "businessName": row["biz_name"]} for row in rows]
    except Exception as exc:
        raise HTTPException(500, "사업 목록 조회 중 DB 오류가 발생했습니다.") from exc
    finally:
        conn.close()


@router.get("/equipment-master/filter-options")
def equipment_master_filter_options():
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "통합현황 실DB 조회는 SQL Server 모드에서만 사용 가능합니다.")
    conn = _connect()
    try:
        cursor = conn.cursor()
        vendors = _rows(cursor.execute("""
            SELECT DISTINCT v.vendor_name AS name FROM Match_Sub_Contract_Item m
            JOIN Vendor v ON v.vendor_id = m.vendor_id
            WHERE v.vendor_name IS NOT NULL AND LTRIM(RTRIM(v.vendor_name)) <> ''
            ORDER BY v.vendor_name
        """))
        buyers = _rows(cursor.execute("""
            SELECT DISTINCT u.user_name AS name FROM Match_Sub_Contract_Item m
            JOIN Users u ON u.user_id = m.buyer
            WHERE u.user_name IS NOT NULL AND LTRIM(RTRIM(u.user_name)) <> ''
            ORDER BY u.user_name
        """))
        return {"vendors": [r["name"] for r in vendors], "buyers": [r["name"] for r in buyers]}
    finally:
        conn.close()


@router.get("/equipment-master/image/{item_id}")
def equipment_master_image(item_id: int):
    """Serve only files under explicitly configured GSEM_IMAGE_DIR; never arbitrary DB paths."""
    if item_id < 1:
        raise HTTPException(404, "이미지가 없습니다.")
    root_value = _setting("GSEM_IMAGE_DIR")
    if not root_value:
        raise HTTPException(404, "이미지 저장소가 설정되지 않았습니다.")
    root = Path(root_value).resolve()
    conn = _connect()
    try:
        row = conn.cursor().execute("SELECT item_image_path FROM Item WHERE item_id = ?", item_id).fetchone()
    finally:
        conn.close()
    if not row or not row[0]:
        raise HTTPException(404, "이미지가 없습니다.")
    requested = str(row[0]).replace(chr(92), "/")
    file_name = Path(requested).name
    if not file_name or file_name in (".", ".."):
        raise HTTPException(404, "이미지가 없습니다.")
    candidate = (root / file_name).resolve()
    if not candidate.is_relative_to(root) or not candidate.is_file() or candidate.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        raise HTTPException(404, "이미지를 찾을 수 없습니다.")
    return FileResponse(candidate)


@router.get("/equipment-master/export")
def equipment_master_export(
    query: str = Query("", max_length=100),
    business_id: int | None = Query(None, alias="businessId", ge=1),
    vendor: str = Query("", max_length=200),
    buyer: str = Query("", max_length=200),
):
    """UTF-8 BOM CSV that opens directly in Excel; export all matching rows, not only the current page."""
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "SQL Server 모드에서만 내보낼 수 있습니다.")
    term = query.strip()
    params = (business_id, business_id, term, f"%{term}%", f"%{term}%", vendor.strip(), vendor.strip(), buyer.strip(), buyer.strip())
    conn = _connect()
    try:
        cursor = conn.cursor()
        total = cursor.execute(COUNT_SQL, *params).fetchone()[0]
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["통합ID","사업ID","사업명","품번","품명","담당자","장비설명","계약상세ID","계약명","납품처","바이어","조달원","수량","입고예정","입고일","납품일","계약상 납기"])
        for offset in range(0, total, 100):
            records = _rows(cursor.execute(BASE_SQL, *(params + (offset, 100))))
            ids = [row["integrated_id"] for row in records]
            by_id = {id_value: [] for id_value in ids}
            if ids:
                placeholders = ", ".join("?" for _ in ids)
                for entry in _rows(cursor.execute(DELIVERY_SQL.format(placeholders=placeholders), *ids)):
                    by_id[entry["integrated_id"]].append(entry)
            for item in records:
                prefix = [item["integrated_id"],item["business_id"],item["biz_name"],item["item_num"],item["item_name_kor"],item["manager_name"],item["item_usage_kor"]]
                for detail in by_id[item["integrated_id"]] or [None]:
                    line = prefix + ([detail["match_id"],detail["sub_contract_name"],detail["delivery_dest_name"],detail["buyer_name"],detail["vendor_name"],detail["quantity"],_date(detail["date_receiving_expect"]),_date(detail["date_receiving"]),_date(detail["date_deliver"]),_date(detail["delivery_date_contract"])] if detail else [None]*10)
                    # Avoid Excel formula execution from untrusted DB text.
                    writer.writerow([("'" + v) if isinstance(v, str) and v.lstrip().startswith(("=", "+", "-", "@")) else v for v in line])
        data = output.getvalue().encode("utf-8-sig")
        return StreamingResponse(iter([data]), media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="GSEM_equipment_master.csv"'})
    finally:
        conn.close()


@router.get("/equipment-master")
def list_equipment_master(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    query: str = Query("", max_length=100),
    business_id: int | None = Query(None, alias="businessId", ge=1),
    vendor: str = Query("", max_length=200),
    buyer: str = Query("", max_length=200),
):
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "통합현황 실DB 조회는 GSEM_DATA_SOURCE=sqlserver에서만 사용 가능합니다.")

    term = query.strip()
    pattern = f"%{term}%"
    params = (business_id, business_id, term, pattern, pattern, vendor.strip(), vendor.strip(), buyer.strip(), buyer.strip())
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
