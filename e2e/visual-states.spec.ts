import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshotDirectory = 'docs/prototype-screenshots/flows';

async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(720, 880);
  await page.waitForTimeout(120);
  expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: `${screenshotDirectory}/${name}.png`, fullPage: false });
}

test.beforeAll(async () => {
  await mkdir(screenshotDirectory, { recursive: true });
});

test('V6 주요 동작 상태를 1440×900 화면으로 기록한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '지원장비 관리 현황' })).toBeVisible();
  await page.getByLabel('통합 장비 검색').fill('XXXXXX-01');
  await capture(page, '01-dashboard-search-input');
  await page.getByRole('button', { name: '검색 실행' }).click();
  await expect(page).toHaveURL(/\/equipment\?q=XXXXXX-01/);
  await expect(page.getByRole('heading', { name: '검색 결과 1건' })).toBeVisible();
  await capture(page, '02-equipment-search-result');

  await page.goto('/equipment');
  await expect(page.getByRole('heading', { name: '검색 결과 12건' })).toBeVisible();
  await page.getByLabel('사업').click();
  await page.getByRole('option', { name: '나 사업' }).click();
  await expect(page.getByRole('heading', { name: '검색 결과 4건' })).toBeVisible();
  await capture(page, '03-equipment-business-filter');

  await page.getByRole('button', { name: /최근 변경일/ }).click();
  await expect(page).toHaveURL(/sort=recentChangeDate/);
  await capture(page, '04-equipment-sorted');

  await page.goto('/equipment');
  await page.getByRole('button', { name: '2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await capture(page, '05-equipment-page-2');

  await page.getByLabel('품번, 품명, 용도 검색').fill('존재하지 않는 품목');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();
  await capture(page, '06-equipment-empty');

  await page.goto('/equipment/not-a-number');
  await expect(page.getByText('장비 정보를 찾을 수 없습니다.')).toBeVisible();
  await capture(page, '07-equipment-invalid-id');

  await page.goto('/deliveries');
  await expect(page.getByRole('heading', { name: '납품 일정 관리' })).toBeVisible();
  await page.getByLabel('진행 상태').click();
  await page.getByRole('option', { name: '완료' }).click();
  await expect(page.getByText('완료', { exact: true }).first()).toBeVisible();
  await capture(page, '08-delivery-completed-filter');

  await page.goto('/requests');
  await page.getByLabel('Mock 사용자 역할').click();
  await capture(page, '09-role-selector-open');
  await page.getByRole('option', { name: '일반 조회자' }).click();
  await expect(page.getByRole('button', { name: '변경 신청 초안' })).toBeDisabled();
  await capture(page, '10-change-request-viewer-role');

  await page.getByLabel('Mock 사용자 역할').click();
  await page.getByRole('option', { name: '지원장비 담당자' }).click();
  await page.getByRole('button', { name: '변경 신청 초안' }).click();
  await page.getByLabel('변경 사유').fill('프로토타입 변경 사유');
  await expect(page.getByRole('dialog', { name: '변경 신청 초안' })).toBeVisible();
  await capture(page, '11-change-request-draft-dialog');
  await page.getByRole('button', { name: '메모리에 보관' }).click();
  await expect(page.getByText('브라우저 메모리에만 보관', { exact: false })).toBeVisible();
  await capture(page, '12-change-request-draft-saved');

  await page.goto('/history');
  await expect(page.getByText('5단계 (현재)')).toBeVisible();
  await page.getByLabel('변경 이력 검색').fill('A-4장비');
  await expect(page.getByText('A-4장비', { exact: true }).first()).toBeVisible();
  await capture(page, '13-change-history-search');
  await page.getByLabel('변경 이력 검색').fill('');
  await page.getByText('B-1장비', { exact: true }).click();
  await expect(page.getByRole('complementary', { name: '변경 상세' })).toContainText('B-1장비');
  await capture(page, '14-change-history-branch-selection');

  await page.getByRole('button', { name: '알림' }).click();
  await expect(page.getByText('현재 프로토타입에서는 제공하지 않는 기능입니다.')).toBeVisible();
  await capture(page, '15-unavailable-feature-notice');

  await page.getByRole('button', { name: '다크 모드로 전환' }).click();
  await expect(page.getByRole('button', { name: '라이트 모드로 전환' })).toBeVisible();
  await capture(page, '16-change-history-branch-dark');

  expect(errors).toEqual([]);
});
