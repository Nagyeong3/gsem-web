import { test, expect } from '@playwright/test';

test('통합현황 더블클릭 상세와 독립 장비 상세가 같은 품목 ID를 조회한다', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await overview.getByRole('row', { name: /가 사업 1차 품목 보기/ }).click();
  const items = page.getByRole('table', { name: '1차 납품 품목' });
  const item = items.getByRole('row').filter({ hasText: 'DEMO-001' }).first();
  const checkbox = item.getByRole('checkbox', { name: 'DEMO-001 선택' });
  await expect(checkbox).not.toBeChecked();
  await item.getByRole('cell', { name: 'DEMO-001', exact: true }).dblclick();
  const dialog = page.getByRole('dialog', { name: '장비 통합 상세' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('XXXXXX-01', { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(/\/equipment-master-rounds$/);
  await dialog.getByRole('button', { name: '장비 상세 닫기' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(checkbox).not.toBeChecked();
  await item.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('XXXXXX-01', { exact: true }).first()).toBeVisible();
  await page.goto('/equipment/1');
  await expect(page.getByRole('heading', { name: '장비 통합 상세' })).toBeVisible();
  await expect(page.getByText('XXXXXX-01', { exact: true }).first()).toBeVisible();
});
