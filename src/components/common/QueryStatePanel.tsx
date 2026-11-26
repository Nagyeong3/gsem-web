import { ErrorOutlined, SearchOffOutlined } from '@mui/icons-material';
import { Box, Button, CircularProgress, Skeleton, Typography } from '@mui/material';

interface QueryStatePanelProps {
  state: 'loading' | 'error' | 'empty';
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  onReset?: () => void;
  minHeight?: number | string;
  compact?: boolean;
}

export function QueryStatePanel({
  state,
  loadingMessage = '정보를 불러오고 있습니다.',
  errorMessage = '정보를 불러오지 못했습니다.',
  emptyMessage = '조회된 정보가 없습니다.',
  emptyDescription,
  onRetry,
  onReset,
  minHeight = 280,
  compact = false,
}: QueryStatePanelProps) {
  if (state === 'loading') {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{ minHeight, p: compact ? 2 : 3, display: 'grid', alignContent: 'center' }}
      >
        <Box sx={{ width: 'min(100%, 560px)', mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, mb: 2 }}>
            <CircularProgress size={22} thickness={4} />
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{loadingMessage}</Typography>
          </Box>
          {!compact && [88, 100, 76].map((width) => (
            <Skeleton key={width} variant="rounded" height={34} width={`${width}%`} sx={{ mx: 'auto', mb: 1 }} />
          ))}
        </Box>
      </Box>
    );
  }

  const isError = state === 'error';
  return (
    <Box
      role={isError ? 'alert' : 'status'}
      sx={{ minHeight, p: 3, display: 'grid', placeItems: 'center', textAlign: 'center' }}
    >
      <Box>
        {isError ? (
          <ErrorOutlined sx={{ fontSize: 34, color: 'error.main' }} />
        ) : (
          <SearchOffOutlined sx={{ fontSize: 34, color: 'text.disabled' }} />
        )}
        <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 700 }}>
          {isError ? errorMessage : emptyMessage}
        </Typography>
        {!isError && emptyDescription && (
          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 12.5 }}>
            {emptyDescription}
          </Typography>
        )}
        {isError && onRetry && (
          <Button sx={{ mt: 1.5 }} variant="outlined" onClick={onRetry}>
            다시 불러오기
          </Button>
        )}
        {!isError && onReset && (
          <Button sx={{ mt: 1.5 }} variant="outlined" onClick={onReset}>
            검색 조건 초기화
          </Button>
        )}
      </Box>
    </Box>
  );
}
