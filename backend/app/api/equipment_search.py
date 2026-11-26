"""실제 GSEM SQL Server 품목 검색 — 확인된 컬럼만 사용한다 (읽기 전용)."""
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import StringConstraints

from backend.app.api.equipment_master import _connect, _date, _rows, _setting

router = APIRouter()

# Item 기준으로 한 품번이 복수 사업에 연결되어도 검색 결과는 한 품목으로 표시한다.
ITEM_IDS_FROM = """
FROM Item AS i
JOIN Integrated_Info AS ii ON ii.item_id = i.item_id
JOIN Business AS b ON b.business_id = ii.business_id
WHERE 1=1
"""

SORT_VALUES = {
    'itemNumber': 'i.item_num',
    'itemNameKor': 'i.item_name_kor',
    'itemNameEng': 'i.item_name_eng',
    'itemNsn': 'i.item_nsn',
    'manufacturer': 'i.manufacture_name',
    'kaiPartNumber': '(SELECT si.KAI_PN FROM dbo.SERD_Info AS si WHERE si.serd_info_id = i.serd_info_id)',
    'aircraftType': """(SELECT TOP (1) b1.code_ATYPE FROM Integrated_Info AS a
        JOIN Business AS b1 ON b1.business_id = a.business_id
        WHERE a.item_id = i.item_id ORDER BY a.integrated_id)""",
    'business': """(SELECT TOP (1) b1.biz_name FROM Integrated_Info AS a
        JOIN Business AS b1 ON b1.business_id = a.business_id
        WHERE a.item_id = i.item_id ORDER BY a.integrated_id)""",
    'category': """COALESCE((SELECT TOP (1) c.code_name FROM Common_Code_Detail AS c
        WHERE c.group_code = 'CATEG' AND c.code = i.code_CATEG ORDER BY c.sort_order, c.code_name), i.code_CATEG)""",
    'system': """(SELECT TOP (1) COALESCE(label.code_name, ss.code_SSYST)
        FROM Match_Item_SubSystem AS ss
        OUTER APPLY (SELECT TOP (1) c.code_name FROM Common_Code_Detail AS c
            WHERE c.group_code = 'SSYST' AND c.code = ss.code_SSYST ORDER BY c.sort_order, c.code_name) AS label
        WHERE ss.item_id = i.item_id AND NULLIF(LTRIM(RTRIM(ss.code_SSYST)), '') IS NOT NULL
        ORDER BY ss.code_SSYST)""",
    'manager': """(SELECT MIN(u.user_name) FROM Integrated_Info AS a
        JOIN Match_Managing_Users AS mm ON mm.integrated_id = a.integrated_id
        JOIN Users AS u ON u.user_id = mm.user_id WHERE a.item_id = i.item_id)""",
    'destination': """(SELECT TOP (1) sc.delivery_dest_name FROM Integrated_Info AS a
        JOIN Contract AS c ON c.business_id = a.business_id
        JOIN Sub_Contract AS sc ON sc.contract_id = c.contract_id
        JOIN Match_Sub_Contract_Item AS m ON m.sub_contract_id = sc.sub_contract_id AND m.item_id = a.item_id
        WHERE a.item_id = i.item_id ORDER BY a.integrated_id, sc.sub_contract_id, m.match_id)""",
    # 실DB에 연결된 장비 상태·최근 변경일 값이 없으므로 품목 ID로 순서를 유지한다.
    'status': 'NULL',
    'recentChangeDate': 'NULL',
}

DETAIL_SQL = """
SELECT ii.integrated_id, ii.item_id, ii.business_id, b.biz_name, b.code_ATYPE,
       i.item_num, i.item_nsn, i.item_name_kor, i.item_name_eng, i.item_usage_kor, i.item_usage_eng,
       i.manufacture_name, i.item_image_path, i.diminishing,
       i.item_name_normal, i.code_ICS, i.code_CATEG, si.KAI_PN AS kai_part_number,
       si.SERD_No AS serd_number, si.length_cm, si.width_cm, si.height_cm, si.weight_kg,
       mgr.user_name AS manager_name
FROM Integrated_Info AS ii
JOIN Item AS i ON i.item_id = ii.item_id
JOIN Business AS b ON b.business_id = ii.business_id
LEFT JOIN dbo.SERD_Info AS si ON si.serd_info_id = i.serd_info_id
OUTER APPLY (
    SELECT TOP (1) u.user_name FROM Match_Managing_Users AS mu
    JOIN Users AS u ON u.user_id = mu.user_id
    WHERE mu.integrated_id = ii.integrated_id ORDER BY mu.match_id
) AS mgr
WHERE ii.item_id IN ({placeholders})
ORDER BY ii.item_id, ii.integrated_id
"""

DELIVERIES_SQL = """
SELECT ii.item_id, ii.integrated_id, sc.sub_contract_id, sc.sub_contract_name,
       sc.delivery_dest_name, sc.delivery_date_contract, m.match_id,
       m.[count] AS quantity, m.date_receiving_expect, m.date_receiving,
       m.date_deliver, m.price_contract, m.date_receiving_warranty, m.date_deliver_warranty,
       m.purchase_request_Number, m.purchase_order_Number,
       v.vendor_name, buyer.user_name AS buyer_name
FROM Integrated_Info AS ii
JOIN Contract AS c ON c.business_id = ii.business_id
JOIN Sub_Contract AS sc ON sc.contract_id = c.contract_id
JOIN Match_Sub_Contract_Item AS m ON m.sub_contract_id = sc.sub_contract_id AND m.item_id = ii.item_id
LEFT JOIN Vendor AS v ON v.vendor_id = m.vendor_id
LEFT JOIN Users AS buyer ON buyer.user_id = m.buyer
WHERE ii.item_id IN ({placeholders})
ORDER BY ii.item_id, ii.integrated_id, sc.sub_contract_id, m.match_id
"""


MANAGERS_SQL = """
SELECT DISTINCT ii.item_id, u.user_name
FROM Integrated_Info AS ii
JOIN Match_Managing_Users AS mm ON mm.integrated_id = ii.integrated_id
JOIN Users AS u ON u.user_id = mm.user_id
WHERE ii.item_id IN ({placeholders}) AND u.user_name IS NOT NULL
ORDER BY ii.item_id, u.user_name
"""


def _check_mode():
    if _setting('GSEM_DATA_SOURCE', 'memory').lower() != 'sqlserver':
        raise HTTPException(503, '장비 검색 실DB 조회는 GSEM_DATA_SOURCE=sqlserver에서만 사용 가능합니다.')


def _safe_like(value: str) -> str:
    return '%' + value.replace('~', '~~').replace('%', '~%').replace('_', '~_').replace('[', '[[]') + '%'


def _conditions(query: str, business_id: int | None, aircraft_type: str, manager: str, destination: str):
    clauses = []
    params = []
    if query.strip():
        columns = ("item_num", "item_name_kor", "item_name_eng", "item_nsn")
        choices = " OR ".join(f"i.{column} LIKE ? ESCAPE '~'" for column in columns)
        kai_match = (
            "EXISTS (SELECT 1 FROM dbo.SERD_Info AS si WHERE si.serd_info_id = i.serd_info_id "
            "AND si.KAI_PN LIKE ? ESCAPE '~')"
        )
        clauses.append(f"AND ({choices} OR {kai_match})")
        params.extend([_safe_like(query.strip())] * (len(columns) + 1))
    if business_id:
        clauses.append('AND ii.business_id = ?')
        params.append(business_id)
    if aircraft_type.strip():
        clauses.append('AND b.code_ATYPE = ?')
        params.append(aircraft_type.strip())
    if manager.strip():
        clauses.append('''AND EXISTS (SELECT 1 FROM Match_Managing_Users AS mm
            JOIN Users AS usr ON usr.user_id = mm.user_id
            WHERE mm.integrated_id = ii.integrated_id AND usr.user_name = ?)''')
        params.append(manager.strip())
    if destination.strip():
        clauses.append('''AND EXISTS (SELECT 1 FROM Contract AS cc
            JOIN Sub_Contract AS ss ON ss.contract_id = cc.contract_id
            JOIN Match_Sub_Contract_Item AS mi ON mi.sub_contract_id = ss.sub_contract_id AND mi.item_id = ii.item_id
            WHERE cc.business_id = ii.business_id AND ss.delivery_dest_name = ?)''')
        params.append(destination.strip())
    return '\n'.join(clauses), params


_ADVANCED_TEXT_COLUMNS = {
    'item_num': 'i.item_num',
    'item_name_kor': 'i.item_name_kor',
    'item_name_eng': 'i.item_name_eng',
    'item_usage_kor': 'i.item_usage_kor',
    'item_usage_eng': 'i.item_usage_eng',
    'item_nsn': 'i.item_nsn',
}


def _advanced_conditions(text, subsystems, maintenance_levels, categories):
    clauses = []
    params = []
    for key, column in _ADVANCED_TEXT_COLUMNS.items():
        value = text.get(key, '').strip()
        if value:
            clauses.append(f"AND {column} LIKE ? ESCAPE '~'")
            params.append(_safe_like(value))

    serd_conditions = []
    for key, column in (('kai_part_number', 'KAI_PN'), ('serd_number', 'SERD_No')):
        value = text.get(key, '').strip()
        if value:
            serd_conditions.append(f"si.{column} LIKE ? ESCAPE '~'")
            params.append(_safe_like(value))
    if serd_conditions:
        clauses.append(
            'AND EXISTS (SELECT 1 FROM dbo.SERD_Info AS si WHERE si.serd_info_id = i.serd_info_id AND '
            + ' AND '.join(serd_conditions) + ')'
        )

    for values, predicate in (
        (subsystems, 'EXISTS (SELECT 1 FROM Match_Item_SubSystem AS ss '
                     'WHERE ss.item_id = i.item_id AND ss.code_SSYST IN ({slots}))'),
        (maintenance_levels, 'EXISTS (SELECT 1 FROM Match_Item_LevelOfMaintenance AS lom '
                             'WHERE lom.item_id = i.item_id AND lom.code_LOM IN ({slots}))'),
        (categories, 'i.code_CATEG IN ({slots})'),
    ):
        codes = list(dict.fromkeys(value.strip() for value in values or [] if value.strip()))
        if any(len(code) > 100 for code in codes):
            raise HTTPException(422, '상세 조건 코드가 너무 깁니다.')
        if codes:
            clauses.append('AND ' + predicate.format(slots=', '.join('?' for _ in codes)))
            params.extend(codes)

    return '\n'.join(clauses), params


def _assemble(cursor, ids: list[int]):
    if not ids:
        return []
    placeholders = ', '.join('?' for _ in ids)
    rows = _rows(cursor.execute(DETAIL_SQL.format(placeholders=placeholders), *ids))
    linked = _rows(cursor.execute(DELIVERIES_SQL.format(placeholders=placeholders), *ids))
    manager_rows = _rows(cursor.execute(MANAGERS_SQL.format(placeholders=placeholders), *ids))
    classifications = _classifications(cursor, ids)
    managers_by_item = defaultdict(list)
    for manager in manager_rows:
        managers_by_item[manager['item_id']].append(manager['user_name'])
    by_integrated = defaultdict(list)
    for row in linked:
        by_integrated[row['integrated_id']].append({
            'matchId': row['match_id'], 'subContractId': row['sub_contract_id'],
            'subContractName': row['sub_contract_name'], 'destination': row['delivery_dest_name'],
            'contractDate': _date(row['delivery_date_contract']), 'quantity': row['quantity'],
            'receivingExpected': _date(row['date_receiving_expect']),
            'receivedAt': _date(row['date_receiving']), 'deliveredAt': _date(row['date_deliver']),
            'contractPrice': float(row['price_contract']) if row['price_contract'] is not None else None,
            'purchaseRequestNumber': row['purchase_request_Number'],
            'purchaseOrderNumber': row['purchase_order_Number'],
            'vendorName': row['vendor_name'], 'buyerName': row['buyer_name'],
            'receivingWarrantyDate': _date(row.get('date_receiving_warranty')),
            'deliveryWarrantyDate': _date(row.get('date_deliver_warranty')),
        })
    items = {}
    for row in rows:
        item_id = row['item_id']
        item = items.get(item_id)
        if item is None:
            item = {
                'itemId': item_id, 'itemNumber': row['item_num'], 'itemNsn': row['item_nsn'],
                'kaiPartNumber': row.get('kai_part_number'), 'commonName': row.get('item_name_normal'),
                'itemType': row.get('code_ICS'), 'categoryCode': row.get('code_CATEG'),
                'serd': {'serdNumber': row.get('serd_number'), 'lengthCm': row.get('length_cm'),
                         'widthCm': row.get('width_cm'), 'heightCm': row.get('height_cm'),
                         'weightKg': row.get('weight_kg')},
                'itemNameKor': row['item_name_kor'], 'itemNameEng': row['item_name_eng'],
                'itemUsageKor': row['item_usage_kor'],
                'itemUsageEng': row['item_usage_eng'], 'manufacturer': row['manufacture_name'],
                'imageAvailable': bool(row['item_image_path']), 'diminishing': bool(row['diminishing']),
                'applications': [], 'managers': managers_by_item[item_id], 'source': 'sqlserver',
                **classifications.get(item_id, {}),
            }
            items[item_id] = item
        item['applications'].append({
            'integratedId': row['integrated_id'], 'businessId': row['business_id'],
            'businessName': row['biz_name'], 'aircraftTypeCode': row['code_ATYPE'],
            'deliveries': by_integrated[row['integrated_id']],
        })
    return [items[item_id] for item_id in ids if item_id in items]


@router.get('/equipment-search/filter-options')
def equipment_search_filter_options():
    _check_mode()
    conn = _connect()
    try:
        cursor = conn.cursor()
        businesses = _rows(cursor.execute('''SELECT DISTINCT b.business_id, b.biz_name
            FROM Business AS b JOIN Integrated_Info AS ii ON ii.business_id = b.business_id
            ORDER BY b.biz_name, b.business_id'''))
        aircraft = _rows(cursor.execute('''SELECT DISTINCT b.code_ATYPE
            FROM Business AS b JOIN Integrated_Info AS ii ON ii.business_id = b.business_id
            WHERE b.code_ATYPE IS NOT NULL ORDER BY b.code_ATYPE'''))
        managers = _rows(cursor.execute('''SELECT DISTINCT u.user_name
            FROM Match_Managing_Users AS mu JOIN Users AS u ON u.user_id = mu.user_id
            WHERE u.user_name IS NOT NULL ORDER BY u.user_name'''))
        destinations = _rows(cursor.execute('''SELECT DISTINCT sc.delivery_dest_name
            FROM Sub_Contract AS sc JOIN Match_Sub_Contract_Item AS mi ON mi.sub_contract_id = sc.sub_contract_id
            WHERE sc.delivery_dest_name IS NOT NULL ORDER BY sc.delivery_dest_name'''))
        code_rows = _rows(cursor.execute("""
            SELECT group_code, code, code_name FROM Common_Code_Detail
            WHERE group_code IN ('SSYST', 'LOM', 'CATEG') AND code IS NOT NULL
            ORDER BY group_code, sort_order, code
        """))
        codes = defaultdict(list)
        for row in code_rows:
            code = row['code'].strip()
            if code:
                codes[row['group_code'].strip()].append({'code': code, 'name': row['code_name'] or code})
        return {'businesses': [{'id': r['business_id'], 'name': r['biz_name']} for r in businesses],
                'aircraftTypes': [r['code_ATYPE'] for r in aircraft],
                'managers': [r['user_name'] for r in managers],
                'destinations': [r['delivery_dest_name'] for r in destinations],
                'advanced': {'subsystems': codes['SSYST'], 'maintenanceLevels': codes['LOM'],
                             'categories': codes['CATEG']}, 'source': 'sqlserver'}
    finally:
        conn.close()


def _equipment_search_options(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
    query: str = Query('', max_length=100),
    business_id: int | None = Query(None, alias='businessId', ge=1),
    aircraft_type: str = Query('', alias='aircraftType', max_length=100),
    manager: str = Query('', max_length=200),
    destination: str = Query('', max_length=200),
    sort: str = Query('itemNumber,asc', max_length=80),
    item_num: Annotated[str, Query(alias='itemNum', max_length=200)] = '',
    item_name_kor: Annotated[str, Query(alias='itemNameKor', max_length=200)] = '',
    item_name_eng: Annotated[str, Query(alias='itemNameEng', max_length=200)] = '',
    item_usage_kor: Annotated[str, Query(alias='itemUsageKor', max_length=200)] = '',
    item_usage_eng: Annotated[str, Query(alias='itemUsageEng', max_length=200)] = '',
    item_nsn: Annotated[str, Query(alias='itemNsn', max_length=200)] = '',
    kai_part_number: Annotated[str, Query(alias='kaiPartNumber', max_length=200)] = '',
    serd_number: Annotated[str, Query(alias='serdNumber', max_length=200)] = '',
    subsystems: Annotated[list[str] | None, Query(max_length=50)] = None,
    maintenance_levels: Annotated[list[str] | None, Query(alias='maintenanceLevels', max_length=50)] = None,
    categories: Annotated[list[str] | None, Query(max_length=50)] = None,
):
    _check_mode()
    conditions, params = _conditions(query, business_id, aircraft_type, manager, destination)
    advanced_sql, advanced_params = _advanced_conditions({
        'item_num': item_num, 'item_name_kor': item_name_kor, 'item_name_eng': item_name_eng,
        'item_usage_kor': item_usage_kor, 'item_usage_eng': item_usage_eng, 'item_nsn': item_nsn,
        'kai_part_number': kai_part_number, 'serd_number': serd_number,
    }, subsystems, maintenance_levels, categories)
    if advanced_sql:
        conditions += '\n' + advanced_sql
        params.extend(advanced_params)
    sort_field, _, sort_direction = sort.partition(',')
    order = SORT_VALUES.get(sort_field, SORT_VALUES['itemNumber'])
    direction = 'DESC' if sort_direction.lower() == 'desc' else 'ASC'
    return page, size, conditions, params, order, direction


EquipmentSearchOptions = Annotated[tuple, Depends(_equipment_search_options)]
PartNumber = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


@router.get('/equipment-search')
def search_equipment(options: EquipmentSearchOptions):
    return _search_equipment(options)


@router.post('/equipment-search/batch')
def search_equipment_batch(
    part_numbers: Annotated[list[PartNumber], Body(min_length=1, max_length=500)],
    options: EquipmentSearchOptions,
):
    return _search_equipment(options, part_numbers)


def _search_equipment(options, part_numbers=None):
    page, size, conditions, params, order, direction = options
    if part_numbers:
        numbers = list(dict.fromkeys(part_numbers))
        conditions += '\nAND i.item_num IN (' + ', '.join('?' for _ in numbers) + ')'
        params = [*params, *numbers]
    conn = _connect()
    try:
        cursor = conn.cursor()
        total = cursor.execute('SELECT COUNT(DISTINCT i.item_id) ' + ITEM_IDS_FROM + conditions, *params).fetchone()[0]
        id_rows = _rows(cursor.execute(f"""
            SELECT item_id FROM (
                SELECT DISTINCT i.item_id, NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(4000), {order}))), '') AS sort_value
                {ITEM_IDS_FROM}{conditions}
            ) AS matches
            ORDER BY CASE WHEN sort_value IS NULL THEN 1 ELSE 0 END, sort_value {direction}, item_id
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """, *(params + [(page - 1) * size, size])))
        ids = [r['item_id'] for r in id_rows]
        return {'items': _assemble(cursor, ids), 'page': page, 'size': size,
                'totalElements': total, 'totalPages': max(1, (total + size - 1) // size), 'source': 'sqlserver'}
    finally:
        conn.close()


_SUGGESTION_ITEM_COLUMNS = {
    'itemNum': 'i.item_num',
    'itemNameKor': 'i.item_name_kor',
    'itemNameEng': 'i.item_name_eng',
    'itemUsageKor': 'i.item_usage_kor',
    'itemUsageEng': 'i.item_usage_eng',
    'itemNsn': 'i.item_nsn',
}
_SUGGESTION_SERD_COLUMNS = {'kaiPartNumber': 'si.KAI_PN', 'serdNumber': 'si.SERD_No'}


@router.get('/equipment-search/suggestions')
def suggest_equipment(
    query: Annotated[str, Query(max_length=200)],
    field: Annotated[str, Query(max_length=32)] = 'query',
):
    _check_mode()
    serd_join = ''
    if field == 'query':
        columns = tuple(_SUGGESTION_ITEM_COLUMNS[key] for key in ('itemNum', 'itemNameKor', 'itemNameEng', 'itemNsn'))
        columns += (_SUGGESTION_SERD_COLUMNS['kaiPartNumber'],)
        serd_join = 'LEFT JOIN dbo.SERD_Info AS si ON si.serd_info_id = i.serd_info_id'
    elif field in _SUGGESTION_ITEM_COLUMNS:
        columns = (_SUGGESTION_ITEM_COLUMNS[field],)
    elif field in _SUGGESTION_SERD_COLUMNS:
        columns = (_SUGGESTION_SERD_COLUMNS[field],)
        serd_join = 'JOIN dbo.SERD_Info AS si ON si.serd_info_id = i.serd_info_id'
    else:
        raise HTTPException(422, '지원하지 않는 검색 필드입니다.')
    if not query.strip():
        return {'options': []}
    values = ', '.join(f'({column})' for column in columns)
    sql = f"""
        SELECT DISTINCT TOP (8) LTRIM(RTRIM(suggestion.value)) AS value
        FROM Item AS i
        {serd_join}
        CROSS APPLY (VALUES {values}) AS suggestion(value)
        WHERE suggestion.value LIKE ? ESCAPE '~'
          AND EXISTS (SELECT 1 FROM Integrated_Info AS ii WHERE ii.item_id = i.item_id)
        ORDER BY value
    """
    conn = _connect()
    try:
        return {'options': [row['value'] for row in _rows(conn.cursor().execute(sql, _safe_like(query.strip())))]}
    finally:
        conn.close()


def _classifications(cursor, item_ids: list[int]) -> dict:
    placeholders = ', '.join('?' for _ in item_ids)
    sql = f"""
    SELECT f.item_id, f.field_name, f.code, label.code_name
    FROM (
        SELECT item_id, 'category' AS field_name, 'CATEG' AS group_code, code_CATEG AS code
        FROM Item WHERE item_id IN ({placeholders})
        UNION ALL SELECT item_id, 'system', 'SSYST', code_SSYST
        FROM Match_Item_SubSystem WHERE item_id IN ({placeholders})
        UNION ALL SELECT item_id, 'level', 'LOM', code_LOM
        FROM Match_Item_LevelOfMaintenance WHERE item_id IN ({placeholders})
    ) AS f
    OUTER APPLY (
        SELECT TOP (1) code_name FROM Common_Code_Detail
        WHERE group_code = f.group_code AND code = f.code ORDER BY sort_order, code_name
    ) AS label
    WHERE NULLIF(LTRIM(RTRIM(f.code)), '') IS NOT NULL
    ORDER BY f.item_id, f.field_name, f.code
    """
    values = defaultdict(lambda: defaultdict(dict))
    for row in _rows(cursor.execute(sql, *item_ids, *item_ids, *item_ids)):
        code = row['code'].strip()
        label = (row['code_name'] or '').strip() or code
        values[row['item_id']][row['field_name']][code] = {'code': code, 'name': label}
    return {
        item_id: {'category': next(iter(fields['category'].values()), None),
                  'systems': list(fields['system'].values()), 'maintenanceLevels': list(fields['level'].values())}
        for item_id, fields in values.items()
    }


@router.get('/equipment-search/{item_id}')
def detail_equipment(item_id: int):
    _check_mode()
    if item_id < 1:
        raise HTTPException(404, '품목을 찾을 수 없습니다.')
    conn = _connect()
    try:
        cursor = conn.cursor()
        items = _assemble(cursor, [item_id])
        if not items:
            raise HTTPException(404, '품목을 찾을 수 없습니다.')
        return items[0]
    finally:
        conn.close()
