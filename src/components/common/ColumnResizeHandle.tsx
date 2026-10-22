import { Box } from '@mui/material';
import type { PointerEvent } from 'react';

export function ColumnResizeHandle({ label, width, defaultWidth, onWidth, onResize }: {
  label: string; width: number; defaultWidth: number; onWidth: (width: number) => void; onResize: (event: PointerEvent) => void;
}) {
  return <Box role="separator" aria-label={`${label} 너비`} aria-orientation="vertical" aria-valuemin={52} aria-valuemax={700} aria-valuenow={width} tabIndex={0}
    onPointerDown={onResize} onDoubleClick={() => onWidth(defaultWidth)}
    onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onWidth(width + (event.key === 'ArrowRight' ? 10 : -10)); } }}
    sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'col-resize', borderRight: '1px solid', borderColor: 'divider', touchAction: 'none' }} />;
}
