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

test('old overview stays accessible and new overview has compact expandable rows', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  for (const label of ['종', '평', 'PR', 'PO', '입고', '납품', '납품완료', '납품금액']) {
    await expect(overview.getByRole('columnheader', { name: label, exact: true })).toBeVisible();
  }
  const dataRow = overview.getByRole('row', { name: /고정익 시연사업 A 1차 품목 보기/ });
  await expect(dataRow).toHaveCount(1);
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
  await dataRow.click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(6);
  await expect(page.getByRole('table', { name: '1차 납품 품목' })).toBeVisible();
  await overview.getByRole('row', { name: /고정익 시연사업 A 1차 품목 접기/ }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByText('지원장비 통합현황(구)').click();
  await expect(page).toHaveURL(/\/equipment-master$/);
});
