import type { SxProps, Theme } from '@mui/material/styles';

export function tableSortLabelSx(active: boolean): SxProps<Theme> {
  return {
    flexDirection: 'row',
    maxWidth: '100%',
    '& .MuiTableSortLabel-icon': { fontSize: 15, mx: 0.25, opacity: active ? 1 : 0.35 },
  };
}
