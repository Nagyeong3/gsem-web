import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshotDirectory = 'docs/prototype-screenshots';

test.beforeAll(async () => {
  await mkdir(screenshotDirectory, { recursive: true });
});

test('대시보드가 1440×900 기준으로 표시되고 검색 화면으로 이동한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '지원장비 관리 현황' })).toBeVisible();
  await expect(page.getByText('확인이 필요한 업무', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('12', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2,346', { exact: true })).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('기준정보 관리');
  expect(bodyText).not.toContain('사원');
  expect(bodyText).not.toContain('대리');
  expect(bodyText).not.toContain('과장');

  await page.screenshot({
    path: `${screenshotDirectory}/dashboard.png`,
    fullPage: false,
  });

  await page.getByRole('link', { name: '장비 검색' }).click().catch(async () => {
    await page.getByText('장비 검색', { exact: true }).first().click();
  });
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
});

test('장비 검색의 필터·빈 결과·상세 패널이 동작한다', async ({ page }) => {
  await page.goto('/equipment');
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  await expect(page.getByText('12건')).toBeVisible();
  await expect(page.getByRole('complementary', { name: '선택 장비 상세' })).toBeVisible();
  await expect(page.getByText('A장비', { exact: true }).first()).toBeVisible();

  await page.getByLabel('사업').click();
  await page.getByRole('option', { name: '나 사업' }).click();
  await expect(page.getByText('4건')).toBeVisible();

  const searchInput = page.getByLabel('품번, 품명, 용도 검색');
  await searchInput.fill('존재하지 않는 품목');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();

  await page.getByRole('button', { name: '검색 조건 초기화' }).click();
  await expect(page.getByText('12건')).toBeVisible();

  await page.screenshot({
    path: `${screenshotDirectory}/equipment-search.png`,
    fullPage: false,
  });

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
});
