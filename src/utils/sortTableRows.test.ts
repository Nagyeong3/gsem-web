import { expect, it } from 'vitest';
import { sortTableRows, toggleTableSort } from './sortTableRows';

it('납품수량은 숫자로, 차수는 자연 순서로 정렬하고 빈 날짜는 양방향에서 마지막에 둔다', () => {
  const rows = [
    { id: '10차', quantity: 10, date: '2026-11-11' },
    { id: '2차', quantity: 2, date: null },
    { id: '1차', quantity: 3, date: '2026-10-01' },
  ];
  const asc = toggleTableSort(undefined, 'quantity');
  const desc = toggleTableSort(asc, 'quantity');
  expect(sortTableRows(rows, asc, row => row.quantity).map(row => row.quantity)).toEqual([2, 3, 10]);
  expect(sortTableRows(rows, desc, row => row.quantity).map(row => row.quantity)).toEqual([10, 3, 2]);
  expect(sortTableRows(rows, toggleTableSort(desc, 'id'), row => row.id).map(row => row.id)).toEqual(['1차', '2차', '10차']);
  for (const sort of [asc, desc]) expect(sortTableRows(rows, sort, row => row.date)[2].date).toBeNull();
  expect(rows[0].id).toBe('10차');
});
