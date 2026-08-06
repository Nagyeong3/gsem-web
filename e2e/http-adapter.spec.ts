import { expect, test } from '@playwright/test';

test('HTTP Adapter 모드에서 대시보드와 장비 검색 흐름이 동작한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '지원장비 관리 현황' })).toBeVisible();
  await expect(page.getByText('12', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2,346', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '장비 검색' }).click();
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  await expect(page.getByText('12건')).toBeVisible();
  await expect(page.getByText('A장비', { exact: true }).first()).toBeVisible();

  await page.getByLabel('사업').click();
  await page.getByRole('option', { name: '나 사업' }).click();
  await expect(page.getByText('4건')).toBeVisible();

  const searchInput = page.getByLabel('품번, 품명, 용도 검색');
  await searchInput.fill('존재하지 않는 품목');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();

  await page.getByRole('button', { name: '검색 조건 초기화' }).click();
  await expect(page.getByText('12건')).toBeVisible();
  await expect(page.getByRole('complementary', { name: '선택 장비 상세' })).toBeVisible();
});

test('HTTP Adapter 모드에서 상세·납품·변경·대체 이력 화면이 동작한다', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/equipment/1');
  await expect(page.getByRole('heading', { name: '장비 통합 상세' })).toBeVisible();
  await expect(page.getByText('가 사업', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('나 사업', { exact: true }).first()).toBeVisible();

  await page.locator('main').getByRole('button', { name: '납품 일정' }).click();
  await expect(page.getByRole('heading', { name: '납품 일정 관리' })).toBeVisible();
  await expect(page.getByRole('table', { name: '납품 일정 목록' })).toBeVisible();
  await page.getByLabel('진행 상태').click();
  await page.getByRole('option', { name: '진행' }).click();
  await expect(page.getByText('진행', { exact: true }).first()).toBeVisible();

  await page.getByLabel('주요 메뉴').getByRole('button', { name: '변경 신청' }).click();
  await expect(page.getByRole('heading', { name: '변경 신청 및 처리 현황' })).toBeVisible();
  await page.getByLabel('처리 상태').click();
  await page.getByRole('option', { name: '처리 완료' }).click();
  await expect(page.getByText('CHG-XXXXX-01', { exact: true }).first()).toBeVisible();

  await page.getByLabel('주요 메뉴').getByRole('button', { name: '변경 이력' }).click();
  await expect(page.getByRole('heading', { name: '장비 변경 이력' })).toBeVisible();
  await expect(page.getByText('5단계 (현재)')).toBeVisible();
  await expect(page.getByRole('complementary', { name: '변경 상세' })).toContainText(
    'CHG-00009',
  );

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  expect(errors).toEqual([]);
});
