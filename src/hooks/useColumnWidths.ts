import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export const MIN_COLUMN_WIDTH = 52;
export const MAX_COLUMN_WIDTH = 700;
export function readColumnWidths(key: string): Record<string, number> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, width]) => typeof width === 'number' && Number.isFinite(width) && width >= MIN_COLUMN_WIDTH && width <= MAX_COLUMN_WIDTH));
  } catch { return {}; }
}

/** 표별·컬럼 식별자별 저장. 저장소 차단/손상은 기본 너비로 복구한다. */
export function useColumnWidths(storageKey: string) {
  const [widths, setWidths] = useState(() => readColumnWidths(storageKey));
  const cleanup = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cleanup.current?.(), []);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(widths)); } catch { /* 저장 불가 시 세션 내 조절은 유지한다. */ } }, [storageKey, widths]);
  const setWidth = useCallback((key: string, width: number) => {
    if (!Number.isFinite(width)) return;
    setWidths((previous) => ({ ...previous, [key]: Math.round(Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width))) }));
  }, []);
  const beginResize = (key: string, initial: number, event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); cleanup.current?.();
    const start = event.clientX;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'col-resize';
    const move = (next: PointerEvent) => setWidth(key, initial + next.clientX - start);
    const finish = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish);
      document.body.style.cursor = previousCursor; cleanup.current = undefined;
    };
    cleanup.current = finish;
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish); window.addEventListener('pointercancel', finish);
  };
  return { widths, setWidth, beginResize, resetWidths: () => setWidths({}) };
}
