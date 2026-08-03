import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createStubApiServer } from './stub-api.mjs';

let server;
let baseUrl;

before(async () => {
  server = createStubApiServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function getJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() };
}

test('상태 확인 Endpoint가 인메모리 서버와 요청 ID를 반환한다', async () => {
  const { response, body } = await getJson('/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.dataSource, 'memory');
  assert.equal(body.requestId, response.headers.get('x-request-id'));
});

test('요청 ID를 응답·오류·기본 로그까지 일관되게 전달한다', async () => {
  const requestId = 'prototype-request-001';
  const success = await getJson('/api/v1/items?page=1&size=1', {
    headers: { 'X-Request-ID': requestId },
  });
  assert.equal(success.response.headers.get('x-request-id'), requestId);
  assert.equal(success.body.meta.requestId, requestId);

  const failure = await getJson('/api/v1/items?page=0', {
    headers: { 'X-Request-ID': requestId },
  });
  assert.equal(failure.response.headers.get('x-request-id'), requestId);
  assert.equal(failure.body.error.traceId, requestId);
});

test('대시보드 핵심 수치 12건의 정합성을 유지한다', async () => {
  const { response, body } = await getJson('/api/v1/dashboard/overview');
  assert.equal(response.status, 200);
  const metrics = new Map(body.data.metrics.map((metric) => [metric.id, metric.value]));
  assert.equal(metrics.get('ATTENTION'), 12);
  assert.equal(
    metrics.get('ATTENTION'),
    metrics.get('DELAY') + metrics.get('REPLACEMENT') + metrics.get('APPROVAL'),
  );
});

test('대시보드 납품 예정일과 D-day가 한국 날짜 기준으로 일치한다', async () => {
  const { body } = await getJson('/api/v1/dashboard/overview');
  const koreaToday = new Date(Date.now() + 9 * 60 * 60 * 1_000).toISOString().slice(0, 10);
  const todayTimestamp = Date.parse(`${koreaToday}T00:00:00Z`);

  for (const delivery of body.data.upcomingDeliveries) {
    const deliveryTimestamp = Date.parse(`${delivery.deliveryDate}T00:00:00Z`);
    assert.equal(
      (deliveryTimestamp - todayTimestamp) / (24 * 60 * 60 * 1_000),
      delivery.daysLeft,
    );
  }
});

test('품목 검색이 필터·정렬·페이징을 서버에서 처리한다', async () => {
  const { response, body } = await getJson(
    '/api/v1/items?businessId=1&sort=itemNumber%2Casc&page=1&size=2',
  );
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 2);
  assert.ok(body.page.totalElements > 2);
  assert.ok(body.data[0].itemNumber < body.data[1].itemNumber);
  assert.ok(body.data.every((item) => item.businesses.some((business) => business.businessId === 1)));
});

test('복수 사업 품목도 검색 결과에서 한 행만 반환한다', async () => {
  const { response, body } = await getJson('/api/v1/items?query=A장비&page=1&size=20');
  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].businesses.length, 2);
});

test('기본 검색 건수와 나 사업 필터 건수가 화면 계약과 일치한다', async () => {
  const allItems = await getJson('/api/v1/items?page=1&size=20');
  assert.equal(allItems.body.page.totalElements, 12);

  const businessItems = await getJson('/api/v1/items?businessId=2&page=1&size=20');
  assert.equal(businessItems.body.page.totalElements, 4);
});

test('품목 상세와 존재하지 않는 품목 오류 계약을 반환한다', async () => {
  const detail = await getJson('/api/v1/items/1');
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.data.applications.length, 2);

  const missing = await getJson('/api/v1/items/999');
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, 'ITEM_NOT_FOUND');
});

test('잘못된 페이지 크기와 정렬을 400 오류로 거부한다', async () => {
  const { response, body } = await getJson('/api/v1/items?size=101&sort=unknown%2Casc');
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_REQUEST');
  assert.deepEqual(
    body.error.fieldErrors.map((error) => error.field),
    ['size', 'sort'],
  );
});

test('모든 검색 필터와 정렬 항목이 오류 없이 동작한다', async () => {
  const filters = [
    ['itemType', 'SUPPORT_EQUIPMENT'],
    ['aircraftTypeCode', 'AT001'],
    ['businessId', '1'],
    ['subsystemCode', 'SS0001'],
    ['categoryCode', 'CA0001'],
    ['managerUserId', '1'],
    ['destinationId', '1'],
    ['status', 'IN_USE'],
  ];
  const sortFields = [
    'itemNumber',
    'itemNameKor',
    'aircraftType',
    'business',
    'subsystem',
    'category',
    'manager',
    'destination',
    'status',
    'recentChangeDate',
  ];

  for (const [name, value] of filters) {
    const result = await getJson(`/api/v1/items?${name}=${value}&page=1&size=20`);
    assert.equal(result.response.status, 200, `${name} 필터 실패`);
    assert.ok(result.body.page.totalElements > 0, `${name} 필터 결과 없음`);
  }

  for (const field of sortFields) {
    for (const direction of ['asc', 'desc']) {
      const result = await getJson(
        `/api/v1/items?sort=${field}%2C${direction}&page=1&size=20`,
      );
      assert.equal(result.response.status, 200, `${field},${direction} 정렬 실패`);
    }
  }
});

test('납품 일정 조회가 통합 검색과 업무 필터를 처리한다', async () => {
  const all = await getJson('/api/v1/deliveries?page=1&size=100');
  assert.equal(all.response.status, 200);
  assert.ok(all.body.data.length > 0);
  assert.ok(all.body.data.every((item) => Number.isInteger(item.plannedQuantity)));

  const filtered = await getJson(
    '/api/v1/deliveries?businessId=1&status=IN_PROGRESS&page=1&size=100',
  );
  assert.equal(filtered.response.status, 200);
  assert.ok(filtered.body.data.length > 0);
  assert.ok(
    filtered.body.data.every(
      (item) => item.business.businessId === 1 && item.status === 'IN_PROGRESS',
    ),
  );
});

test('변경 신청 조회가 상태·신청자·검색 조건을 처리한다', async () => {
  const filtered = await getJson(
    '/api/v1/change-events?status=PROCESSED&requesterUserId=1&page=1&size=100',
  );
  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.body.data.length, 2);
  assert.ok(filtered.body.data.every((item) => item.requestedBy.name === '김책임'));

  const searched = await getJson('/api/v1/change-events?query=XXXXXX-03&page=1&size=100');
  assert.equal(searched.body.data[0].changeId, 'CHG-XXXXX-03');
});

test('대체 이력 그래프가 5단계와 분기 관계를 표현할 수 있는 데이터를 반환한다', async () => {
  const graph = await getJson('/api/v1/items/1/replacement-graph');
  assert.equal(graph.response.status, 200);
  assert.equal(graph.body.data.nodes.length, 12);
  assert.equal(graph.body.data.edges.length, 12);
  assert.ok(graph.body.data.nodes.some((item) => item.businesses.length > 1));

  const missing = await getJson('/api/v1/items/999/replacement-graph');
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error.code, 'ITEM_NOT_FOUND');
});

test('페이지를 나누어 조회해도 품목 중복이나 누락이 없다', async () => {
  const first = await getJson('/api/v1/items?sort=itemNumber%2Casc&page=1&size=5');
  const second = await getJson('/api/v1/items?sort=itemNumber%2Casc&page=2&size=5');
  const third = await getJson('/api/v1/items?sort=itemNumber%2Casc&page=3&size=5');
  const itemIds = [...first.body.data, ...second.body.data, ...third.body.data].map(
    (item) => item.itemId,
  );

  assert.equal(itemIds.length, 12);
  assert.equal(new Set(itemIds).size, 12);
  assert.deepEqual(first.body.page, {
    page: 1,
    size: 5,
    totalElements: 12,
    totalPages: 3,
  });
});

test('응답 Header와 CORS 허용 범위를 제한한다', async () => {
  const allowed = await getJson('/api/v1/items?page=1&size=1', {
    headers: { Origin: 'http://localhost:5173' },
  });
  assert.match(allowed.response.headers.get('content-type'), /^application\/json/);
  assert.equal(allowed.response.headers.get('cache-control'), 'no-store');
  assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const denied = await getJson('/api/v1/items?page=1&size=1', {
    headers: { Origin: 'https://example.invalid' },
  });
  assert.equal(denied.response.headers.get('access-control-allow-origin'), null);
});

test('지원하지 않는 Method와 잘못된 페이지 값을 공통 오류로 반환한다', async () => {
  const method = await getJson('/api/v1/items', { method: 'POST' });
  assert.equal(method.response.status, 405);
  assert.equal(method.body.error.code, 'METHOD_NOT_ALLOWED');

  for (const query of ['page=0', 'page=abc', 'size=0']) {
    const result = await getJson(`/api/v1/items?${query}`);
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error.code, 'INVALID_REQUEST');
  }
});

test('검색어 길이와 숫자형 필터 입력값을 검증한다', async () => {
  const longQuery = await getJson(`/api/v1/items?query=${'X'.repeat(101)}`);
  assert.equal(longQuery.response.status, 400);
  assert.equal(longQuery.body.error.fieldErrors[0].field, 'query');

  const invalidBusiness = await getJson('/api/v1/deliveries?businessId=abc');
  assert.equal(invalidBusiness.response.status, 400);
  assert.equal(invalidBusiness.body.error.fieldErrors[0].field, 'businessId');
});

test('목업 데이터에 금지된 직급·실제 연락처·깨진 문자·한자가 없다', async () => {
  const items = await getJson('/api/v1/items?page=1&size=100');
  const details = await Promise.all(
    items.body.data.map((item) => getJson(`/api/v1/items/${item.itemId}`)),
  );
  const serialized = JSON.stringify({
    items: items.body.data,
    details: details.map((detail) => detail.body.data),
  });

  assert.doesNotMatch(serialized, /사원|대리|과장|차장|부장/);
  assert.doesNotMatch(serialized, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(serialized, /01[016789]-?\d{3,4}-?\d{4}/);
  assert.doesNotMatch(serialized, /\uFFFD/);
  assert.doesNotMatch(serialized, /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u);
  assert.ok(items.body.data.every((item) => /^XXXXXX-\d{2}$/.test(item.itemNumber)));
  assert.ok(
    items.body.data
      .flatMap((item) => item.managers)
      .every((manager) => /(?:책임|선임)$/.test(manager.name)),
  );
});
