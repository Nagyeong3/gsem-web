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

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() };
}

test('상태 확인 Endpoint가 Stub 서버임을 반환한다', async () => {
  const { response, body } = await getJson('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', dataSource: 'stub' });
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
