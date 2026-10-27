import { CalendarMonthOutlined, ErrorOutlined, Inventory2Outlined, ManageSearchOutlined, TaskAltOutlined } from '@mui/icons-material';
import { Box, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { DashboardData, DashboardMetric } from '../../types/domain';

const iconByMetric: Record<DashboardMetric['id'], typeof Inventory2Outlined> = {
  attention: TaskAltOutlined, registered: Inventory2Outlined, delivery: CalendarMonthOutlined,
  delay: ErrorOutlined, replacement: ManageSearchOutlined, approval: TaskAltOutlined,
};

export function DashboardMetrics({ metrics, onNavigate }: {
  metrics: DashboardData['metrics'];
  onNavigate: (destination: string) => void;
}) {
 const theme = useTheme();
 const colorByTone = { brand: '#FFFFFF', neutral: theme.palette.text.secondary,
   info: theme.palette.primary.main, error: theme.palette.error.main,
   warning: theme.palette.warning.main } as const;
 const navigate = onNavigate;
 const moveToSearch = () => onNavigate('/equipment');
 return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1.9fr repeat(5, minmax(0, 1fr))',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        {metrics.map((metric) => {
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
