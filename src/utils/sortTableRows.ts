type Direction = 'asc' | 'desc';
export type TableSort = { column: string; direction: Direction };
type SortValue = string | number | boolean | null | undefined;
const collator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });

export function toggleTableSort(sort: TableSort | undefined, column: string): TableSort {
  return { column, direction: sort?.column === column && sort.direction === 'asc' ? 'desc' : 'asc' };
}

export function sortTableRows<T>(rows: T[], sort: TableSort | undefined, value: (row: T, column: string) => SortValue): T[] {
  if (!sort) return rows;
  return rows.map(row => ({ row, value: value(row, sort.column) })).sort((left, right) => {
    const a = left.value; const b = right.value;
    if (a == null || a === '') return b == null || b === '' ? 0 : 1;
    if (b == null || b === '') return -1;
    const comparison = typeof a === 'number' && typeof b === 'number' ? a - b
      : typeof a === 'boolean' && typeof b === 'boolean' ? Number(a) - Number(b)
      : collator.compare(String(a), String(b));
    return sort.direction === 'asc' ? comparison : -comparison;
  }).map(entry => entry.row);
}
