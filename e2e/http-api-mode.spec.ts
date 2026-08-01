import { expect, test } from '@playwright/test';

test('HTTP API 모드에서 전체 조회 화면이 Stub API와 연결된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  const overviewResponse = page.waitForResponse((response) =>
    response.url().includes('/api/v1/dashboard/overview'),
  );
  await page.goto('/?__gsemDataSource=api');
  expect((await overviewResponse).status()).toBe(200);
  await expect(page.getByText('12', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2,346', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '장비 검색' }).click();
  await expect(page.getByText('12건')).toBeVisible();
  await page.getByLabel('사업').click();
  await page.getByRole('option', { name: '나 사업' }).click();
  await expect(page.getByText('4건')).toBeVisible();

  await page.goto('/equipment/1');
  await expect(page.getByRole('heading', { name: '장비 통합 상세' })).toBeVisible();
  await expect(page.getByText('가 사업', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('나 사업', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '납품 일정' }).click();
  await expect(page.getByRole('table', { name: '납품 일정 목록' })).toBeVisible();
  await page.getByLabel('진행 상태').click();
  await page.getByRole('option', { name: '진행' }).click();
  await expect(page.getByText('진행', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '변경 신청' }).click();
  await page.getByLabel('처리 상태').click();
  await page.getByRole('option', { name: '처리 완료' }).click();
  await expect(page.getByText('CHG-XXXXX-01', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '변경 이력' }).click();
  await expect(page.getByText('5단계 (현재)')).toBeVisible();
  await expect(page.getByRole('complementary', { name: '변경 상세' })).toContainText(
    'CHG-00009',
  );

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  expect(errors).toEqual([]);
});
