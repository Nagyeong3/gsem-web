"""실DB 장비 검색: 연결 스키마 및 페이징·안전한 파라미터 검증."""
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from backend.app.api import equipment_search as api
from backend.app.main import app

client = TestClient(app)


def test_search_routes_exist_but_do_not_use_mock_rows():
    for path in ('/api/v1/equipment-search', '/api/v1/equipment-search/filter-options', '/api/v1/equipment-search/22'):
        response = client.get(path)
        assert response.status_code == 503  # 실제 SQL 연결 없이는 mock으로 대체하지 않는다.


def test_search_escapes_like_and_parameterizes_filters():
    clauses, params = api._conditions('A_%', 12, 'KUH', '홍길동', '101대대')
    assert "ESCAPE '~'" in clauses
    assert "i.item_nsn LIKE ? ESCAPE '~'" in clauses
    assert "si.KAI_PN LIKE ? ESCAPE '~'" in clauses
    assert 'item_usage' not in clauses
    assert params[:5] == ['%A~_~%%'] * 5
    assert params[5:] == [12, 'KUH', '홍길동', '101대대']
    assert '홍길동' not in clauses


def test_assemble_groups_duplicate_business_links_by_item_id():
    cursor = MagicMock()
    cursor.description = [('placeholder',)]
    item_rows = [
        {'item_id': 5, 'item_num': 'P-5', 'item_nsn': '0000-00-000-0000', 'item_name_kor': '시험장비',
         'item_name_eng': 'Test',
         'item_usage_kor': '점검', 'item_usage_eng': 'Inspection', 'manufacture_name': '공급업체',
         'item_image_path': './Images/a.png',
         'diminishing': 0, 'integrated_id': 11, 'business_id': 101, 'biz_name': '사업A',
         'code_ATYPE': 'KUH', 'manager_name': 'A'},
        {'item_id': 5, 'item_num': 'P-5', 'item_nsn': '0000-00-000-0000', 'item_name_kor': '시험장비',
         'item_name_eng': 'Test',
         'item_usage_kor': '점검', 'item_usage_eng': 'Inspection', 'manufacture_name': '공급업체',
         'item_image_path': './Images/a.png',
         'diminishing': 0, 'integrated_id': 12, 'business_id': 102, 'biz_name': '사업B',
         'code_ATYPE': 'LAH', 'manager_name': 'B'},
    ]
    delivery_rows = [{'integrated_id': 11, 'match_id': 9, 'sub_contract_id': 50,
                      'sub_contract_name': '1차', 'delivery_dest_name': '부대',
                      'delivery_date_contract': None, 'quantity': 3,
                      'date_receiving_expect': None, 'date_receiving': None, 'date_deliver': None,
                      'price_contract': 100, 'purchase_request_Number': 'PR1',
                      'purchase_order_Number': 'PO1', 'vendor_name': '조달원', 'buyer_name': '바이어'}]
    manager_rows = [{'item_id': 5, 'user_name': 'A'}, {'item_id': 5, 'user_name': 'B'}]
    responses = [item_rows, delivery_rows, manager_rows, [
        {'item_id': 5, 'field_name': 'system', 'code': 'S1', 'code_name': '시연 계통'},
    ]]
    old_rows = api._rows
    try:
        api._rows = lambda _: responses.pop(0)
        items = api._assemble(cursor, [5])
    finally:
        api._rows = old_rows
    assert len(items) == 1
    assert len(items[0]['applications']) == 2
    assert items[0]['itemNsn'] == '0000-00-000-0000'
    assert items[0]['imageAvailable'] is True
    assert items[0]['managers'] == ['A', 'B']
    assert items[0]['systems'] == [{'code': 'S1', 'name': '시연 계통'}]
    assert items[0]['applications'][0]['deliveries'][0]['purchaseOrderNumber'] == 'PO1'


def test_advanced_filters_apply_to_count_and_paged_results(monkeypatch):
    connection = MagicMock()
    cursor = connection.cursor.return_value
    cursor.execute.return_value.fetchone.return_value = (0,)
    monkeypatch.setattr(api, '_check_mode', lambda: None)
    monkeypatch.setattr(api, '_connect', lambda: connection)
    monkeypatch.setattr(api, '_rows', lambda cursor: [])

    response = client.get('/api/v1/equipment-search', params=[
        ('itemNum', 'P_%'), ('itemUsageEng', 'Inspection'), ('itemNsn', '0000'),
        ('kaiPartNumber', 'K_%'), ('serdNumber', 'S-001'),
        ('subsystems', 'SYS1'), ('subsystems', 'SYS2'),
        ('maintenanceLevels', 'L1'), ('categories', 'CAT1'),
    ])

    assert response.status_code == 200, response.text
    count, page = [call.args for call in cursor.execute.call_args_list]
    for sql, *params in (count, page):
        assert "i.item_num LIKE ? ESCAPE '~'" in sql
        assert "i.item_usage_eng LIKE ? ESCAPE '~'" in sql
        assert "i.item_nsn LIKE ? ESCAPE '~'" in sql
        assert 'ss.code_SSYST IN (?, ?)' in sql
        assert 'lom.code_LOM IN (?)' in sql
        assert 'AND i.code_CATEG IN (?)' in sql
        assert 'FROM dbo.SERD_Info AS si WHERE si.serd_info_id = i.serd_info_id' in sql
        assert "si.KAI_PN LIKE ? ESCAPE '~' AND si.SERD_No LIKE ? ESCAPE '~'" in sql
        assert params[:9] == ['%P~_~%%', '%Inspection%', '%0000%', '%K~_~%%', '%S-001%', 'SYS1', 'SYS2', 'L1', 'CAT1']
    assert page[-2:] == (0, 20)


def test_suggestions_limit_results_and_use_requested_field(monkeypatch):
    connection = MagicMock()
    cursor = connection.cursor.return_value
    monkeypatch.setattr(api, '_check_mode', lambda: None)
    monkeypatch.setattr(api, '_connect', lambda: connection)
    monkeypatch.setattr(api, '_rows', lambda cursor: [{'value': 'K_001'}])

    response = client.get('/api/v1/equipment-search/suggestions', params={'field': 'kaiPartNumber', 'query': 'K_'})
    assert response.status_code == 200, response.text
    assert response.json() == {'options': ['K_001']}
    sql, value = cursor.execute.call_args.args
    assert 'SELECT DISTINCT TOP (8)' in sql
    assert 'JOIN dbo.SERD_Info' in sql
    assert 'VALUES (si.KAI_PN)' in sql
    assert value == '%K~_%'
    assert client.get('/api/v1/equipment-search/suggestions',
                      params={'field': 'unsupported', 'query': 'K_'}).status_code == 422
    assert cursor.execute.call_count == 1


def test_batch_search_uses_exact_deduplicated_part_numbers_with_filters(monkeypatch):
    connection = MagicMock()
    cursor = connection.cursor.return_value
    cursor.execute.return_value.fetchone.return_value = (0,)
    monkeypatch.setattr(api, '_check_mode', lambda: None)
    monkeypatch.setattr(api, '_connect', lambda: connection)
    monkeypatch.setattr(api, '_rows', lambda cursor: [])

    response = client.post('/api/v1/equipment-search/batch',
                           params={'itemNameKor': '시연', 'sort': 'itemNumber,desc'},
                           json=[' 0001 ', '0001', 'X_%'])
    assert response.status_code == 200, response.text
    count, page = [call.args for call in cursor.execute.call_args_list]
    for sql, *params in (count, page):
        assert 'AND i.item_num IN (?, ?)' in sql
        assert params[:3] == ['%시연%', '0001', 'X_%']
    assert 'CONVERT(nvarchar(4000), i.item_num)' in page[0]
    assert 'sort_value DESC, item_id' in page[0]
    assert client.post('/api/v1/equipment-search/batch', json=['X'] * 501).status_code == 400
    assert client.post('/api/v1/equipment-search/batch', json=['   ']).status_code == 400


def test_search_sorts_by_kai_part_number_before_paging(monkeypatch):
    connection = MagicMock()
    cursor = connection.cursor.return_value
    cursor.execute.return_value.fetchone.return_value = (0,)
    monkeypatch.setattr(api, '_check_mode', lambda: None)
    monkeypatch.setattr(api, '_connect', lambda: connection)
    monkeypatch.setattr(api, '_rows', lambda cursor: [])

    response = client.get('/api/v1/equipment-search', params={'sort': 'kaiPartNumber,desc', 'page': 2, 'size': 10})
    assert response.status_code == 200, response.text
    sql, offset, size = cursor.execute.call_args.args
    assert 'si.KAI_PN FROM dbo.SERD_Info' in sql
    assert 'CASE WHEN sort_value IS NULL THEN 1 ELSE 0 END, sort_value DESC, item_id' in sql
    assert (offset, size) == (10, 10)
