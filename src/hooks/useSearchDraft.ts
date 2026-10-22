import { useState } from 'react';

/** URL 복원 시 입력도 복원하되 제출 전 입력은 조회 조건과 분리한다. */
export function useSearchDraft(applied: string) {
  const [state, setState] = useState({ applied, value: applied });
  if (state.applied !== applied) setState({ applied, value: applied });
  return [state.applied === applied ? state.value : applied, (value: string) => setState({ applied, value })] as const;
}
