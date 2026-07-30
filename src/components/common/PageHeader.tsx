import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 3,
        mb: 2,
      }}
    >
      <Box>
        <Typography component="h1" variant="h1">
          {title}
        </Typography>
        <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 13 }}>
          {description}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}
