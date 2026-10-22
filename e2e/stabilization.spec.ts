import { expect, test } from '@playwright/test';

test('사이드바는 통합현황과 검색 및 하위 상세에서 정확히 하나만 선택한다', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: '주요 메뉴' });
  for (const [route, label] of [['/equipment-master', '지원장비 통합현황'], ['/equipment', '장비 검색'], ['/equipment/1', '장비 검색'], ['/deliveries', '납품 일정'], ['/requests', '변경 신청'], ['/history', '변경 이력'], ['/', '대시보드']]) {
    await page.goto(route);
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
});

test('검색 실행·필터 개별 삭제·입력 복원·선택 URL을 보존한다', async ({ page }) => {
  await page.goto('/equipment?business=나+사업&size=50');
  const input = page.getByLabel('품번, 품명, 용도 검색');
  await input.fill('존재하지 않는 품목');
  await expect(page.getByText('4건', { exact: true })).toBeVisible();
  await input.press('Enter');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();
  await page.getByRole('button', { name: '검색어: 존재하지 않는 품목 삭제' }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByText('4건', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/business=/);
  await expect(page).toHaveURL(/size=50/);
  await page.getByRole('button', { name: '사업: 나 사업 삭제' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('12건', { exact: true })).toBeVisible();
  await page.goto('/equipment?q=XXXXXX-01&selected=none');
  await expect(input).toHaveValue('XXXXXX-01');
  await expect(page.getByRole('complementary', { name: '선택 장비 상세' })).toHaveCount(0);
  await page.reload();
  await expect(input).toHaveValue('XXXXXX-01');
  await page.goto('/equipment?q=없음');
  await page.goBack();
  await expect(input).toHaveValue('XXXXXX-01');
});

test('장비 검색 너비는 새로고침과 필터 초기화 뒤에도 유지되며 별도로 복원한다', async ({ page }) => {
  await page.goto('/equipment');
  const handle = page.getByRole('separator', { name: '품번 너비', exact: true });
  await expect(handle).toBeVisible();
  await handle.focus(); await page.keyboard.press('ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuenow', '122');
  await page.reload();
  await expect(handle).toHaveAttribute('aria-valuenow', '122');
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(handle).toHaveAttribute('aria-valuenow', '122');
  await page.getByRole('button', { name: '컬럼 너비 초기화', exact: true }).click();
  await expect(handle).toHaveAttribute('aria-valuenow', '112');
});

test('통합현황 검색·필터 삭제와 보기별 컬럼 너비를 저장·복원한다', async ({ page }) => {
  await page.goto('/equipment-master');
  const table = page.getByRole('table', { name: '엑셀 친화형 지원장비 통합현황' });
  await expect(table).not.toContainText(/사원|대리|과장|차장/);
  const header = table.locator('th[data-resize-index="2"]');
  await expect(header).toBeVisible();
  await header.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('gsem:equipment-master:excel:widths:v1') ?? '{}').name)).toBe(250);
  await page.reload();
  await expect(table.locator('col').nth(2)).toHaveAttribute('style', /250px/);
  const input = page.getByLabel('품명, 품번, Material, 조달원 검색');
  await input.fill('존재하지 않는 품목');
  await expect(table.locator('tbody tr').first()).not.toContainText('검색 결과가 없습니다.');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();
  await page.getByRole('button', { name: '검색어: 존재하지 않는 품목 삭제' }).click();
  await expect(input).toHaveValue('');
  await expect(table.locator('col').nth(2)).toHaveAttribute('style', /250px/);
  await page.getByRole('tab', { name: '업무 최적화형' }).click();
  const handle = page.getByRole('separator', { name: '품번 너비', exact: true });
  await handle.focus(); await page.keyboard.press('ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuenow', '130');
  await page.reload();
  await expect(handle).toHaveAttribute('aria-valuenow', '130');
  await page.getByRole('tab', { name: '엑셀 친화형' }).click();
  await expect(table.locator('col').nth(2)).toHaveAttribute('style', /250px/);
  await page.getByRole('button', { name: '통합현황 컬럼 너비 초기화' }).click();
  await expect(table.locator('col').nth(2)).toHaveAttribute('style', /240px/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: 'test-results/screenshots/equipment-master-v0.9.0.png' });
});

test('대시보드 검색은 한글 조합 후 실행하고 전체 보기 링크가 동작한다', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('통합 장비 검색');
  await input.fill(' A장비 ');
  await input.dispatchEvent('compositionstart');
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await expect(page).toHaveURL(/\/$/);
  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(page.getByLabel('품번, 품명, 용도 검색')).toHaveValue('A장비');
  await expect(page.getByText('1건', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByText('최근 변경 이력', { exact: true }).locator('..').getByRole('button', { name: '전체 보기' }).click();
  await expect(page).toHaveURL(/\/history$/);
});
