import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshotDirectory = 'docs/prototype-screenshots/flows';

test.beforeAll(async () => {
  await mkdir(screenshotDirectory, { recursive: true });
});

test('HTTP API 모드에서 전체 조회 화면이 인메모리 API와 연결된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
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

  await page.locator('main').getByRole('button', { name: '납품 일정' }).click();
  await expect(page.getByRole('table', { name: '납품 일정 목록' })).toBeVisible();
  await page.getByLabel('진행 상태').click();
  await page.getByRole('option', { name: '진행' }).click();
  await expect(page.getByText('진행', { exact: true }).first()).toBeVisible();

  await page.getByLabel('주요 메뉴').getByRole('button', { name: '변경 신청' }).click();
  await page.getByLabel('처리 상태').click();
  await page.getByRole('option', { name: '처리 완료' }).click();
  await expect(page.getByText('CHG-XXXXX-01', { exact: true }).first()).toBeVisible();

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
