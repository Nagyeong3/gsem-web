import { PageHeader } from '../components/common/PageHeader';
import { QueryStatePanel } from '../components/common/QueryStatePanel';
import { dashboardService } from '../services';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import type { DashboardData } from '../types/domain';
import { DashboardMetrics } from '../features/dashboard/DashboardMetrics';
import { DashboardDeliveryOverview } from '../features/dashboard/DashboardDeliveryOverview';
import { DashboardRecentTables } from '../features/dashboard/DashboardRecentTables';

export function DashboardPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const loadDashboard = useCallback(() => dashboardService.getOverview(), []);
  const { data, isLoading, isError, refetch } = useAsyncQuery<DashboardData>({
    queryFn: loadDashboard,
  });
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
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') moveToSearch(query);
            }}
            placeholder="품번, 품명, 용도 검색"
            sx={{ width: 430, mt: 0.75 }}
            slotProps={{
              htmlInput: {
                'aria-label': '통합 장비 검색',
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="검색 실행"
                      onClick={() => moveToSearch(query)}
                    >
                      <ArrowForwardIos sx={{ fontSize: 15 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        }
      />

<DashboardMetrics metrics={data.metrics} onNavigate={navigate} />

      <DashboardDeliveryOverview monthlyDeliveries={data.monthlyDeliveries} moveToSearch={() => moveToSearch()} />

      <DashboardRecentTables changes={data.changes} upcomingDeliveries={data.upcomingDeliveries} />
    </Box>
  );
}
