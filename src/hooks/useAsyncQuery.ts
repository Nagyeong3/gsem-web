import { useCallback, useEffect, useRef, useState } from 'react';

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseAsyncQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
  keepPreviousData?: boolean;
}

interface AsyncQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function toError(reason: unknown) {
  return reason instanceof Error ? reason : new Error('조회 중 알 수 없는 오류가 발생했습니다.');
}

/**
 * 조회 상태와 재시도를 공통 관리한다.
 * 필터 변경이나 화면 이동 후 도착한 이전 응답은 최신 화면 상태에 반영하지 않는다.
 */
export function useAsyncQuery<T>({
  queryFn,
  enabled = true,
  keepPreviousData = false,
}: UseAsyncQueryOptions<T>): AsyncQueryResult<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<QueryStatus>(enabled ? 'loading' : 'idle');
  const [retryIndex, setRetryIndex] = useState(0);
  const requestVersion = useRef(0);

  useEffect(() => {
    const version = ++requestVersion.current;

    if (!enabled) {
      queueMicrotask(() => {
        if (requestVersion.current !== version) return;
        setStatus('idle');
        setError(null);
        if (!keepPreviousData) setData(undefined);
      });
      return;
    }

    queueMicrotask(() => {
      if (requestVersion.current !== version) return;
      setStatus('loading');
      setError(null);
      if (!keepPreviousData) setData(undefined);
    });

    void queryFn()
      .then((result) => {
        if (requestVersion.current !== version) return;
        setData(result);
        setStatus('success');
      })
      .catch((reason: unknown) => {
        if (requestVersion.current !== version) return;
        setError(toError(reason));
        setStatus('error');
      });

    return () => {
      if (requestVersion.current === version) requestVersion.current += 1;
    };
  }, [enabled, keepPreviousData, queryFn, retryIndex]);

  const refetch = useCallback(() => setRetryIndex((current) => current + 1), []);

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    refetch,
  };
}
