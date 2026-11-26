import { act, renderHook, waitFor } from '@testing-library/react';
import { useCallback } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncQuery } from './useAsyncQuery';

describe('useAsyncQuery', () => {
  it('조회 성공 상태와 데이터를 반환한다', async () => {
    const queryFn = vi.fn().mockResolvedValue(['A장비']);
    const { result } = renderHook(() => useAsyncQuery({ queryFn }));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual(['A장비']);
  });

  it('조회 실패 후 다시 불러올 수 있다', async () => {
    const queryFn = vi.fn()
      .mockRejectedValueOnce(new Error('일시 오류'))
      .mockResolvedValueOnce(['B장비']);
    const { result } = renderHook(() => useAsyncQuery({ queryFn }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual(['B장비']);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('늦게 도착한 이전 조회 결과를 무시한다', async () => {
    let resolveFirst: (value: string) => void = () => undefined;
    let resolveSecond: (value: string) => void = () => undefined;
    const first = new Promise<string>((resolve) => { resolveFirst = resolve; });
    const second = new Promise<string>((resolve) => { resolveSecond = resolve; });

    const { result, rerender } = renderHook(
      ({ currentQuery }: { currentQuery: () => Promise<string> }) => {
        const queryFn = useCallback(currentQuery, [currentQuery]);
        return useAsyncQuery({ queryFn });
      },
      { initialProps: { currentQuery: () => first } },
    );

    rerender({ currentQuery: () => second });
    act(() => resolveSecond('최신 결과'));
    await waitFor(() => expect(result.current.data).toBe('최신 결과'));
    act(() => resolveFirst('이전 결과'));
    await act(async () => Promise.resolve());
    expect(result.current.data).toBe('최신 결과');
  });
});
