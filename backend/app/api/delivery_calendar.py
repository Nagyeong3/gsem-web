"""Read-only month-view contract, expected receiving and delivery events.

Dedicated router so missing deployments are straightforward to verify in OpenAPI.
"""
from datetime import date as date_type
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from backend.app.api.delivery_rounds import _business_ids
from backend.app.api.equipment_master import _connect, _date, _rows, _setting

router = APIRouter()


def _require_db():
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "월간 납품 일정 조회는 SQL Server 모드에서만 가능합니다.")


@router.get("/delivery-calendar/events")
def calendar_events(
    date_from: Annotated[date_type, Query(alias="dateFrom")],
    date_to: Annotated[date_type, Query(alias="dateTo")],
    business_ids: Annotated[list[int] | None, Query(alias="businessIds")] = None,
    include_details: bool = Query(False, alias="includeDetails"),
    include_received: bool = Query(False, alias="includeReceived"),
    round_only: bool = Query(False, alias="roundOnly"),
):
    """Monthly contract-date and item-level receiving/delivery events (read only).

    Query each date column independently; filtering contracts by due date before
    reading their lines would omit item events from other months.
    """
    selected = _business_ids(None, business_ids)
    if date_from > date_to:
        raise HTTPException(422, "시작일이 종료일보다 늦습니다.")
    if (date_to - date_from).days > 62:
        raise HTTPException(422, "일정 조회 기간은 최대 63일입니다.")
    _require_db()
    placeholders = ", ".join("?" for _ in selected)
    # Separate date predicates on their own indexed columns. UNION ALL retains
    # multiple distinct item records sharing a single calendar date.
    contract_sql = f"""
SELECT sc.sub_contract_id, b.business_id, b.biz_name, sc.sub_contract_name,
       sc.delivery_dest_name, sc.delivery_date_contract AS event_date,
       CAST('contract' AS varchar(16)) AS event_type,
       CAST(NULL AS int) AS match_id, CAST(NULL AS int) AS item_id,
       CAST(NULL AS nvarchar(200)) AS item_num,
       CAST(NULL AS nvarchar(400)) AS item_name_kor,
       CAST(NULL AS int) AS quantity,
       CASE WHEN EXISTS (SELECT 1 FROM Match_Sub_Contract_Item all_lines
                        WHERE all_lines.sub_contract_id = sc.sub_contract_id)
            AND NOT EXISTS (SELECT 1 FROM Match_Sub_Contract_Item pending
                            WHERE pending.sub_contract_id = sc.sub_contract_id
                              AND pending.date_deliver IS NULL)
            THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS delivery_completed
FROM Sub_Contract sc
JOIN Contract c ON c.contract_id = sc.contract_id
JOIN Business b ON b.business_id = c.business_id
WHERE c.business_id IN ({placeholders})
  AND sc.delivery_date_contract >= ?
  AND sc.delivery_date_contract < DATEADD(day, 1, CAST(? AS date))
"""
    item_sql = f"""
SELECT sc.sub_contract_id, b.business_id, b.biz_name, sc.sub_contract_name,
       sc.delivery_dest_name, {{date_column}} AS event_date,
       CAST('{{event_type}}' AS varchar(16)) AS event_type,
       m.match_id, i.item_id, i.item_num, i.item_name_kor,
       m.[count] AS quantity,
       CASE WHEN EXISTS (SELECT 1 FROM Match_Sub_Contract_Item all_lines
                        WHERE all_lines.sub_contract_id = sc.sub_contract_id)
            AND NOT EXISTS (SELECT 1 FROM Match_Sub_Contract_Item pending
                            WHERE pending.sub_contract_id = sc.sub_contract_id
                              AND pending.date_deliver IS NULL)
            THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS delivery_completed
FROM Match_Sub_Contract_Item m
JOIN Sub_Contract sc ON sc.sub_contract_id = m.sub_contract_id
JOIN Contract c ON c.contract_id = sc.contract_id
JOIN Business b ON b.business_id = c.business_id
JOIN Item i ON i.item_id = m.item_id
WHERE c.business_id IN ({placeholders})
  AND {{date_column}} >= ?
  AND {{date_column}} < DATEADD(day, 1, CAST(? AS date))
"""
    receiving_sql = item_sql.replace("{date_column}", "m.date_receiving_expect").replace("{event_type}", "receiving")
    delivered_sql = item_sql.replace("{date_column}", "m.date_deliver").replace("{event_type}", "delivered")
    queries = [contract_sql] if round_only else [contract_sql, receiving_sql, delivered_sql]
    if include_received and not round_only:
        queries.append(item_sql.replace("{date_column}", "m.date_receiving").replace("{event_type}", "received"))
    sql = "\nUNION ALL\n".join(queries) + "\nORDER BY event_date, sub_contract_id, match_id"
    params = tuple(selected + [date_from, date_to]) * len(queries)
    conn = _connect()
    try:
        records = _rows(conn.cursor().execute(sql, *params))
        result = []
        for row in records:
            event_type = row["event_type"]
            match_id = row["match_id"]
            result.append({
                "id": f"{event_type}-{match_id if match_id is not None else row['sub_contract_id']}",
                "type": event_type, "date": _date(row["event_date"])[:10],
                "businessId": row["business_id"], "businessName": row["biz_name"],
                "subContractId": row["sub_contract_id"], "subContractName": row["sub_contract_name"],
                "destination": row["delivery_dest_name"],
                "matchId": match_id, "itemId": row["item_id"],
                "itemNumber": row["item_num"], "itemName": row["item_name_kor"],
                "quantity": row["quantity"],
                "deliveryCompleted": bool(row["delivery_completed"]),
            })
        response = {"items": result, "readOnly": True}
        if include_details and not round_only:
            # Query all members of the event-bearing rounds (including items without dates).
            # Batching keeps SQL Server's parameter limit and avoids N+1 HTTP/SQL queries.
            ids = sorted({row["sub_contract_id"] for row in records})
            contexts = {str(round_id): {"deliveryDate": None, "items": []} for round_id in ids}
            for start in range(0, len(ids), 400):
                batch = ids[start:start + 400]
                marks = ", ".join("?" for _ in batch)
                context_sql = f"""
SELECT sc.sub_contract_id, sc.delivery_date_contract, m.match_id, i.item_id,
       i.item_num, i.item_name_kor, m.[count] AS quantity,
       m.date_receiving_expect, m.date_receiving, m.date_deliver, m.price_contract,
       m.purchase_request_Number, m.purchase_order_Number, v.vendor_name,
       buyer.user_name AS buyer_name
FROM Sub_Contract sc
LEFT JOIN Match_Sub_Contract_Item m ON m.sub_contract_id = sc.sub_contract_id
LEFT JOIN Item i ON i.item_id = m.item_id
LEFT JOIN Vendor v ON v.vendor_id = m.vendor_id
LEFT JOIN Users buyer ON buyer.user_id = m.buyer
WHERE sc.sub_contract_id IN ({marks})
ORDER BY sc.sub_contract_id, m.match_id
"""
                for row in _rows(conn.cursor().execute(context_sql, *batch)):
                    context = contexts[str(row["sub_contract_id"])]
                    context["deliveryDate"] = _date(row["delivery_date_contract"])
                    if row["match_id"] is None:
                        continue
                    context["items"].append({
                        "matchId": row["match_id"], "itemId": row["item_id"],
                        "itemNumber": row["item_num"], "itemName": row["item_name_kor"],
                        "quantity": row["quantity"], "vendorName": row["vendor_name"],
                        "buyerName": row["buyer_name"], "receivingExpected": _date(row["date_receiving_expect"]),
                        "receivedAt": _date(row["date_receiving"]), "deliveredAt": _date(row["date_deliver"]),
                        "contractPrice": float(row["price_contract"]) if row["price_contract"] is not None else None,
                        "purchaseRequestNumber": row["purchase_request_Number"],
                        "purchaseOrderNumber": row["purchase_order_Number"],
                    })
            response["roundContexts"] = contexts
        return response
    finally:
        conn.close()
