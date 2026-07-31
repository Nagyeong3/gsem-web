import { Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { EquipmentStatus } from '../../types/domain';

interface StatusChipProps {
  status: EquipmentStatus | '완료' | '검토 중' | '임박';
}

const toneMap = {
  '사용 중': 'primary',
  '대체 검토': 'warning',
  보류: 'neutral',
  완료: 'success',
  '검토 중': 'warning',
  임박: 'error',
} as const;

export function StatusChip({ status }: StatusChipProps) {
  const theme = useTheme();
  const tone = toneMap[status];
  const color =
    tone === 'neutral' ? theme.palette.text.secondary : theme.palette[tone].main;
  return (
    <Chip
      label={status}
      variant="outlined"
      sx={{
        color,
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.14 : 0.08),
        borderColor: alpha(color, theme.palette.mode === 'dark' ? 0.62 : 0.45),
      }}
    />
  );
}
