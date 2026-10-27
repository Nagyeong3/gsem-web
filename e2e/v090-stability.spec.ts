import { test, expect } from '@playwright/test';

test('통합현황과 장비 검색 사이드바는 정확히 하나만 선택된다', async ({ page }) => {
  await page.goto('/equipment-master');
  const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
  const master = navigation.getByRole('button', { name: '지원장비 통합현황' });
  const search = navigation.getByRole('button', { name: '장비 검색' });
  await expect(master).toHaveAttribute('aria-current', 'page');
  await expect(search).not.toHaveAttribute('aria-current', 'page');

  await page.goto('/equipment');
  await expect(search).toHaveAttribute('aria-current', 'page');
  await expect(master).not.toHaveAttribute('aria-current', 'page');

  await page.goto('/equipment/1');
  await expect(search).toHaveAttribute('aria-current', 'page');
  await expect(master).not.toHaveAttribute('aria-current', 'page');
});

test('장비 검색 조건 칩 X는 URL과 검색 입력창을 동시에 초기화한다', async ({ page }) => {
  await page.goto('/equipment?q=FC-PO-49');
  const input = page.getByRole('textbox', { name: '품번, 품명, 용도 검색' });
  await expect(input).toHaveValue('FC-PO-49');
  const chip = page.locator('.MuiChip-root').filter({ hasText: '검색어: FC-PO-49' });
  await expect(chip).toBeVisible();
  await chip.locator('.MuiChip-deleteIcon').click();
  await expect(input).toHaveValue('');
  await expect(page).not.toHaveURL(/[?&]q=/);
  await expect(chip).toHaveCount(0);
});
