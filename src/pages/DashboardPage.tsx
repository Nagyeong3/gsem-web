import {
  ArrowForwardIos,
  CalendarMonthOutlined,
  ChevronRight,
  ErrorOutlined,
  Inventory2Outlined,
  ManageSearchOutlined,
  Search,
  TaskAltOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { StatusChip } from '../components/common/StatusChip';
import { dashboardService } from '../services';
import type { DashboardData, DashboardMetric } from '../types/domain';

const iconByMetric: Record<DashboardMetric['id'], typeof Inventory2Outlined> = {
  attention: TaskAltOutlined,
  registered: Inventory2Outlined,
  delivery: CalendarMonthOutlined,
  delay: ErrorOutlined,
  replacement: ManageSearchOutlined,
  approval: TaskAltOutlined,
};

const attentionItems = [
  { label: '납품 지연', count: 3, tone: 'error' as const, status: '보류' },
  { label: '단종·대체 미확정', count: 5, tone: 'warning' as const, status: '대체 검토' },
  { label: '승인 대기', count: 4, tone: 'info' as const, status: '보류' },
];

export function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const colorByTone = {
    brand: '#FFFFFF',
    neutral: theme.palette.text.secondary,
    info: theme.palette.primary.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
  } as const;
  const chartGridColor = theme.palette.divider;
  const chartTextColor = theme.palette.text.secondary;

  useEffect(() => {
    let active = true;
    dashboardService
      .getOverview()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const attentionTotal = useMemo(
    () => attentionItems.reduce((sum, item) => sum + item.count, 0),
    [],
  );

  const moveToSearch = (searchQuery = '') => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    navigate(`/equipment${params.size ? `?${params.toString()}` : ''}`);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="지원장비 관리 현황"
          description="지원장비 정보와 납품·변경 현황을 확인합니다."
        />
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <ErrorOutlined color="error" />
          <Typography sx={{ mt: 1, fontWeight: 700 }}>현황을 불러오지 못했습니다.</Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => window.location.reload()}>
            다시 불러오기
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          height: 'calc(100vh - 58px)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>
            대시보드를 불러오고 있습니다.
          </Typography>
        </Box>
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1.9fr repeat(5, minmax(0, 1fr))',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        {data.metrics.map((metric) => {
          const Icon = iconByMetric[metric.id];
          const primary = metric.id === 'attention';
          return (
            <Paper
              component="button"
              type="button"
              key={metric.id}
              variant="outlined"
              onClick={() => moveToSearch()}
              sx={{
                position: 'relative',
                minWidth: 0,
                height: 128,
                p: 2,
                textAlign: 'left',
                cursor: 'pointer',
                color: primary ? '#FFFFFF' : 'text.primary',
                bgcolor: primary ? '#0759D3' : 'background.paper',
                borderColor: primary ? '#0759D3' : 'divider',
                transition: 'border-color 150ms ease, transform 150ms ease',
                '&:hover': {
                  borderColor: primary ? '#69A7FF' : 'primary.main',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{metric.label}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1 }}>
                <Typography sx={{ fontSize: primary ? 34 : 26, lineHeight: 1, fontWeight: 700 }}>
                  {metric.value.toLocaleString('ko-KR')}
                </Typography>
                <Typography
                  sx={{ color: primary ? '#D7E8FF' : 'text.secondary', fontWeight: 600 }}
                >
                  {metric.unit}
                </Typography>
              </Box>
              <Typography
                sx={{
                  position: 'absolute',
                  left: 16,
                  bottom: 16,
                  right: primary ? 52 : 16,
                  color: primary ? '#D7E8FF' : colorByTone[metric.tone],
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {metric.helper}
              </Typography>
              <Box
                sx={{
                  position: 'absolute',
                  right: 14,
                  bottom: 14,
                  width: 38,
                  height: 38,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  color: primary ? '#FFFFFF' : colorByTone[metric.tone],
                  bgcolor: primary
                    ? 'rgba(255,255,255,0.12)'
                    : alpha(theme.palette.text.secondary, 0.08),
                }}
              >
                <Icon sx={{ fontSize: 21 }} />
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr', gap: 1.5, mb: 1.5 }}>
        <SectionCard title="월별 납품 계획 대비 실적" sx={{ height: 260 }}>
          <Box sx={{ height: 210, px: 1, py: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.monthlyDeliveries} margin={{ top: 12, right: 12, left: -12 }}>
                <CartesianGrid vertical={false} stroke={chartGridColor} strokeDasharray="2 2" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: chartTextColor }}
                  axisLine={{ stroke: chartGridColor }}
                />
                <YAxis
                  yAxisId="count"
                  tick={{ fontSize: 10, fill: chartTextColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={[0, 125]}
                  tick={{ fontSize: 10, fill: chartTextColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderRadius: 6,
                    fontSize: 11,
                    boxShadow: '0 8px 28px rgba(10,31,68,0.12)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, top: -2 }} />
                <Bar
                  yAxisId="count"
                  dataKey="plan"
                  name="계획 수량"
                  fill={alpha(theme.palette.primary.main, 0.34)}
                  barSize={13}
                  isAnimationActive={false}
                />
                <Bar
                  yAxisId="count"
                  dataKey="actual"
                  name="납품 실적"
                  fill={theme.palette.primary.dark}
                  barSize={13}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="achievement"
                  name="달성률(%)"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ r: 3, fill: theme.palette.primary.main }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </SectionCard>

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

      <Box sx={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 1.5 }}>
        <SectionCard
          title="최근 변경 이력"
          action={
            <Button size="small" endIcon={<ChevronRight />}>
              전체 보기
            </Button>
          }
        >
          <Table size="small" aria-label="최근 변경 이력">
            <TableHead>
              <TableRow>
                <TableCell>변경 번호</TableCell>
                <TableCell>품명</TableCell>
                <TableCell>변경 내용</TableCell>
                <TableCell>변경 구분</TableCell>
                <TableCell>요청자</TableCell>
                <TableCell>변경일</TableCell>
                <TableCell align="center">상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.changes.map((change) => (
                <TableRow key={change.id} hover>
                  <TableCell>{change.id}</TableCell>
                  <TableCell>{change.equipmentName}</TableCell>
                  <TableCell>{change.content}</TableCell>
                  <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {change.category}
                  </TableCell>
                  <TableCell>{change.requester}</TableCell>
                  <TableCell>{change.changedAt}</TableCell>
                  <TableCell align="center">
                    <StatusChip status={change.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          title="납품 임박 품목"
          action={
            <Button size="small" endIcon={<ChevronRight />}>
              전체 보기
            </Button>
          }
        >
          <Table size="small" aria-label="납품 임박 품목">
            <TableHead>
              <TableRow>
                <TableCell>품명</TableCell>
                <TableCell>품번</TableCell>
                <TableCell>납품 예정일</TableCell>
                <TableCell>D-일</TableCell>
                <TableCell align="center">상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.upcomingDeliveries.map((delivery) => (
                <TableRow key={delivery.itemNum} hover>
                  <TableCell>{delivery.equipmentName}</TableCell>
                  <TableCell>{delivery.itemNum}</TableCell>
                  <TableCell>{delivery.deliveryDate}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>
                    D-{delivery.daysLeft}
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={delivery.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </Box>
    </Box>
  );
}
