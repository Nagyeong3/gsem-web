import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const screenshotDirectory = 'docs/prototype-screenshots/v8';

test.beforeAll(async () => {
  await mkdir(screenshotDirectory, { recursive: true });
});

test('장비 검색에서 대표 이미지를 미리 보고 확대한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/equipment');
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  const thumbnail = page.getByRole('table', { name: '장비 검색 결과' })
    .getByRole('button', { name: 'A장비 이미지 확대' });
  await expect(thumbnail).toBeVisible();

  await thumbnail.hover();
  await expect(page.getByText('선택하면 원본 크기로 확인할 수 있습니다.')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${screenshotDirectory}/equipment-search-preview-light.png` });

  await thumbnail.click();
  await expect(page.getByRole('dialog', { name: 'A장비 이미지' })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/equipment-image-dialog-light.png` });
  await page.getByRole('button', { name: '이미지 확대 닫기' }).click();

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('장비 검색과 통합 상세의 이미지가 라이트·다크 모드에서 일관된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/equipment');
  await expect(page.getByRole('complementary', { name: '선택 장비 상세' })
    .getByRole('button', { name: 'A장비 이미지 확대' })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/equipment-search-light.png` });
  await page.screenshot({ path: `${screenshotDirectory}/equipment-search-full-light.png`, fullPage: true });

  await page.goto('/equipment/1');
  await expect(page.getByRole('heading', { name: '장비 통합 상세' })).toBeVisible();
  await expect(page.locator('main').getByRole('button', { name: 'A장비 이미지 확대' })).toBeVisible();
  await page.screenshot({ path: `${screenshotDirectory}/equipment-detail-light.png` });
  await page.screenshot({ path: `${screenshotDirectory}/equipment-detail-full-light.png`, fullPage: true });

  await page.getByRole('button', { name: '다크 모드로 전환' }).click();
  await expect(page.getByRole('button', { name: '라이트 모드로 전환' })).toBeVisible();
  await page.mouse.move(700, 700);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshotDirectory}/equipment-detail-dark.png` });

  await page.goto('/equipment');
  await expect(page.getByRole('heading', { name: '장비 검색' })).toBeVisible();
  await page.mouse.move(700, 700);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshotDirectory}/equipment-search-dark.png` });

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});
