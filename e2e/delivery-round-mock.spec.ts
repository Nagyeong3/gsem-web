import { test, expect } from '@playwright/test';

test('new delivery-round overview works with mock data and stores filters', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  await expect(page.getByText('목데이터 시연 모드입니다.')).toBeVisible();
  await expect(page.getByText('고정익 시연사업 A').first()).toBeVisible();
  await expect(page.getByRole('row', { name: /회전익 시연사업 B/ }).first()).toBeVisible();

  await page.getByRole('row', { name: /고정익 시연사업 A/ }).first().click();
  await expect(page.getByText('DEMO-A01').first()).toBeVisible();

  await page.getByRole('button', { name: '메뉴 접기' }).click();
  await expect(page.getByRole('button', { name: '메뉴 펼치기' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '메뉴 펼치기' })).toBeVisible();

  await page.getByRole('button', { name: '회전익', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '회전익', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
