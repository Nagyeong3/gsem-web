"""Read-only SQL Server delivery-round overview and line details."""
from datetime import date as date_type
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query

from backend.app.api.equipment_master import _connect, _date, _rows, _setting

router = APIRouter()


def _require_db():
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "납품 차수 조회는 SQL Server 모드에서만 가능합니다.")


def _business_ids(business_id, business_ids):
    selected = list(dict.fromkeys(business_ids or ([business_id] if business_id else [])))
    if not selected or any(value < 1 for value in selected):
        raise HTTPException(422, "하나 이상의 올바른 사업 ID가 필요합니다.")
    if len(selected) > 1000:
        raise HTTPException(422, "한 번에 조회할 수 있는 사업은 1000개 이하입니다.")
    return selected


@router.get("/delivery-rounds/filter-options")
def filter_options(
    business_ids: Annotated[list[int] | None, Query(alias="businessIds")] = None,
):
    """Return searchable option catalogs for selected businesses, independently of date filters."""
    _require_db()
    selected = list(dict.fromkeys(business_ids or []))
    if any(value < 1 for value in selected) or len(selected) > 1000:
        raise HTTPException(422, "잘못된 사업 ID입니다.")
    where = "WHERE c.business_id IN (" + ", ".join("?" for _ in selected) + ")" if selected else ""
    conn = _connect()
    try:
        cursor = conn.cursor()
        destinations = _rows(cursor.execute(
            "SELECT DISTINCT LTRIM(RTRIM(sc.delivery_dest_name)) AS name "
            "FROM Sub_Contract sc JOIN Contract c ON c.contract_id = sc.contract_id "
            + where + (" AND " if where else " WHERE ")
            + "sc.delivery_dest_name IS NOT NULL AND LTRIM(RTRIM(sc.delivery_dest_name)) <> '' "
            "ORDER BY name", *selected,
        ))
        vendors = _rows(cursor.execute(
            "SELECT DISTINCT LTRIM(RTRIM(v.vendor_name)) AS name FROM Match_Sub_Contract_Item m "
            "JOIN Sub_Contract sc ON sc.sub_contract_id = m.sub_contract_id "
            "JOIN Contract c ON c.contract_id = sc.contract_id "
            "JOIN Vendor v ON v.vendor_id = m.vendor_id "
            + where + (" AND " if where else " WHERE ")
            + "v.vendor_name IS NOT NULL AND LTRIM(RTRIM(v.vendor_name)) <> '' "
            "ORDER BY name", *selected,
        ))
        items = _rows(cursor.execute(
            "SELECT DISTINCT LTRIM(RTRIM(i.item_name_kor)) AS item_name, "
            "LTRIM(RTRIM(i.item_num)) AS item_number "
            "FROM Match_Sub_Contract_Item m "
            "JOIN Sub_Contract sc ON sc.sub_contract_id = m.sub_contract_id "
            "JOIN Contract c ON c.contract_id = sc.contract_id "
            "JOIN Item i ON i.item_id = m.item_id "
            + where, *selected,
        ))
        return {"vendors": [r["name"] for r in vendors],
                "destinations": [r["name"] for r in destinations],
                "itemNames": sorted({r["item_name"] for r in items if r["item_name"]}),
                "itemNumbers": sorted({r["item_number"] for r in items if r["item_number"]}),
                "readOnly": True}
    finally:
        conn.close()


@router.get("/delivery-rounds")
def rounds(
    business_id: int | None = Query(None, alias="businessId", ge=1),
    business_ids: Annotated[list[int] | None, Query(alias="businessIds")] = None,
    vendor: str = Query("", max_length=200),
    destination: str = Query("", max_length=200),
    vendors: Annotated[list[str] | None, Query(alias="vendors")] = None,
    destinations: Annotated[list[str] | None, Query(alias="destinations")] = None,
    date_from: Annotated[date_type | None, Query(alias="dateFrom")] = None,
    date_to: Annotated[date_type | None, Query(alias="dateTo")] = None,
    item_name: Annotated[str, Query(alias="itemName", max_length=200)] = "",
    item_number: Annotated[str, Query(alias="itemNumber", max_length=200)] = "",
    item_names: Annotated[list[str] | None, Query(alias="itemNames")] = None,
    item_numbers: Annotated[list[str] | None, Query(alias="itemNumbers")] = None,
    item_name_terms: Annotated[list[str] | None, Query(alias="itemNameTerms")] = None,
    item_number_terms: Annotated[list[str] | None, Query(alias="itemNumberTerms")] = None,
):
    selected = _business_ids(business_id, business_ids)
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, "계약상 납기 시작일이 종료일보다 늦습니다.")
    selected_vendors = list(dict.fromkeys(v.strip() for v in (vendors or ([vendor] if vendor else [])) if v.strip()))
    selected_destinations = list(dict.fromkeys(
        v.strip() for v in (destinations or ([destination] if destination else [])) if v.strip()
    ))
    if (
        len(selected_vendors) > 100
        or len(selected_destinations) > 100
        or any(len(v) > 200 for v in selected_vendors + selected_destinations)
    ):
        raise HTTPException(422, "필터 선택 개수 또는 길이가 제한을 초과했습니다.")
    def clean(values):
        result = list(dict.fromkeys(value.strip() for value in values if value.strip()))
        if len(values) > 100 or any(len(value) > 200 for value in result):
            raise HTTPException(422, "품명·품번 선택 개수 또는 길이가 제한을 초과했습니다.")
        return result

    exact_names = clean(item_names or [])
    exact_numbers = clean(item_numbers or [])
    name_terms = clean((item_name_terms or []) + ([item_name] if item_name.strip() else []))
    number_terms = clean((item_number_terms or []) + ([item_number] if item_number.strip() else []))
    _require_db()
    # Apply all item-level filters to the same matching row before aggregation.
    # If an item filter is active, omit rounds without any matching line.
    # For an unfiltered request, preserve rounds with no linked items.
    item_filters_active = bool(selected_vendors or exact_names or exact_numbers or name_terms or number_terms)
    item_join_conditions = []
    if selected_vendors:
        item_join_conditions.append(
            "EXISTS (SELECT 1 FROM Vendor AS vf WHERE vf.vendor_id = m.vendor_id "
            "AND LTRIM(RTRIM(vf.vendor_name)) IN ({vendor_placeholders}))"
        )
    def like_contains(value: str) -> str:
        # Escaping prevents a user-entered % or _ from turning into a wildcard.
        return "%" + value.replace("~", "~~").replace("%", "~%").replace("_", "~_").replace("[", "[[]") + "%"

    item_params = selected_vendors.copy()
    # 같은 필터의 정확·부분일치 조건은 OR, 다른 필터는 AND로 한 품목 행에 적용한다.
    for alias, column, exact, terms in (
        ("fi", "item_name_kor", exact_names, name_terms),
        ("fn", "item_num", exact_numbers, number_terms),
    ):
        choices = []
        if exact:
            choices.append(f"LTRIM(RTRIM({alias}.{column})) IN (" + ", ".join("?" for _ in exact) + ")")
            item_params.extend(exact)
        for term in terms:
            choices.append(f"{alias}.{column} LIKE ? ESCAPE '~'")
            item_params.append(like_contains(term))
        if choices:
            item_join_conditions.append(
                f"EXISTS (SELECT 1 FROM Item AS {alias} WHERE {alias}.item_id = m.item_id "
                "AND (" + " OR ".join(choices) + "))"
            )
    item_join = "".join(" AND " + condition for condition in item_join_conditions)

    sql = """
SELECT sc.sub_contract_id, b.business_id, b.biz_name, sc.delivery_dest_name,
       sc.sub_contract_name, sc.delivery_date_contract,
       COUNT(DISTINCT m.item_id) AS item_count,
       COALESCE(SUM(m.[count]), 0) AS point_count,
       COUNT(m.purchase_request_Number) AS pr_count,
       COUNT(m.purchase_order_Number) AS po_count,
       COUNT(m.date_receiving) AS received_count,
       COUNT(m.date_deliver) AS delivered_count,
       COALESCE(SUM(CASE WHEN m.date_deliver IS NOT NULL THEN m.[count] ELSE 0 END), 0) AS delivered_quantity,
       MAX(m.date_deliver) AS latest_delivered_at,
       CASE WHEN EXISTS (
            SELECT 1 FROM Match_Sub_Contract_Item AS whole
            WHERE whole.sub_contract_id = sc.sub_contract_id
       ) AND NOT EXISTS (
            SELECT 1 FROM Match_Sub_Contract_Item AS pending
            WHERE pending.sub_contract_id = sc.sub_contract_id AND pending.date_deliver IS NULL
       ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS delivery_completed,
       COALESCE(SUM(m.price_contract * m.[count]), 0) AS delivery_amount
FROM Sub_Contract AS sc
JOIN Contract AS c ON sc.contract_id = c.contract_id
JOIN Business AS b ON b.business_id = c.business_id
LEFT JOIN Match_Sub_Contract_Item AS m
  ON m.sub_contract_id = sc.sub_contract_id""" + item_join + """
WHERE c.business_id IN ({placeholders})
  {destination_clause}
  {date_from_clause}
  {date_to_clause}
GROUP BY sc.sub_contract_id, b.business_id, b.biz_name, sc.delivery_dest_name,
         sc.sub_contract_name, sc.delivery_date_contract
""" + ("HAVING COUNT(m.match_id) > 0\n" if item_filters_active else "") + """
ORDER BY sc.delivery_date_contract, sc.sub_contract_id
"""
    sql = sql.replace("{placeholders}", ", ".join("?" for _ in selected))
    sql = sql.replace("{vendor_placeholders}", ", ".join("?" for _ in selected_vendors))
    sql = sql.replace(
        "{destination_clause}",
        "AND LTRIM(RTRIM(sc.delivery_dest_name)) IN (" + ", ".join("?" for _ in selected_destinations) + ")"
        if selected_destinations else "",
    )
    # Explicit date predicates avoid SQL Server/ODBC's ambiguous `? IS NULL` parameter typing.
    # Compare the date portion so a datetime value on the end date is included.
    sql = sql.replace('{date_from_clause}', 'AND sc.delivery_date_contract >= ?' if date_from else '')
    sql = sql.replace('{date_to_clause}', 'AND CONVERT(date, sc.delivery_date_contract) <= ?' if date_to else '')
    params = item_params
    params += selected + selected_destinations
    if date_from:
        params.append(date_from)
    if date_to:
        params.append(date_to)
    conn = _connect()
    try:
        records = _rows(conn.cursor().execute(sql, *params))
        return {"items": [{
            "subContractId": row["sub_contract_id"],
            "businessId": row["business_id"],
            "businessName": row["biz_name"],
            "destination": row["delivery_dest_name"],
            "subContractName": row["sub_contract_name"],
            "deliveryDate": _date(row["delivery_date_contract"]),
            "itemCount": int(row["item_count"]),
            "pointCount": int(row["point_count"]),
            "prCount": int(row["pr_count"]),
            "poCount": int(row["po_count"]),
            "receivedCount": int(row["received_count"]),
            "deliveredCount": int(row["delivered_count"]),
            "deliveredQuantity": int(row["delivered_quantity"]),
            "latestDeliveredAt": _date(row["latest_delivered_at"]),
            "deliveryCompleted": bool(row["delivery_completed"]),
            "deliveryAmount": float(row["delivery_amount"]),
        } for row in records], "readOnly": True}
    finally:
        conn.close()


@router.get("/delivery-rounds/{sub_contract_id}/items")
def round_items(
    sub_contract_id: int = Path(..., ge=1),
    business_id: int = Query(..., alias="businessId", ge=1),
    vendor: str = Query("", max_length=200),
    vendors: Annotated[list[str] | None, Query(alias="vendors")] = None,
):
    selected_vendors = list(dict.fromkeys(v.strip() for v in (vendors or ([vendor] if vendor else [])) if v.strip()))
    if len(selected_vendors) > 100 or any(len(v) > 200 for v in selected_vendors):
        raise HTTPException(422, "조달원 선택 개수 또는 길이가 제한을 초과했습니다.")
    _require_db()
    conn = _connect()
    try:
        records = _rows(conn.cursor().execute("""
SELECT m.match_id, i.item_id, i.item_num, i.item_name_kor,
       m.[count] AS quantity, m.date_receiving_expect, m.date_receiving,
       m.date_deliver, m.price_contract,
       m.purchase_request_Number, m.purchase_order_Number,
       v.vendor_name, buyer.user_name AS buyer_name
FROM Match_Sub_Contract_Item AS m
JOIN Sub_Contract AS sc ON sc.sub_contract_id = m.sub_contract_id
JOIN Contract AS c ON c.contract_id = sc.contract_id
JOIN Item AS i ON i.item_id = m.item_id
LEFT JOIN Vendor AS v ON v.vendor_id = m.vendor_id
LEFT JOIN Users AS buyer ON buyer.user_id = m.buyer
WHERE m.sub_contract_id = ? AND c.business_id = ?
  {vendor_clause}
ORDER BY m.match_id
""".replace(
    "{vendor_clause}",
    "AND LTRIM(RTRIM(v.vendor_name)) IN (" + ", ".join("?" for _ in selected_vendors) + ")" if selected_vendors else "",
), sub_contract_id, business_id, *selected_vendors))
        return {"items": [{
            "matchId": row["match_id"],
            "itemId": row["item_id"],
            "itemNumber": row["item_num"],
            "itemName": row["item_name_kor"],
            "quantity": row["quantity"],
            "receivingExpected": _date(row["date_receiving_expect"]),
            "receivedAt": _date(row["date_receiving"]),
            "deliveredAt": _date(row["date_deliver"]),
            "contractPrice": float(row["price_contract"]) if row["price_contract"] is not None else None,
            "purchaseRequestNumber": row["purchase_request_Number"],
            "purchaseOrderNumber": row["purchase_order_Number"],
            "vendorName": row["vendor_name"],
            "buyerName": row["buyer_name"],
        } for row in records], "readOnly": True}
    finally:
        conn.close()
