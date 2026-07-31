import { Chip } from '@mui/material';
import type { EquipmentStatus } from '../../types/domain';

interface StatusChipProps {
  status: EquipmentStatus | '완료' | '검토 중' | '임박';
}

const toneMap = {
  '사용 중': { color: '#0867F2', background: '#EEF5FF', border: '#86B7FF' },
  '대체 검토': { color: '#C65E00', background: '#FFF5E9', border: '#F5B56F' },
  보류: { color: '#52647D', background: '#F3F5F8', border: '#C8D3E0' },
  완료: { color: '#128148', background: '#ECF9F1', border: '#88D6AA' },
  '검토 중': { color: '#C65E00', background: '#FFF5E9', border: '#F5B56F' },
  임박: { color: '#D92733', background: '#FFF0F1', border: '#F08C94' },
} as const;

export function StatusChip({ status }: StatusChipProps) {
  const tone = toneMap[status];
  return (
    <Chip
      label={status}
      variant="outlined"
      sx={{
        color: tone.color,
        bgcolor: tone.background,
        borderColor: tone.border,
      }}
    />
  );
}
