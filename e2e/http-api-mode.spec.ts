import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshotDirectory = 'docs/prototype-screenshots/flows';

test.beforeAll(async () => {
  await mkdir(screenshotDirectory, { recursive: true });
});

test('HTTP API 모드에서 전체 조회 화면이 인메모리 API와 연결된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    const { url } = message.location();
    if (message.type() === 'error' && !(url.endsWith('/favicon.ico') && message.text().includes('404'))) {
      errors.push(`${url}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));

  const healthResponse = await page.request.get('http://127.0.0.1:4010/health');
  expect(healthResponse.ok()).toBe(true);

  const overviewResponse = page.waitForResponse((response) =>
    response.url().includes('/api/v1/dashboard/overview'),
  );
  await page.goto('/?__gsemDataSource=api');
  const response = await overviewResponse;
  expect(response.status()).toBe(200);
  const overview = (await response.json()) as {
    data: { metrics: Array<{ id: string; value: number }> };
  };
  expect(overview.data.metrics.find((metric) => metric.id === 'ATTENTION')?.value).toBe(12);
  await expect(page.getByText('12', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2,346', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '장비 검색' }).click();
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '검색 결과 12건' })).toBeVisible();
  await page.getByLabel('사업').click();
  await page.getByRole('option', { name: '나 사업' }).click();
  await expect(page.getByRole('heading', { name: '검색 결과 4건' })).toBeVisible();

  await page.goto('/equipment/1');
  await expect(page.getByRole('heading', { name: '장비 통합 상세' })).toBeVisible();
  await expect(page.getByText('가 사업', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('나 사업', { exact: true }).first()).toBeVisible();

  // 월간 일정의 사업 목록은 SQL Server 전용이므로 이 시나리오에서는 사업이 없는 응답을 사용한다.
  await page.route('**/api/v1/equipment-master/businesses', (route) => route.fulfill({ json: [] }));
  await page.locator('main').getByRole('button', { name: '납품 일정' }).click();
  await expect(page.getByRole('grid', { name: /납품 달력/ })).toBeVisible();
  await expect(page.getByText('선택한 조건에 해당하는 월간 일정이 없습니다.')).toBeVisible();

  await page.getByLabel('주요 메뉴').getByRole('button', { name: '변경 이력' }).click();
  await expect(page.getByText('5단계 (현재)')).toBeVisible();
  await expect(page.getByRole('complementary', { name: '변경 상세' })).toContainText(
    'CHG-00009',
  );

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  expect(errors).toEqual([]);
});

test('HTTP API 지연·오류·재시도 상태를 화면으로 기록한다', async ({ page }) => {
  const itemsRoute = '**/api/v1/items?*';
  await page.route(itemsRoute, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    await route.continue();
  });

  await page.goto('/equipment?__gsemDataSource=api');
  await expect(page.getByText('장비 정보를 불러오고 있습니다.')).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/17-equipment-api-loading.png`, fullPage: false });
  await expect(page.getByRole('heading', { name: '검색 결과 12건' })).toBeVisible();
  await page.unroute(itemsRoute);

  await page.route(itemsRoute, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'PROTOTYPE_TEST_ERROR',
          message: '시각 검증용 오류',
          traceId: 'visual-state-001',
        },
      }),
    });
  });
  await page.reload();
  await expect(page.getByText('장비 정보를 불러오지 못했습니다.')).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/18-equipment-api-error.png`, fullPage: false });

  await page.unroute(itemsRoute);
  await page.getByRole('button', { name: '다시 불러오기' }).click();
  await expect(page.getByRole('heading', { name: '검색 결과 12건' })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/19-equipment-api-recovered.png`, fullPage: false });

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('v0.20.0 API: status changes and hide-completed never wait for a manual refresh', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-10T12:00:00+09:00'));
  let roundRequests = 0;
  const rows = [
    { subContractId: 101, businessId: 10, businessName: '가 사업', destination: '가 부대', subContractName: '1차',
      deliveryDate: '2026-12-12', itemCount: 1, pointCount: 1, prCount: 1, poCount: 1,
      receivedCount: 1, deliveredCount: 1, deliveryCompleted: true, deliveryAmount: 1000 },
    { subContractId: 102, businessId: 10, businessName: '가 사업', destination: '가 부대', subContractName: '2차',
      deliveryDate: '2026-12-15', itemCount: 1, pointCount: 1, prCount: 0, poCount: 0,
      receivedCount: 0, deliveredCount: 0, deliveryCompleted: false, deliveryAmount: 2000 },
    { subContractId: 103, businessId: 10, businessName: '가 사업', destination: '가 부대', subContractName: '3차',
      deliveryDate: '2027-03-31', itemCount: 1, pointCount: 1, prCount: 0, poCount: 0,
      receivedCount: 0, deliveredCount: 0, deliveryCompleted: false, deliveryAmount: 3000 },
  ];
  await page.route('**/api/v1/equipment-master/businesses', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify([{ businessId: 10, businessName: '가 사업' }]),
  }));
  await page.route('**/api/v1/delivery-rounds/filter-options?*', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ vendors: ['가 조달원'], destinations: ['가 부대'], itemNames: ['유압 시험장비', '유압 호스', '전원장치'], itemNumbers: ['A-001', 'A-002'] }),
  }));
  await page.route('**/api/v1/delivery-rounds?*', (route) => {
    roundRequests += 1;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: rows }) });
  });
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(3);
  const initialRequests = roundRequests;

  await page.getByRole('checkbox', { name: '납품완료된 항목 숨김' }).check();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(2);
  expect(roundRequests).toBe(initialRequests);
  await page.getByRole('checkbox', { name: '납품완료된 항목 숨김' }).uncheck();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(3);

  const status = page.getByRole('combobox', { name: '납품완료 (복수)' });
  await status.click();
  await page.getByRole('option', { name: '완료', exact: true }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1);
  await page.getByRole('option', { name: '미완료', exact: true }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(2);
  expect(roundRequests).toBe(initialRequests);
  await page.getByRole('checkbox', { name: '납품완료된 항목 숨김' }).check();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1);
  await expect(overview.locator('progressbar')).toHaveCount(0);
  expect(roundRequests).toBe(initialRequests);
  const itemName = page.getByRole('combobox', { name: '품명 검색' });
  await itemName.fill('유압');
  await expect(page.getByRole('option', { name: '유압 시험장비' })).toBeVisible();
  await expect(page.getByRole('option', { name: '전원장치' })).toHaveCount(0);
  await itemName.fill('유압 호');
  await expect(page.getByRole('option', { name: '유압 호스' })).toBeVisible();
  await expect(page.getByRole('option', { name: '유압 시험장비' })).toHaveCount(0);
});

test('월간 일정 API의 월 범위와 사업 ID를 유지하고 오류 후 재시도한다', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-08-20T12:00:00+09:00'));
  await page.route('**/api/v1/equipment-master/businesses', (route) => route.fulfill({
    json: [{ businessId: 101, businessName: '가 사업' }],
  }));
  let septemberRequests = 0;
  await page.route('**/api/v1/delivery-calendar/events?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.getAll('businessIds')).toEqual(['101']);
    expect(params.get('roundOnly')).toBe('true');
    if (params.get('dateFrom') === '2026-08-01') {
      expect(params.get('dateTo')).toBe('2026-08-31');
      return route.fulfill({ json: { items: [{
        id: 'contract-1001', type: 'contract', date: '2026-08-15',
        businessId: 101, businessName: '가 사업', subContractId: 1001,
        subContractName: '1차', destination: '가 부대', deliveryCompleted: true,
        itemId: null, matchId: null, itemNumber: null, itemName: null, quantity: null,
      }] } });
    }
    expect(params.get('dateFrom')).toBe('2026-09-01');
    expect(params.get('dateTo')).toBe('2026-09-30');
    septemberRequests += 1;
    return route.fulfill(septemberRequests === 1 ? { status: 503 } : { json: { items: [] } });
  });

  await page.goto('/deliveries');
  const augustEvent = page.getByRole('button', { name: /2026-08-15 납품 예정일/ });
  await expect(augustEvent).toBeVisible();
  await page.getByRole('button', { name: '다음 달' }).click();
  await expect(page.getByRole('alert')).toContainText('월간 일정 조회 실패 (HTTP 503)');
  await expect(augustEvent).toHaveCount(0);
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByText('선택한 조건에 해당하는 월간 일정이 없습니다.')).toBeVisible();
  expect(septemberRequests).toBe(2);
});

test('차수 선택 상태와 더보기 목록은 현재 달력 일정과 일치한다', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-08-20T12:00:00+09:00'));
  await page.route('**/api/v1/equipment-master/businesses', route => route.fulfill({ json: [{ businessId: 101, businessName: '가 사업' }] }));
  await page.route('**/api/v1/delivery-calendar/events?*', route => route.fulfill({ json: { items: Array.from({ length: 8 }, (_, i) => ({
    id: `contract-${1001+i}`, type: 'contract', date: '2026-08-15', businessId: 101, businessName: '가 사업', subContractId: 1001+i,
    subContractName: `${i+1}차`, destination: '가 부대', deliveryCompleted: false, itemId: null, matchId: null, itemNumber: null, itemName: null, quantity: null,
  })) } }));
  await page.goto('/deliveries');
  const day = page.getByRole('gridcell', { name: '2026-08-15 일정 8건' });
  await expect(day).toBeVisible();
  await page.getByRole('button', { name: '상세 필터', exact: true }).click();
  await page.getByRole('combobox', { name: '사업 차수' }).click();
  const option = page.getByRole('option', { name: '가 사업 · 1차 · 가 부대', exact: true });
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('option', { selected: true })).toHaveCount(8);
  await option.click();
  await expect(option).toHaveAttribute('aria-selected', 'false');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('gridcell', { name: '2026-08-15 일정 7건' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('gridcell', { name: '2026-08-15 일정 7건' })).toBeVisible();
  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(day).toBeVisible();
  const more = day.getByRole('button', { name: /더보기/ });
  await more.hover();
  await expect(page.getByRole('tooltip')).toContainText('숨겨진 일정');
  await testInfo.attach('calendar-overflow-hover', { body: await page.screenshot(), contentType: 'image/png' });
  await more.click();
  await expect(page.getByRole('dialog', { name: '2026-08-15 일정 (8건)' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: '통합현황에서 보기' })).toHaveCount(8);
  await testInfo.attach('calendar-overflow-dialog', { body: await page.screenshot(), contentType: 'image/png' });
});
