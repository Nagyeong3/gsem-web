import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: object;
}

export function SectionCard({ title, action, children, sx }: SectionCardProps) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', ...sx }}>
      <Box
        sx={{
          height: 44,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E8EDF3',
        }}
      >
        <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}
