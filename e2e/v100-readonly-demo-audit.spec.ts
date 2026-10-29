import { expect, test } from '@playwright/test';

const pages = [
  ['/', '지원장비 관리 현황'],
  ['/equipment-master', '지원장비 통합현황'],
  ['/equipment', '장비 검색'],
  ['/equipment/1', '장비 통합 상세'],
  ['/deliveries', '납품 일정 관리'],
  ['/history', '장비 변경 이력'],
] as const;

test('1차 데모: 주요 화면에서 가로 전체 페이지 스크롤과 런타임 오류가 없어야 한다', async ({ page }) => {
  test.setTimeout(90_000);
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, title] of pages) {
      const errors: string[] = [];
      const record = (error: Error) => errors.push(error.message);
      page.on('pageerror', record);
      await page.goto(route);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      expect(errors, `${route} at ${width}px`).toEqual([]);
      page.off('pageerror', record);
    }
  }
});

test('1차 데모: 변경 승인 요청 경로는 열리지 않으며 변경 이력은 조회 가능하다', async ({ page }) => {
  await page.goto('/requests');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: '지원장비 관리 현황' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '변경 신청' })).toHaveCount(0);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '변경 이력' }).click();
  await expect(page.getByRole('heading', { name: '장비 변경 이력' })).toBeVisible();
});

test('1차 데모: 통합현황 두 보기의 테이블에서만 스크롤하고 탭 전환이 가능하다', async ({ page }) => {
  await page.goto('/equipment-master');
  const excel = page.getByRole('table', { name: '엑셀 친화형 지원장비 통합현황' });
  await expect(excel).toBeVisible();
  const height = await excel.locator('xpath=..').evaluate(el => el.getBoundingClientRect().height);
  expect(height).toBeLessThanOrEqual(800);
  await page.getByRole('tab', { name: '업무 최적화형' }).click();
  await expect(page.getByRole('table', { name: '업무 최적화형 지원장비 통합현황' })).toBeVisible();
  await page.getByRole('tab', { name: '엑셀 친화형' }).click();
  await expect(excel).toBeVisible();
});

test('1차 데모: 장비 검색에서 키보드 Enter 검색, 칩 삭제, 필터 초기화가 이어진다', async ({ page }) => {
  await page.goto('/equipment');
  const search = page.getByRole('textbox', { name: '품번, 품명, 용도 검색' });
  await search.fill('존재하지 않는 품목');
  await search.press('Enter');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();
  const chip = page.locator('.MuiChip-root').filter({ hasText: '검색어: 존재하지 않는 품목' });
  await expect(chip).toBeVisible();
  await chip.locator('.MuiChip-deleteIcon').click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('table', { name: '장비 검색 결과' })).toBeVisible();
});

test('엑셀형 통합현황은 두 줄 제목행을 스크롤 중에도 고정한다', async ({ page }) => {
  await page.goto('/equipment-master');
  const table = page.getByRole('table', { name: '엑셀 친화형 지원장비 통합현황' });
  await expect(table).toBeVisible();
  const scroller = table.locator('xpath=..');
  const headers = table.locator('thead tr');
  await expect(headers).toHaveCount(2);
  const first = headers.nth(0).locator('th').first();
  const second = headers.nth(1).locator('th').first();
  // Mock data may contain fewer rows than the scroll viewport. Add display-only copies
  // inside the browser fixture to exercise the sticky layout without changing app data.
  await table.locator('tbody').evaluate((body) => {
    const sample = body.querySelector('tr');
    if (!sample) throw new Error('Expected a rendered equipment row');
    for (let i = 0; i < 28; i += 1) body.appendChild(sample.cloneNode(true));
  });
  const before = await Promise.all([first.boundingBox(), second.boundingBox()]);
  await scroller.evaluate((el) => { el.scrollTop = 240; el.scrollLeft = 320; });
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const after = await Promise.all([first.boundingBox(), second.boundingBox()]);
  expect(before[0]).not.toBeNull();
  expect(before[1]).not.toBeNull();
  expect(after[0]).not.toBeNull();
  expect(after[1]).not.toBeNull();
  expect(Math.abs(after[0]!.y - before[0]!.y)).toBeLessThan(3);
  expect(Math.abs(after[1]!.y - before[1]!.y)).toBeLessThan(3);
  expect(after[1]!.y).toBeGreaterThanOrEqual(after[0]!.y + 40);
});
