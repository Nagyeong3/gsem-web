import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SearchableMultiTextFilter } from './SearchableMultiTextFilter';
import type { TextSearchTerm } from '../../utils/textSearchTerms';

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(cleanup);

function Filter() {
  const [value, setValue] = useState<TextSearchTerm[]>([]);
  return <><SearchableMultiTextFilter label="품명" value={value}
    options={['유압 장비', '유압 호스', '전원 장비']} onChange={setValue} />
    <output data-testid="terms">{JSON.stringify(value)}</output></>;
}

describe('품명 다중선택 입력', () => {
  it('입력 즉시 옵션을 줄이고 연속 선택 후에도 기존 선택을 보존한다', () => {
    render(<Filter />);
    const input = screen.getByRole('combobox', { name: '품명' });
    fireEvent.change(input, { target: { value: '유압' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.click(screen.getByRole('option', { name: '유압 장비' }));
    expect(screen.getByRole('option', { name: '유압 호스' })).toBeVisible();
    fireEvent.click(screen.getByRole('option', { name: '유압 호스' }));
    fireEvent.change(input, { target: { value: '전원' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(JSON.parse(screen.getByTestId('terms').textContent || '[]')).toEqual([
      { value: '유압 장비', match: 'exact' }, { value: '유압 호스', match: 'exact' },
    ]);
  });
  it('직접 입력한 Enter 조건은 부분일치로 추가한다', () => {
    render(<Filter />);
    const input = screen.getByRole('combobox', { name: '품명' });
    fireEvent.change(input, { target: { value: '검색어' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(JSON.parse(screen.getByTestId('terms').textContent || '[]')).toEqual([
      { value: '검색어', match: 'contains' },
    ]);
    expect(input).toHaveValue('');
  });
});
