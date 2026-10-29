import { CalendarMonthOutlined, LockClockOutlined } from '@mui/icons-material';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { PageHeader } from '../components/common/PageHeader';

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
const statuses = [
  { label: '예정', color: '#2674D9', bg: '#EAF2FF' },
  { label: '진행', color: '#B46A00', bg: '#FFF0D5' },
  { label: '완료', color: '#14804A', bg: '#E6F7ED' },
  { label: '연기', color: '#BC4545', bg: '#FFECEB' },
] as const;
const previewEvents: Record<number, { title: string; status: number }> = {
  4: { title: '납품 일정 예시', status: 0 },
  9: { title: '납품 일정 예시', status: 1 },
  15: { title: '납품 일정 예시', status: 2 },
  22: { title: '납품 일정 예시', status: 3 },
  27: { title: '납품 일정 예시', status: 0 },
};

// Deliberately illustrative, not an operational schedule or live database result.
export function DeliverySchedulePage() {
  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, minWidth: 0, bgcolor: 'background.default' }}>
      <PageHeader title="납품 일정 관리" description="현재는 1차 데모를 위한 미리보기 화면입니다." />
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonthOutlined color="primary" />
            <Typography fontSize={17} fontWeight={800}>월간 납품 일정</Typography>
            <Chip label="화면 예시" size="small" variant="outlined" />
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {statuses.map(({ label, color, bg }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, borderRadius: 1, px: 1.25, py: 0.65, bgcolor: bg }}>
                <Box sx={{ height: 8, width: 8, borderRadius: 1, bgcolor: color }} />
                <Typography sx={{ color, fontSize: 12, fontWeight: 700 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box aria-hidden="true" sx={{ position: 'relative', filter: 'blur(2px)', opacity: 0.52, pointerEvents: 'none', userSelect: 'none' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', bgcolor: 'action.hover' }}>
            {weekDays.map((day, index) => <Box key={day} sx={{ py: 1.25, textAlign: 'center', borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', color: index === 0 ? 'error.main' : 'text.secondary', fontSize: 12, fontWeight: 700 }}>{day}</Box>)}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 2;
              const sample = previewEvents[day];
              return <Box key={i} sx={{ minWidth: 0, minHeight: { xs: 68, md: 104 }, p: 1, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', bgcolor: day < 1 || day > 31 ? 'action.hover' : 'background.paper' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 650, color: day < 1 || day > 31 ? 'text.disabled' : 'text.primary' }}>{day < 1 ? 30 + day : day > 31 ? day - 31 : day}</Typography>
                {sample && <Box sx={{ mt: 1, py: 0.6, px: 0.8, borderRadius: 1, bgcolor: statuses[sample.status].bg, borderLeft: '3px solid', borderColor: statuses[sample.status].color }}>
                  <Typography noWrap sx={{ color: statuses[sample.status].color, fontSize: 11, fontWeight: 700 }}>{sample.title}</Typography>
                </Box>}
              </Box>;
            })}
          </Box>
        </Box>
        <Box sx={{ position: 'absolute', inset: 0, top: 70, zIndex: 2, display: 'grid', placeItems: 'center', p: 2, pointerEvents: 'none' }}>
          <Paper elevation={7} sx={{ maxWidth: 430, width: '100%', textAlign: 'center', p: { xs: 2.5, md: 4 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <LockClockOutlined color="primary" sx={{ fontSize: 36, mb: 1 }} />
            <Typography component="h2" fontSize={20} fontWeight={800}>달력형 납품 일정 화면 개발 예정</Typography>
            <Typography sx={{ mt: 1.25, color: 'text.secondary', fontSize: 13, lineHeight: 1.7 }}>예정 · 진행 · 완료 · 연기 상태를 기준으로 일정을 확인할 수 있도록 준비하고 있습니다.</Typography>
            <Typography sx={{ mt: 1.5, fontSize: 11, color: 'text.disabled' }}>배경의 일정은 실제 납품 데이터가 아닌 화면 예시입니다.</Typography>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}
