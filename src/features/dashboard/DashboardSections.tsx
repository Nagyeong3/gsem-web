import { Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { CalendarMonthOutlined, ChevronRight, ErrorOutlined, Inventory2Outlined, ManageSearchOutlined, TaskAltOutlined } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SectionCard } from '../../components/common/SectionCard';
import { StatusChip } from '../../components/common/StatusChip';
import type { DashboardData, DashboardMetric } from '../../types/domain';
const iconByMetric: Record<DashboardMetric['id'], typeof Inventory2Outlined> = {
  attention: TaskAltOutlined,
  registered: Inventory2Outlined,
  delivery: CalendarMonthOutlined,
  delay: ErrorOutlined,
  replacement: ManageSearchOutlined,
  approval: TaskAltOutlined,
};

type Navigate = (path: string) => void;
export function DashboardMetrics({ data, navigate, moveToSearch }: { data: DashboardData; navigate: Navigate; moveToSearch: () => void }) {
  const theme = useTheme();
  const colorByTone = {
    brand: '#FFFFFF',
    neutral: theme.palette.text.secondary,
    info: theme.palette.primary.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
  } as const;
  return (
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
              onClick={() =>
                metric.id === 'delivery' || metric.id === 'delay'
                  ? navigate('/deliveries')
                  : metric.id === 'approval'
                    ? navigate('/requests?status=검토%20중')
                  : moveToSearch()
              }
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

  );
}
export function DashboardDeliveryChart({ data }: { data: DashboardData }) {
 const theme = useTheme();
 const chartGridColor = theme.palette.divider;
 const chartTextColor = theme.palette.text.secondary;
 return (
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
 );
}
export function DashboardActivityTables({ data, navigate }: { data: DashboardData; navigate: Navigate }) {
 return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 1.5 }}>
        <SectionCard
          title="최근 변경 이력"
          action={
            <Button size="small" endIcon={<ChevronRight />} onClick={() => navigate('/history')}>
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
            <Button size="small" endIcon={<ChevronRight />} onClick={() => navigate('/deliveries')}>
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
 );
}
