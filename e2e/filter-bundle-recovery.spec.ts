import { test, expect } from '@playwright/test';

const savedNames = 'gsem.preferences.v1.equipment-overview.itemNames';

test('품명 옵션 연속 선택과 추가 검색·부분일치 조건을 보존한다', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const name = page.getByRole('combobox', { name: '품명 검색' });
  await name.fill('시연 품목');
  await page.getByRole('option', { name: '시연 품목 1', exact: true }).click();
  await expect(page.getByRole('option', { name: '시연 품목 2', exact: true })).toBeVisible();
  await page.getByRole('option', { name: '시연 품목 2', exact: true }).click();
  await name.fill('없는 품목');
  await expect(page.getByRole('option')).toHaveCount(0);
  await name.press('Enter');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), savedNames)).toEqual([
    { value: '시연 품목 1', match: 'exact' }, { value: '시연 품목 2', match: 'exact' },
    { value: '없는 품목', match: 'contains' },
  ]);
  const table = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await expect(table.locator(':scope > tbody > tr')).toHaveCount(1);
  await expect(table.locator(':scope > tbody > tr')).toContainText('7,500');
  await name.press('Escape');
  const part = page.getByRole('combobox', { name: '품번 검색' });
  await part.fill('DEMO-001');
  await page.getByRole('option', { name: 'DEMO-001', exact: true }).click();
  await expect(table.locator(':scope > tbody > tr')).toContainText('5,000');
  await page.reload();
  await expect(table.locator(':scope > tbody > tr')).toHaveCount(1);
  await expect(table.locator(':scope > tbody > tr')).toContainText('5,000');
});

test('기존 단일 검색 설정을 부분일치 조건으로 이전하고 초기화한다', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gsem.preferences.v1.equipment-overview.itemName', JSON.stringify('시연 품목 1')));
  await page.goto('/equipment-master-rounds');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), savedNames))
    .toEqual([{ value: '시연 품목 1', match: 'contains' }]);
  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), savedNames)).toEqual([]);
  await page.reload();
  await expect(page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' }).locator(':scope > tbody > tr')).toHaveCount(5);
});

test('달력 차수명·종속 납품부대·칩 색상과 가용 공간 표시를 확인한다', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00+09:00'));
  await page.goto('/deliveries');
  await page.getByRole('button', { name: /^상세 필터/ }).click();
  const round = page.getByRole('combobox', { name: '사업 차수' });
  await round.click();
  await expect(page.getByRole('option')).toHaveText(['2차']);
  await round.press('Escape');
  const destination = page.getByRole('combobox', { name: '납품 부대', exact: true });
  await destination.click();
  await expect(page.getByRole('option')).toHaveText(['나 부대']);
  await destination.press('Escape');
  const card = page.getByRole('button', { name: /가 사업.*2차/ }).first();
  const cardColor = await card.evaluate(element => getComputedStyle(element).backgroundColor);
  const roundChip = round.locator('xpath=ancestor::div[contains(@class,"MuiAutocomplete-root")]').locator('.MuiChip-root:visible').first();
  await expect(roundChip).toHaveCSS('background-color', cardColor);
  const business = page.getByRole('combobox', { name: '사업 선택 (복수)' });
  const businessRoot = business.locator('xpath=ancestor::div[contains(@class,"MuiAutocomplete-root")]');
  await expect(businessRoot.locator('.MuiChip-root:visible')).toHaveCount(3);
  await page.setViewportSize({ width: 700, height: 900 });
  await expect(businessRoot.getByLabel(/추가 선택/)).toBeVisible();
});
