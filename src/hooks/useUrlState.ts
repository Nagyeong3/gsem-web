import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/** 같은 이벤트의 연속 갱신도 직전 조건을 보존한다. 브라우저 이동은 URL이 정본이다. */
export function useUrlState() {
  const [params, setParams] = useSearchParams();
  const pending = useRef(params);
  useLayoutEffect(() => { pending.current = params; }, [params]);
  const update = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(pending.current);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    pending.current = next;
    setParams(next, { replace: true });
  };
  return { params, update };
}
