import { expect, test } from '@playwright/test';

test('장비 검색 열을 사용자별로 저장하고 품번 일괄 검색 결과를 엑셀로 내보낸다', async ({ page }) => {
  await page.goto('/equipment');
  const table = page.getByRole('table', { name: '장비 검색 결과' });
  const firstNumber = (await table.getByRole('row').nth(1).getByRole('cell').nth(2).textContent())!.trim();
  await page.getByRole('button', { name: '컬럼 설정' }).click();
  let dialog = page.getByRole('dialog', { name: '컬럼 설정' });
  await dialog.getByRole('textbox', { name: '사용자 프로필' }).fill('검증용 사용자');
  await dialog.getByRole('button', { name: '전환' }).click();
  await dialog.getByRole('checkbox', { name: '이미지', exact: true }).uncheck();
  await dialog.getByRole('button', { name: '품명 위로', exact: true }).click();
  await dialog.getByRole('textbox', { name: '보기 이름' }).fill('간단 보기');
  await dialog.getByRole('button', { name: '보기 추가' }).click();
  await dialog.getByRole('button', { name: '저장 및 적용' }).click();
  await expect(table.getByRole('columnheader', { name: '이미지' })).toHaveCount(0);
  await expect(table.getByRole('columnheader').nth(1)).toHaveText('품명');
  await page.reload();
  await expect(table.getByRole('columnheader').nth(1)).toHaveText('품명');
  await page.getByRole('button', { name: '컬럼 설정' }).click();
  dialog = page.getByRole('dialog', { name: '컬럼 설정' });
  await dialog.getByRole('combobox', { name: '저장한 보기' }).click();
  await page.getByRole('option', { name: '간단 보기' }).click();
  await dialog.getByRole('button', { name: '저장 및 적용' }).click();

  await page.getByRole('button', { name: '품번 일괄 검색' }).click();
  const batch = page.getByRole('dialog', { name: '품번 일괄 검색' });
  await batch.getByRole('textbox', { name: '품번 목록' }).fill(`${firstNumber},\t${firstNumber}\n미존재-001`);
  await expect(batch.getByText('입력 2개 중 2개 선택')).toBeVisible();
  await batch.getByRole('button', { name: '선택한 품번 검색' }).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  await page.getByRole('button', { name: '엑셀 내보내기' }).click();
  const exporter = page.getByRole('dialog', { name: '검색 결과 엑셀 내보내기' });
  await expect(exporter.getByRole('textbox', { name: '추출 담당자' })).toHaveValue('검증용 사용자');
  const download = page.waitForEvent('download');
  await exporter.getByRole('button', { name: '엑셀 다운로드' }).click();
  expect((await download).suggestedFilename()).toMatch(/^장비검색_검증용 사용자_\d{8}_\d{6}_KST\.xlsx$/);
});
