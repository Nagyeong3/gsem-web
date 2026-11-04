"""Read-only SQL Server delivery rounds (sub-contract granularity)."""
from fastapi import APIRouter, HTTPException, Path, Query
from backend.app.api.equipment_master import _connect, _date, _rows, _setting

router = APIRouter()


def _require_db():
    if _setting("GSEM_DATA_SOURCE", "memory").lower() != "sqlserver":
        raise HTTPException(503, "납품 차수 조회는 SQL Server 모드에서만 가능합니다.")


@router.get("/delivery-rounds")
def rounds(business_id: int = Query(..., alias="businessId", ge=1)):
    _require_db()
    conn = _connect()
    try:
        records = _rows(conn.cursor().execute("""
SELECT sc.sub_contract_id, b.biz_name, sc.delivery_dest_name,
       sc.sub_contract_name, sc.delivery_date_contract,
       COUNT(DISTINCT m.item_id) AS item_count,
       COUNT(m.match_id) AS line_count
FROM Sub_Contract AS sc
JOIN Contract AS c ON sc.contract_id = c.contract_id
JOIN Business AS b ON b.business_id = c.business_id
LEFT JOIN Match_Sub_Contract_Item AS m ON m.sub_contract_id = sc.sub_contract_id
WHERE c.business_id = ?
GROUP BY sc.sub_contract_id, b.biz_name, sc.delivery_dest_name,
         sc.sub_contract_name, sc.delivery_date_contract
ORDER BY sc.delivery_date_contract, sc.sub_contract_id
""", business_id))
        return {"items": [{
            "subContractId": row["sub_contract_id"],
            "businessName": row["biz_name"],
            "destination": row["delivery_dest_name"],
            "subContractName": row["sub_contract_name"],
            "deliveryDate": _date(row["delivery_date_contract"]),
            "itemCount": int(row["item_count"]),
            "lineCount": int(row["line_count"]),
        } for row in records], "readOnly": True}
    finally:
        conn.close()


@router.get("/delivery-rounds/{sub_contract_id}/items")
def round_items(
    sub_contract_id: int = Path(..., ge=1),
    business_id: int = Query(..., alias="businessId", ge=1),
):
    _require_db()
    conn = _connect()
    try:
        records = _rows(conn.cursor().execute("""
SELECT m.match_id, i.item_id, i.item_num, i.item_name_kor,
       m.[count] AS quantity, m.date_receiving_expect, m.date_receiving,
       m.date_deliver, m.price_contract,
       v.vendor_name, buyer.user_name AS buyer_name
FROM Match_Sub_Contract_Item AS m
JOIN Sub_Contract AS sc ON sc.sub_contract_id = m.sub_contract_id
JOIN Contract AS c ON c.contract_id = sc.contract_id
JOIN Item AS i ON i.item_id = m.item_id
LEFT JOIN Vendor AS v ON v.vendor_id = m.vendor_id
LEFT JOIN Users AS buyer ON buyer.user_id = m.buyer
WHERE m.sub_contract_id = ? AND c.business_id = ?
ORDER BY m.match_id
""", sub_contract_id, business_id))
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
            "vendorName": row["vendor_name"],
            "buyerName": row["buyer_name"],
        } for row in records], "readOnly": True}
    finally:
        conn.close()
