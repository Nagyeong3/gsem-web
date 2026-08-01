import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshotDirectory = 'docs/prototype-screenshots';

test.beforeAll(async () => {
  await mkdir(screenshotDirectory, { recursive: true });
});

test('대시보드가 1440×900 기준으로 표시되고 검색 화면으로 이동한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '지원장비 관리 현황' })).toBeVisible();
  await expect(page.getByText('확인이 필요한 업무', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('12', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2,346', { exact: true })).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('기준정보 관리');
  expect(bodyText).not.toContain('사원');
  expect(bodyText).not.toContain('대리');
  expect(bodyText).not.toContain('과장');

  await page.screenshot({
    path: `${screenshotDirectory}/dashboard.png`,
    fullPage: false,
  });

  await page.getByRole('button', { name: '장비 검색' }).click();
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
});

test('장비 검색의 필터·빈 결과·상세 패널이 동작한다', async ({ page }) => {
  await page.goto('/equipment');
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  await expect(page.getByText('12건')).toBeVisible();
  await expect(page.getByRole('complementary', { name: '선택 장비 상세' })).toBeVisible();
  await expect(page.getByText('A장비', { exact: true }).first()).toBeVisible();

  await page.getByLabel('사업').click();
  await page.getByRole('option', { name: '나 사업' }).click();
  await expect(page.getByText('4건')).toBeVisible();

  const searchInput = page.getByLabel('품번, 품명, 용도 검색');
  await searchInput.fill('존재하지 않는 품목');
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();

  await page.getByRole('button', { name: '검색 조건 초기화' }).click();
  await expect(page.getByText('12건')).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0 }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${screenshotDirectory}/equipment-search.png`,
    fullPage: false,
  });

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
});

test('장비 검색에서 통합 상세로 이동해 복수 사업과 담당자를 확인한다', async ({ page }) => {
  await page.goto('/equipment');
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  await page.getByRole('button', { name: '전체 상세' }).click();

  await expect(page).toHaveURL(/\/equipment\/1$/);
  await expect(page.getByRole('heading', { name: '장비 통합 상세' })).toBeVisible();
  await expect(page.getByText('가 사업', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('나 사업', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('김책임', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('이선임', { exact: true })).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('기준정보 관리');
  expect(bodyText).not.toContain('사원');
  expect(bodyText).not.toContain('대리');
  expect(bodyText).not.toContain('과장');

  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${screenshotDirectory}/equipment-detail.png`,
    fullPage: false,
  });

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
});

test('대시보드 납품 지표에서 일정 관리로 이동하고 필터링한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /이번 달 납품 예정/ }).click();
  await expect(page).toHaveURL(/\/deliveries$/);
  await expect(page.getByRole('heading', { name: '납품 일정 관리' })).toBeVisible();
  await expect(page.getByRole('table', { name: '납품 일정 목록' })).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0 }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${screenshotDirectory}/delivery-schedule.png`, fullPage: false });

  await page.getByLabel('진행 상태').click();
  await page.getByRole('option', { name: '완료' }).click();
  await expect(page.getByText('완료', { exact: true }).first()).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).toContain('판정 규칙 미확정');
  expect(bodyText).not.toContain('기준정보 관리');
  expect(bodyText).not.toContain('사원');
  expect(bodyText).not.toContain('대리');
  expect(bodyText).not.toContain('과장');

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('변경 신청 목록에서 처리 현황과 변경 전후를 조회한다', async ({ page }) => {
  await page.goto('/requests');
  await expect(page.getByRole('heading', { name: '변경 신청 및 처리 현황' })).toBeVisible();
  await expect(page.getByRole('table', { name: '변경 신청 목록' })).toBeVisible();
  await expect(page.getByText('변경 전·후 비교')).toBeVisible();
  await expect(page.getByText('실제 승인 처리는 제공하지 않습니다.', { exact: false })).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0 }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${screenshotDirectory}/change-request.png`, fullPage: false });

  await page.getByLabel('처리 상태').click();
  await page.getByRole('option', { name: '검토 중' }).click();
  await expect(page.getByText('B장비', { exact: true })).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('승인하기');
  expect(bodyText).not.toContain('반려하기');
  expect(bodyText).not.toContain('기준정보 관리');
  expect(bodyText).not.toContain('사원');
  expect(bodyText).not.toContain('대리');
  expect(bodyText).not.toContain('과장');

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('추가 화면이 다크 모드에서도 콘솔 오류와 가로 넘침 없이 표시된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: '다크 모드로 전환' }).click();

  const routes = [
    ['/equipment/1', '장비 통합 상세', 'equipment-detail-dark.png'],
    ['/deliveries', '납품 일정 관리', 'delivery-schedule-dark.png'],
    ['/requests', '변경 신청 및 처리 현황', 'change-request-dark.png'],
  ] as const;

  for (const [route, heading, screenshot] of routes) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0 }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await expect(page.getByRole('button', { name: '라이트 모드로 전환' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${screenshotDirectory}/${screenshot}`, fullPage: false });
  }

  expect(errors).toEqual([]);
});

test('GSEM 명칭과 반투명 선택 메뉴, 테마 전환 상태를 유지한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('지원장비 관리시스템 (GSEM)', { exact: true })).toHaveCount(2);

  const selectedMenu = page.getByRole('button', { name: '대시보드' });
  const selectedBackground = await selectedMenu.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(selectedBackground).not.toBe('rgb(8, 103, 242)');

  await page.getByRole('button', { name: '다크 모드로 전환' }).click();
  await expect(page.getByRole('button', { name: '라이트 모드로 전환' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('gsem-color-mode'))).toBe('dark');
  await page.mouse.move(700, 700);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);

  await page.screenshot({
    path: `${screenshotDirectory}/dashboard-dark.png`,
    fullPage: false,
  });

  await page.reload();
  await expect(page.getByRole('button', { name: '라이트 모드로 전환' })).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(horizontalOverflow).toBe(false);

  await page.goto('/equipment');
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  await expect(page.getByText('12건')).toBeVisible();
  await page.screenshot({
    path: `${screenshotDirectory}/equipment-search-dark.png`,
    fullPage: false,
  });
});
