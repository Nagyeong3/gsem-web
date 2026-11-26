import { test, expect } from '@playwright/test';
import { APP_VERSION } from '../src/config/appVersion';

test('delivery round filters, independent details and saved state work in mock mode', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  await expect(page.getByText('목데이터 시연 모드입니다.')).toBeVisible();
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  for (const label of ['종', '점', 'PR', 'PO', '입고', '납품수량', '납품일', '납품완료', '납품금액 (원)']) {
    await expect(overview.getByRole('columnheader').filter({
      has: page.getByRole('separator', { name: `${label} 열 너비 조절`, exact: true }),
    })).toHaveText(label);
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
  await expect(overview.locator('[data-round-id]')).toHaveCount(4);
  await second.click();
  await expect(page.getByRole('table', { name: '2차 납품 품목' }).getByRole('row')).toHaveCount(2);
  await page.reload();
  await expect(page.getByText('가 조달원', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByText('지원장비 통합현황(구)').click();
  await expect(page).toHaveURL(/\/equipment-master$/);
});

test('navigation footer displays version and collapsed sidebar persists', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  await expect(page.getByRole('note', { name: `GSEM 버전 ${APP_VERSION}` })).toBeVisible();
  await expect(page.getByRole('button', { name: '회전익', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '고정익', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '메뉴 접기' }).click();
  await expect(page.getByRole('button', { name: '메뉴 펼치기' })).toBeVisible();
  await expect(page.getByRole('note', { name: `GSEM 버전 ${APP_VERSION}` })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '메뉴 펼치기' })).toBeVisible();
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
  await expect(page.getByRole('option', { name: '나 조달원' })).toBeVisible();
  await page.getByRole('option', { name: '나 조달원' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);

  const destination = page.getByRole('combobox', { name: '납품 부대 (복수)' });
  await destination.click();
  await page.getByRole('option', { name: '가 부대' }).click();
  await expect(page.getByRole('option', { name: '나 부대' })).toBeVisible();
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


test('item-level filters remove unmatched rounds and recalculate all rollups', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await page.getByRole('combobox', { name: '품번 검색' }).fill('DEMO-002');
  await page.getByRole('option', { name: 'DEMO-002', exact: true }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1);
  const row = overview.getByRole('row', { name: /가 사업 1차 품목 보기/ });
  // The only matching line is item 2, quantity 1, with one PR and one PO.
  await expect(row.getByRole('cell').nth(4)).toHaveText('1');
  await expect(row.getByRole('cell').nth(5)).toHaveText('1');
  await expect(row.getByRole('cell').nth(6)).toHaveText('1');
  await expect(row.getByRole('cell').nth(7)).toHaveText('1');
  await row.click();
  const detail = page.getByRole('table', { name: '1차 납품 품목' });
  await expect(detail.getByRole('row')).toHaveCount(2);
  await expect(detail).toContainText('DEMO-002');
  await expect(detail).not.toContainText('DEMO-001');
  const itemName = page.getByRole('combobox', { name: '품명 검색' });
  await itemName.fill('일치하지 않음');
  await itemName.press('Enter');
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1); // empty-result indicator
  await expect(overview).toContainText('조회할 납품 차수가 없습니다.');
  await page.getByRole('button', { name: '필터 초기화' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
});

test('vendor selection changes the round totals to the matching item rows', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const vendor = page.getByRole('combobox', { name: '조달원 (복수)' });
  await vendor.click();
  await page.getByRole('option', { name: '나 조달원' }).click();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(5);
  const row = overview.getByRole('row', { name: /가 사업 1차 품목 보기/ });
  await expect(row.getByRole('cell').nth(4)).toHaveText('1'); // 종
  await expect(row.getByRole('cell').nth(5)).toHaveText('1'); // 점
  await row.click();
  const detail = page.getByRole('table', { name: '1차 납품 품목' });
  await expect(detail.getByRole('row')).toHaveCount(2);
  await expect(detail).toContainText('DEMO-002');
  await expect(detail).not.toContainText('DEMO-001');
});

test('v0.20.0 hide-completed checkbox and calendar range work together', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-10T12:00:00+09:00'));
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await page.getByRole('checkbox', { name: '납품완료된 항목 숨김' }).check();
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(3);
  await page.getByLabel('납품 예정일 시작').fill('2026-12-01');
  await page.getByLabel('납품 예정일 종료').fill('2026-12-31');
  await expect(overview.locator(':scope > tbody > tr')).toHaveCount(1);
  await expect(overview.getByRole('row', { name: /가 사업 2차 품목 보기/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '납품완료된 항목 숨김' })).toBeChecked();
});

test('v0.20.0 overflow scroll is inside round table not entire page', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/equipment-master-rounds');
  const table = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const container = table.locator('xpath=..');
  expect(await container.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('multi-select chips use available width and show only overflow count', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/equipment-master-rounds');
  const status = page.getByRole('combobox', { name: '납품완료 (복수)' });
  await status.click();
  await page.getByRole('option', { name: '완료', exact: true }).click();
  await page.getByRole('option', { name: '미완료', exact: true }).click();
  await page.getByRole('option', { name: '납기 임박/경과' }).click();
  await page.getByRole('heading', { name: '지원장비 통합현황' }).click();
  const root = status.locator('xpath=ancestor::*[contains(@class,"MuiAutocomplete-root")]');
  const chips = root.locator('.MuiChip-root');
  await expect(chips.first()).toBeVisible();
  const chipLabels = await chips.allTextContents();
  expect(chipLabels.some((text) => text === '완료')).toBe(true);
  expect(chipLabels.some((text) => /^\+\d+$/.test(text))).toBe(true);
  await expect(page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' }).locator('progressbar')).toHaveCount(0);
});

test('expanded item table has only its own bottom horizontal scrollbar', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/equipment-master-rounds');
  await page.getByRole('row', { name: /가 사업 1차 품목 보기/ }).click();
  await expect(page.getByRole('region', { name: '아이템 테이블 상단 가로 스크롤' })).toHaveCount(0);
  const scroller = page.getByRole('region', { name: '아이템 테이블 가로 및 세로 스크롤' });
  await expect(scroller).toBeVisible();
  const range = await scroller.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(range).toBeGreaterThan(0);
  await scroller.evaluate((element) => { element.scrollLeft = 200; });
  expect(await scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.screenshot({ path: 'docs/prototype-screenshots/delivery-round-detail-1024.png', fullPage: true });
});

test('default column widths fill the table at a wide viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/equipment-master-rounds');
  const table = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await expect(table).toBeVisible();
  const widths = await table.evaluate((element) => {
    const container = element.parentElement!;
    return { table: element.getBoundingClientRect().width, container: container.clientWidth };
  });
  expect(Math.abs(widths.table - widths.container)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: 'docs/prototype-screenshots/delivery-round-master-1920.png', fullPage: true });
});

test('zero-delivered rounds show a delivery button when the blank date is hovered', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const zero = page.getByRole('row', { name: /가 사업 2차 품목 보기/ });
  const count = zero.locator('.delivery-date-switch');
  await expect(count.locator('.delivery-number')).toHaveText('-');
  const button = count.getByRole('button', { name: /납품 처리/, includeHidden: true });
  await expect(button).toHaveCount(1);
  await expect(button).toHaveCSS('opacity', '0');
  await count.hover();
  await expect(button).toHaveCSS('opacity', '1');
  await button.click();
  const dialog = page.getByRole('dialog', { name: '납품 처리 확인' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '취소' }).click();
  const complete = page.getByRole('row', { name: /가 사업 1차 품목 보기/ });
  await complete.locator('.delivery-date-switch').hover();
  await expect(complete.getByRole('button', { name: /납품 처리/ })).toHaveCount(0);
});

test('delivery round edit-only controls, bulk checkboxes, and local scroller are accessible', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  await expect(page.getByRole('combobox', { name: '사업 분류' })).toBeVisible();
  await page.getByRole('combobox', { name: '사업 분류' }).click();
  await page.getByRole('option', { name: '회전익' }).click();
  await expect(page.getByRole('row', { name: /가 사업 1차 품목 보기/ })).toBeVisible();
  await page.getByRole('button', { name: /가 사업 1차 납품 예정일 변경/ }).click();
  await expect(page.getByRole('dialog', { name: '납품 예정일 변경' })).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();

  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await overview.getByRole('row', { name: /가 사업 1차 품목 보기/ }).click();
  const details = page.getByRole('table', { name: '1차 납품 품목' });
  await expect(details).toBeVisible();
  const scroller = page.getByRole('region', { name: '아이템 테이블 가로 및 세로 스크롤' });
  await expect(scroller).toBeVisible();
  expect(await scroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await details.getByRole('checkbox', { name: '아이템 모두 선택' }).check();
  await expect(page.getByText('3건 선택됨')).toBeVisible();
  await expect(details.getByRole('checkbox', { name: 'DEMO-001 선택' })).toHaveCount(2);
  const receiptWidth = details.getByRole('separator', { name: '입고일 열 너비 조절' });
  for (let step = 0; step < 14; step += 1) await receiptWidth.press('ArrowRight');
  await details.getByRole('button', { name: 'DEMO-001 입고일 수정', exact: true }).first().click();
  await expect(page.getByLabel('변경할 날짜', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '취소', exact: true }).click();
});

test('monthly calendar displays round due dates only and persists completed filter', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-17T12:00:00+09:00'));
  await page.goto('/deliveries');
  await expect(page.getByRole('grid', { name: /납품 달력/ })).toBeVisible();
  await page.getByRole('button', { name: '시연 일정 보기 (2026년 8월)' }).click();
  const event = page.getByRole('button', { name: /2026-08-15 납품 예정일/ });
  await expect(event).toHaveCount(1);
  await expect(page.getByRole('button', { name: /실제 납품일|입고 예정일|실제 입고일/ })).toHaveCount(0);
  await event.click();
  const modal = page.getByRole('dialog', { name: '2026-08-15 일정 상세' });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('button', { name: '통합현황에서 보기' })).toBeVisible();
  await expect(modal.getByRole('table')).toHaveCount(0);
  await modal.getByRole('button', { name: '닫기' }).click();
  await page.getByRole('checkbox', { name: '납품완료된 차수 숨김' }).check();
  await expect(event).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '납품완료된 차수 숨김' })).toBeChecked();
});

test('item row toggles checkbox and processing buttons only appear for unfinished records', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  await overview.getByRole('row', { name: /가 사업 2차 품목 보기/ }).click();
  const detail = page.getByRole('table', { name: '2차 납품 품목' });
  const first = detail.getByRole('row').filter({ hasText: 'DEMO-003' });
  await first.click();
  await expect(first.getByRole('checkbox', { name: 'DEMO-003 선택' })).toBeChecked();
  await first.click();
  await expect(first.getByRole('checkbox', { name: 'DEMO-003 선택' })).not.toBeChecked();
  await first.getByRole('checkbox', { name: 'DEMO-003 선택' }).check();
  await expect(first.getByRole('checkbox', { name: 'DEMO-003 선택' })).toBeChecked();

  await expect(detail.getByRole('region', { name: '아이템 테이블 상단 가로 스크롤' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '아이템 테이블 가로 및 세로 스크롤' })).toBeVisible();
  await expect(detail.getByRole('columnheader', { name: '입고일' }).getByRole('separator', { name: '입고일 열 너비 조절' })).toBeVisible();
  const resize = overview.locator(':scope > thead').getByRole('separator', { name: '납품일 열 너비 조절' });
  await expect(resize).toBeVisible();
  const previousWidth = Number(await resize.getAttribute('aria-valuenow'));
  await resize.focus();
  await page.keyboard.press('ArrowRight');
  await expect(resize).toHaveAttribute('aria-valuenow', String(previousWidth + 16));

  await first.getByRole('button', { name: 'DEMO-003 납품 처리' }).click();
  await expect(page.getByRole('dialog', { name: '납품 처리 확인' })).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();
  await first.hover();
  await first.getByRole('button', { name: 'DEMO-003 입고 처리', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '입고 처리 동의' })).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();

  await overview.getByRole('row', { name: /가 사업 1차 품목 보기/ }).click();
  const completed = page.getByRole('table', { name: '1차 납품 품목' });
  const done = completed.getByRole('row').filter({ hasText: 'DEMO-001' }).first();
  await expect(done.getByRole('button', { name: 'DEMO-001 납품 처리' })).toHaveCount(0);
  await expect(done.getByRole('button', { name: 'DEMO-001 입고 처리', exact: true })).toHaveCount(0);
});

test('upper-table delivery action opens confirmation without modifying read-only data', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const overview = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const incomplete = overview.getByRole('row', { name: /가 사업 2차 품목 보기/ });
  await incomplete.locator('.delivery-date-switch').hover();
  await incomplete.getByRole('button', { name: '가 사업 2차 납품 처리' }).click();
  const dialog = page.getByRole('dialog', { name: '납품 처리 확인' });
  await expect(dialog).toBeVisible();
  await dialog.locator('input[type=date]').fill('2026-12-12');
  await dialog.getByRole('button', { name: /납품 처리/ }).click();
  await expect(page.getByText('2건 납품 처리 미리보기 · DB 미반영')).toBeVisible();
  await expect(incomplete.locator('.delivery-date-switch')).toHaveText('2026-12-12');
  const done = overview.getByRole('row', { name: /가 사업 1차 품목 보기/ });
  await expect(done.getByRole('button', { name: '가 사업 1차 납품 처리' })).toHaveCount(0);
});


test('typing searches item and delivery status options immediately', async ({ page }, testInfo) => {
  await page.goto('/equipment-master-rounds');
  const name = page.getByRole('combobox', { name: '품명 검색' });
  await name.fill('시연 품목');
  await expect(page.getByRole('option', { name: '시연 품목 1', exact: true })).toBeVisible();
  await name.fill('시연 품목 2');
  await expect(page.getByRole('option', { name: '시연 품목 2', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: '시연 품목 1', exact: true })).toHaveCount(0);
  await testInfo.attach('live-name-options', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('option', { name: '시연 품목 2', exact: true }).click();
  await expect(name).toHaveValue('시연 품목 2');
  await page.getByRole('button', { name: '필터 초기화' }).click();
  const number = page.getByRole('combobox', { name: '품번 검색' });
  await number.fill('demo-002');
  await expect(page.getByRole('option', { name: 'DEMO-002' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'DEMO-001' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const status = page.getByRole('combobox', { name: '납품완료 (복수)' });
  await status.fill('미완');
  await expect(page.getByRole('option', { name: '미완료' })).toBeVisible();
  await expect(page.getByRole('option', { name: '완료', exact: true })).toHaveCount(0);
});


test('master and expanded item tables sort independently', async ({ page }) => {
  await page.goto('/equipment-master-rounds');
  const master = page.getByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const masterHeader = master.getByRole('columnheader', { name: '납품수량', exact: true });
  await masterHeader.getByRole('button').click();
  await expect(masterHeader).toHaveAttribute('aria-sort', 'ascending');
  await expect(master.locator('[data-round-id]').first()).toHaveAttribute('data-round-id', '1002');
  await masterHeader.getByRole('button').click();
  await expect(masterHeader).toHaveAttribute('aria-sort', 'descending');
  await expect(master.locator('[data-round-id]').first()).toHaveAttribute('data-round-id', '1001');

  await master.locator('[data-round-id="1001"]').click();
  await master.locator('[data-round-id="1002"]').click();
  const first = page.getByRole('table', { name: '1차 납품 품목', exact: true });
  const second = page.getByRole('table', { name: '2차 납품 품목', exact: true });
  const firstPart = first.getByRole('columnheader', { name: '품번', exact: true });
  const secondPart = second.getByRole('columnheader', { name: '품번', exact: true });
  await firstPart.getByRole('button').click();
  await firstPart.getByRole('button').click();
  await expect(firstPart).toHaveAttribute('aria-sort', 'descending');
  await expect(first.locator('tbody tr[aria-selected]').first()).toContainText('DEMO-002');
  await expect(secondPart).not.toHaveAttribute('aria-sort', /.+/);
  await expect(second.locator('tbody tr[aria-selected]').first()).toContainText('DEMO-003');
  await expect(masterHeader).toHaveAttribute('aria-sort', 'descending');
});
