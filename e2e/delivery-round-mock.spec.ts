import { test, expect } from '@playwright/test';

test('delivery round filters, independent details and saved state work in mock mode', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  await expect(page.getByText('목데이터 시연 모드입니다.')).toBeVisible();
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  for (const label of ['종', '점', 'PR', 'PO', '입고', '납품', '납품완료', '납품금액 (원)']) {
    await expect(overview.getByRole('columnheader', { name: label, exact: true })).toBeVisible();
  }
  const first = overview.getByRole('row', { name: /가 사업 1차 품목 보기/ });
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
  await first.click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(6);
  await expect(page.getByRole('table', { name: '1차 납품 품목' }).first()).toBeVisible();
  await expect(page.getByText('1차 · 납품 품목')).toHaveCount(0);

  const second = overview.getByRole('row', { name: /가 사업 2차 품목 보기/ });
  await second.click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(7);
  await overview.getByRole('row', { name: /가 사업 1차 품목 접기/ }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(6);
  await expect(page.getByRole('table', { name: '2차 납품 품목' })).toBeVisible();

  await page.getByRole('combobox', { name: '조달원 (복수)' }).click();
  await page.getByRole('option', { name: '가 조달원' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(4);
  await expect(overview.getByRole('row', { name: /가 사업 1차 품목 보기/ })).toContainText('5');
  await page.reload();
  await expect(page.getByText('가 조달원', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByText('지원장비 통합현황(구)').click();
  await expect(page).toHaveURL(/\/equipment-master$/);
});

test('delivery round UI-only aircraft choice and collapsed sidebar persist', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  await page.getByRole('button', { name: '메뉴 접기' }).click();
  await expect(page.getByRole('button', { name: '메뉴 펼치기' })).toBeVisible();
  await page.getByRole('button', { name: '회전익', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '메뉴 펼치기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '회전익', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('row', { name: /가 사업 1차 품목 보기/ })).toBeVisible();
});

test('delivery indicator colors reflect completion and upcoming contractual deadline', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-10T12:00:00+09:00'));
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const done = overview.getByRole('row', { name: /가 사업 1차 품목 보기/ });
  const dueSoon = overview.getByRole('row', { name: /가 사업 2차 품목 보기/ });
  const notDueSoon = overview.getByRole('row', { name: /나 사업 2차 품목 보기/ });
  await expect(done.getByRole('img', { name: '납품완료' })).toBeVisible();
  await expect(dueSoon.getByRole('img', { name: /납품미완료 · 납기 7일 이내/ })).toBeVisible();
  await expect(notDueSoon.getByRole('img', { name: '납품미완료' })).toBeVisible();
});

test('multiple vendors and destinations combine with OR within a filter', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const vendor = page.getByRole('combobox', { name: '조달원 (복수)' });
  await vendor.click();
  await page.getByRole('option', { name: '가 조달원' }).click();
  await vendor.click();
  await page.getByRole('option', { name: '나 조달원' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);

  const destination = page.getByRole('combobox', { name: '납품 부대 (복수)' });
  await destination.click();
  await page.getByRole('option', { name: '가 부대' }).click();
  await destination.click();
  await page.getByRole('option', { name: '나 부대' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(3);
  await page.reload();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(3);

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
});

test('delivery status multi-select shows only selected categories in mock mode', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-10T12:00:00+09:00'));
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const status = page.getByRole('combobox', { name: '납품완료 (복수)' });

  await status.click();
  await page.screenshot({ path: 'docs/prototype-screenshots/delivery-round-status-menu.png', fullPage: true });
  await page.getByRole('option', { name: '완료', exact: true }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(2);

  // disableCloseOnSelect keeps the status menu open after the first selection.
  await expect(page.getByRole('option', { name: '미완료', exact: true })).toBeVisible();
  await page.getByRole('option', { name: '미완료', exact: true }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(4);

  await page.reload();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(4);

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);

  await status.click();
  await page.getByRole('option', { name: '납기 임박/경과' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1);
  await expect(overview.getByRole('row', { name: /가 사업 2차 품목 보기/ })).toBeVisible();
});

test('equipment thumbnail shows hover preview and click zoom without closing expanded rows', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await overview.getByRole('row', { name: /가 사업 1차 품목 보기/ }).click();
  const thumbnail = page.getByRole('button', { name: 'DEMO-001 이미지 확대' }).first();
  await expect(thumbnail).toBeVisible();
  await expect(thumbnail.getByRole('img', { name: 'DEMO-001 장비 이미지' })).toBeVisible();
  await thumbnail.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.screenshot({ path: 'docs/prototype-screenshots/delivery-round-image-hover.png', fullPage: true });
  await thumbnail.click();
  await expect(page.getByRole('tooltip')).toBeHidden();
  const dialog = page.getByRole('dialog', { name: /DEMO-001/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toBeVisible();
  // Capture the settled dialog, not an intermediate frame of the MUI fade animation.
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'docs/prototype-screenshots/delivery-round-image-preview.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('table', { name: '1차 납품 품목' })).toBeVisible();
});

test('business filtering remains independent from vendor and destination filters', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const business = page.getByRole('combobox', { name: '사업 선택 (복수)' });
  await business.click();
  await page.getByRole('option', { name: '나 사업' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(2);
  await expect(overview.getByRole('row', { name: /가 사업/ })).toHaveCount(0);

  const unit = page.getByRole('combobox', { name: '납품 부대 (복수)' });
  await unit.click();
  await page.getByRole('option', { name: '다 부대' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1);

  const vendor = page.getByRole('combobox', { name: '조달원 (복수)' });
  await vendor.click();
  await page.getByRole('option', { name: '가 조달원' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1);
  await overview.getByRole('row', { name: /나 사업 1차 품목 보기/ }).click();
  await expect(page.getByRole('table', { name: '1차 납품 품목' }).getByRole('row')).toHaveCount(2);
});
