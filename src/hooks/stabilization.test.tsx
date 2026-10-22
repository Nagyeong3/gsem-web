import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchField } from '../components/common/SearchField';
import { ActiveFilterChip } from '../components/common/ActiveFilterChip';
import { isNavigationSelected } from '../components/layout/navigation';
import { readColumnWidths, useColumnWidths } from './useColumnWidths';
import { useSearchDraft } from './useSearchDraft';
import { useUrlState } from './useUrlState';

beforeEach(() => localStorage.clear());

describe('v0.9.0 회귀', () => {
  it('통합현황과 장비 검색을 구분하고 상세 경로는 부모 메뉴에 속한다', () => {
    expect(isNavigationSelected('/equipment-master', '/equipment')).toBe(false);
    expect(isNavigationSelected('/equipment-master', '/equipment-master')).toBe(true);
    expect(isNavigationSelected('/equipment/12', '/equipment')).toBe(true);
    expect(isNavigationSelected('/equipment/12', '/')).toBe(false);
  });
  it('검색 버튼은 한글 조합 중 제출하지 않으며 조합 종료 후 실행한다', () => {
    const submit = vi.fn();
    render(<SearchField value="장비" onChange={() => {}} onSearch={submit} />);
    const input = screen.getByRole('textbox');
    fireEvent.compositionStart(input);
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('필터 삭제 버튼은 해당 조건 삭제만 한 번 실행한다', () => {
    const remove = vi.fn();
    render(<ActiveFilterChip label="사업: 가 사업" onDelete={remove} />);
    fireEvent.click(screen.getByRole('button', { name: '사업: 가 사업 삭제' }));
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it('URL 변경은 입력을 복원하고 제출 전 입력은 조건을 바꾸지 않는다', () => {
    const { result, rerender } = renderHook(({ applied }) => useSearchDraft(applied), { initialProps: { applied: '가' } });
    act(() => result.current[1]('초안'));
    expect(result.current[0]).toBe('초안');
    rerender({ applied: '나' });
    expect(result.current[0]).toBe('나');
  });
  it('연속 URL 갱신은 다른 필터와 데이터 공급자를 보존한다', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={['/equipment?business=가&__gsemDataSource=api&page=3']}>{children}</MemoryRouter>;
    const { result } = renderHook(() => useUrlState(), { wrapper });
    act(() => { result.current.update({ q: '장비', page: null }); result.current.update({ business: null }); });
    expect(result.current.params.get('q')).toBe('장비');
    expect(result.current.params.has('business')).toBe(false);
    expect(result.current.params.has('page')).toBe(false);
    expect(result.current.params.get('__gsemDataSource')).toBe('api');
  });
  it('컬럼 너비는 재마운트해도 유지되고 초기화하며 손상 데이터를 제외한다', () => {
    localStorage.setItem('test-width', '{"valid":120,"negative":-1,"large":900,"string":"120"}');
    expect(readColumnWidths('test-width')).toEqual({ valid: 120 });
    const first = renderHook(() => useColumnWidths('test-width'));
    act(() => first.result.current.setWidth('품번', 240));
    first.unmount();
    const second = renderHook(() => useColumnWidths('test-width'));
    expect(second.result.current.widths['품번']).toBe(240);
    act(() => second.result.current.setWidth('품번', 2000));
    expect(second.result.current.widths['품번']).toBe(700);
    act(() => second.result.current.resetWidths());
    expect(readColumnWidths('test-width')).toEqual({});
    localStorage.setItem('broken', '{invalid');
    expect(readColumnWidths('broken')).toEqual({});
  });
  it('저장소 접근이 차단되어도 컬럼 조절은 동작한다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      const { result } = renderHook(() => useColumnWidths('blocked'));
      act(() => result.current.setWidth('name', 200));
      expect(result.current.widths.name).toBe(200);
    } finally { spy.mockRestore(); }
  });
});
