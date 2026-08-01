import { expect, test } from '@playwright/test';

test('Stub API 모드에서 대시보드와 장비 검색 흐름이 동작한다', async ({ page }) => {
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
