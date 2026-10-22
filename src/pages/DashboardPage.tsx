import { ChevronRight } from '@mui/icons-material';
import { Box, Button, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchField } from '../components/common/SearchField';
import { PageHeader } from '../components/common/PageHeader';
import { QueryStatePanel } from '../components/common/QueryStatePanel';
import { SectionCard } from '../components/common/SectionCard';
import { DashboardMetrics, DashboardDeliveryChart, DashboardActivityTables } from '../features/dashboard/DashboardSections';
import { dashboardService } from '../services';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import type { DashboardData } from '../types/domain';

const attentionItems = [
  { label: '납품 지연', count: 3, tone: 'error' as const, status: '보류' },
  { label: '단종·대체 미확정', count: 5, tone: 'warning' as const, status: '대체 검토' },
  { label: '승인 대기', count: 4, tone: 'info' as const, status: '보류' },
];

export function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const loadDashboard = useCallback(() => dashboardService.getOverview(), []);
  const { data, isLoading, isError, refetch } = useAsyncQuery<DashboardData>({
    queryFn: loadDashboard,
  });
  const colorByTone = {
    brand: '#FFFFFF',
    neutral: theme.palette.text.secondary,
    info: theme.palette.primary.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
  } as const;

  const attentionTotal = useMemo(
    () => attentionItems.reduce((sum, item) => sum + item.count, 0),
    [],
  );

  const moveToSearch = (searchQuery = '') => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    navigate(`/equipment${params.size ? `?${params.toString()}` : ''}`);
  };

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="지원장비 관리 현황"
          description="지원장비 정보와 납품·변경 현황을 확인합니다."
        />
        <Paper variant="outlined">
          <QueryStatePanel
            state="error"
            errorMessage="현황을 불러오지 못했습니다."
            onRetry={refetch}
            minHeight={320}
          />
        </Paper>
      </Box>
    );
  }

  if (isLoading || !data) {
    return (
      <Box
        sx={{
          height: 'calc(100vh - 58px)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <QueryStatePanel
          state="loading"
          loadingMessage="대시보드를 불러오고 있습니다."
          minHeight={360}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minWidth: 1024 }}>
      <PageHeader
        title="지원장비 관리 현황"
        description="지원장비 정보와 납품·변경 현황을 확인합니다."
        action={
          <Box sx={{ width: 430, mt: 0.75 }}><SearchField value={query} onChange={setQuery} onSearch={() => moveToSearch(query)} label="통합 장비 검색" placeholder="품번, 품명, 용도 검색" /></Box>
        }
      />

      <DashboardMetrics data={data} navigate={navigate} moveToSearch={moveToSearch} />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr', gap: 1.5, mb: 1.5 }}>
        <DashboardDeliveryChart data={data} />

        <SectionCard
          title={`확인이 필요한 업무 ${attentionTotal}건`}
          action={
            <Button size="small" endIcon={<ChevronRight />} onClick={() => moveToSearch()}>
              전체 보기
            </Button>
          }
          sx={{ height: 260 }}
        >
          <Box sx={{ p: 1.5 }}>
            {attentionItems.map((item) => (
              <Box
                component="button"
                type="button"
                key={item.label}
                onClick={() => moveToSearch()}
                sx={{
                  width: '100%',
                  height: 56,
                  px: 1.5,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: `3px solid ${colorByTone[item.tone]}`,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.035),
                  },
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.label}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography
                    sx={{ fontSize: 22, fontWeight: 700, color: colorByTone[item.tone] }}
                  >
                    {item.count}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary' }}>건</Typography>
                  <ChevronRight sx={{ ml: 1, fontSize: 18, color: 'text.secondary' }} />
                </Box>
              </Box>
            ))}
          </Box>
        </SectionCard>
      </Box>

      <DashboardActivityTables data={data} navigate={navigate} />
    </Box>
  );
}
