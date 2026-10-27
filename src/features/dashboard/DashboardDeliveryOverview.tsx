import { ChevronRight } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SectionCard } from '../../components/common/SectionCard';
import type { DashboardData } from '../../types/domain';

const attentionItems = [
  { label: '납품 지연', count: 3, tone: 'error' as const, status: '보류' },
  { label: '단종·대체 미확정', count: 5, tone: 'warning' as const, status: '대체 검토' },
  { label: '승인 대기', count: 4, tone: 'info' as const, status: '보류' },
];
export function DashboardDeliveryOverview({ monthlyDeliveries, moveToSearch }: {
 monthlyDeliveries: DashboardData['monthlyDeliveries'];
 moveToSearch: () => void;
}) {
 const theme = useTheme();
 const chartGridColor = theme.palette.divider;
 const chartTextColor = theme.palette.text.secondary;
 const colorByTone = { brand: '#FFFFFF', neutral: theme.palette.text.secondary,
   info: theme.palette.primary.main, error: theme.palette.error.main,
   warning: theme.palette.warning.main } as const;
 const attentionTotal = attentionItems.reduce((sum, item) => sum + item.count, 0);
 const data = { monthlyDeliveries };
 return (
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
 );
}
