import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { DeliveryRoundMasterPage } from './DeliveryRoundMasterPage';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it('상위와 각 하위 표를 독립적으로 정렬하고 빈 납품일에서 미리보기로 처리한다', async () => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
  render(<MemoryRouter><DeliveryRoundMasterPage /></MemoryRouter>);
  const master = await screen.findByRole('table', { name: '납품 차수별 지원장비 통합현황' });
  const masterHeader = within(master).getByRole('columnheader', { name: '납품수량' });
  const sortQuantity = within(masterHeader).getByRole('button');
  fireEvent.click(sortQuantity);
  expect(masterHeader).toHaveAttribute('aria-sort', 'ascending');
  expect(master.querySelector('[data-round-id]')).toHaveAttribute('data-round-id', '1002');
  fireEvent.click(sortQuantity);
  expect(masterHeader).toHaveAttribute('aria-sort', 'descending');
  const complete = master.querySelector('[data-round-id="1001"]') as HTMLTableRowElement;
  const incomplete = master.querySelector('[data-round-id="1002"]') as HTMLTableRowElement;
  expect(master.querySelector('[data-round-id]')).toBe(complete);
  expect(complete.querySelector('.delivery-date-switch')).toHaveTextContent('2026-08-12');
  expect(incomplete.querySelector('.delivery-date-switch .delivery-number')).toHaveTextContent('-');
  fireEvent.click(complete);
  fireEvent.click(incomplete);
  const first = await screen.findByRole('table', { name: '1차 납품 품목' });
  const second = await screen.findByRole('table', { name: '2차 납품 품목' });
  for (const label of ['KAI 품번', '업체 보증기간', 'KAI 보증기간']) {
    expect(within(first).getByRole('columnheader', { name: label })).toBeVisible();
  }
  for (const value of ['KAI-DEMO-01', '2027-08-01', '2027-08-12']) {
    expect(within(first).getByRole('cell', { name: value })).toBeVisible();
  }
  const firstPart = within(first).getByRole('columnheader', { name: '품번' });
  const secondPart = within(second).getByRole('columnheader', { name: '품번' });
  const sortPart = within(firstPart).getByRole('button');
  fireEvent.click(sortPart);
  fireEvent.click(sortPart);
  expect(firstPart).toHaveAttribute('aria-sort', 'descending');
  expect(first.querySelector('tbody tr[aria-selected]')).toHaveTextContent('DEMO-002');
  expect(secondPart).not.toHaveAttribute('aria-sort');
  expect(second.querySelector('tbody tr[aria-selected]')).toHaveTextContent('DEMO-003');
  expect(masterHeader).toHaveAttribute('aria-sort', 'descending');

  const delivery = within(incomplete).getByRole('button', { name: '가 사업 2차 납품 처리' });
  expect(delivery.closest('td')).toBe(incomplete.querySelector('.delivery-date-switch')?.closest('td'));
  fireEvent.click(delivery);
  const dialog = screen.getByRole('dialog', { name: '납품 처리 확인' });
  fireEvent.change(within(dialog).getByLabelText('납품일'), { target: { value: '2026-12-12' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '납품 처리 (2건)' }));
  expect(incomplete.querySelector('.delivery-date-switch')).toHaveTextContent('2026-12-12');
  expect(screen.getByText('2건 납품 처리 미리보기 · DB 미반영')).toBeVisible();
}, 15_000);
