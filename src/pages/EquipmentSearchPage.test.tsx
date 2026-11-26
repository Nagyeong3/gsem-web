import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EquipmentSearchPage } from './EquipmentSearchPage';

beforeEach(() => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:equipment-export'; }
    static revokeObjectURL() { /* 다운로드 URL은 테스트 종료 시 되돌린다. */ }
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('프로필별 컬럼을 저장하고 일괄 품번에 맞는 결과만 엑셀로 추출한다', async () => {
  const show = () => render(<MemoryRouter initialEntries={['/equipment']}><EquipmentSearchPage /></MemoryRouter>);
  let view = show();
  const getTable = () => screen.findByRole('table', { name: '장비 검색 결과' });
  const firstItem = within(await getTable()).getAllByRole('row')[1];
  const firstNumber = within(firstItem).getAllByRole('cell')[2].textContent!.trim();

  fireEvent.click(screen.getByRole('button', { name: '컬럼 설정' }));
  fireEvent.change(screen.getByRole('textbox', { name: '사용자 프로필' }), { target: { value: '검증용 사용자' } });
  fireEvent.click(screen.getByRole('button', { name: '전환' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '이미지' }));
  fireEvent.click(screen.getByRole('button', { name: '품명 위로' }));
  fireEvent.change(screen.getByRole('textbox', { name: '보기 이름' }), { target: { value: '간단 보기' } });
  fireEvent.click(screen.getByRole('button', { name: '보기 추가' }));
  fireEvent.click(screen.getByRole('button', { name: '저장 및 적용' }));
  expect(within(await getTable()).getAllByRole('columnheader')[1]).toHaveTextContent('품명');
  view.unmount();
  view = show();
  expect(within(await getTable()).getAllByRole('columnheader')[1]).toHaveTextContent('품명');
  expect(within(await getTable()).queryByRole('columnheader', { name: '이미지' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '품번 일괄 검색' }));
  fireEvent.change(screen.getByRole('textbox', { name: '품번 목록' }), { target: { value: `${firstNumber},\t${firstNumber}\n미존재-001` } });
  expect(screen.getByText('입력 2개 중 2개 선택')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '선택한 품번 검색' }));
  await waitFor(() => expect(within(screen.getByRole('table', { name: '장비 검색 결과' })).getAllByRole('row')).toHaveLength(2));

  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: '엑셀 내보내기' }));
  expect(screen.getByRole('textbox', { name: '추출 담당자' })).toHaveValue('검증용 사용자');
  fireEvent.click(screen.getByRole('button', { name: '엑셀 다운로드' }));
  await waitFor(() => expect(download).toHaveBeenCalledOnce());
  expect((download.mock.instances[0] as HTMLAnchorElement).download)
    .toMatch(/^장비검색_검증용 사용자_\d{8}_\d{6}_KST\.xlsx$/);
  view.unmount();
}, 20_000);

it('상세 조건을 인라인으로 적용하고 숨긴 필터의 적용 상태와 표시 설정을 유지한다', async () => {
  const show = () => render(<MemoryRouter initialEntries={['/equipment']}><EquipmentSearchPage /></MemoryRouter>);
  let view = show();
  fireEvent.click(screen.getByRole('button', { name: '상세 조건' }));
  const panel = screen.getByRole('region', { name: '장비 검색 상세 조건' });
  expect(screen.queryByRole('dialog', { name: '장비 검색 상세 조건' })).not.toBeInTheDocument();
  fireEvent.change(within(panel).getByRole('combobox', { name: '품번' }), { target: { value: 'XXXXXX' } });
  fireEvent.click(within(panel).getByRole('button', { name: '적용' }));
  expect(screen.getByText('품번: XXXXXX')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '필터 표시 설정' }));
  const settings = screen.getByRole('region', { name: '필터 표시 설정' });
  fireEvent.click(within(settings).getByRole('checkbox', { name: '품번' }));
  fireEvent.click(within(settings).getByRole('checkbox', { name: '기종' }));
  expect(within(panel).queryByRole('combobox', { name: '품번' })).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: '기종' })).not.toBeInTheDocument();
  expect(screen.getByText('품번: XXXXXX')).toBeVisible();
  view.unmount();
  view = show();
  expect(screen.queryByRole('combobox', { name: '기종' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^상세 조건/ }));
  expect(within(screen.getByRole('region', { name: '장비 검색 상세 조건' })).queryByRole('combobox', { name: '품번' }))
    .not.toBeInTheDocument();
  view.unmount();
}, 20_000);

it('숨겨진 열이 통합검색에 일치하면 일치 항목에 실제 값을 강조한다', async () => {
  render(<MemoryRouter initialEntries={['/equipment?q=Equipment+A']}><EquipmentSearchPage /></MemoryRouter>);
  const table = await screen.findByRole('table', { name: '장비 검색 결과' });
  expect(within(table).getByRole('columnheader', { name: '일치 항목' })).toBeVisible();
  const marked = table.querySelector('mark');
  expect(marked).toHaveTextContent('Equipment A');
  expect(marked?.parentElement).toHaveTextContent('영문 품명');
}, 15_000);


it('이미지 외 데이터 컬럼에 정렬을 제공하고 KAI 품번의 방향을 바꾼다', async () => {
  render(<MemoryRouter initialEntries={['/equipment']}><EquipmentSearchPage /></MemoryRouter>);
  const table = await screen.findByRole('table', { name: '장비 검색 결과' });
  const headers = within(table).getAllByRole('columnheader');
  expect(within(within(table).getByRole('columnheader', { name: '이미지' })).queryByRole('button')).toBeNull();
  for (const header of headers.slice(2)) {
    expect(within(header).getByRole('button')).toBeVisible();
  }
  fireEvent.click(within(table).getByRole('button', { name: 'KAI 품번' }));
  await waitFor(() => expect(screen.getByRole('columnheader', { name: 'KAI 품번' })).toHaveAttribute('aria-sort', 'ascending'));
  fireEvent.click(await screen.findByRole('button', { name: 'KAI 품번' }));
  await waitFor(() => expect(screen.getByRole('columnheader', { name: 'KAI 품번' })).toHaveAttribute('aria-sort', 'descending'));
});
