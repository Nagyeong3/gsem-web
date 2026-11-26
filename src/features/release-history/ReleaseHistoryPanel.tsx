import { CloseOutlined } from '@mui/icons-material';
import { Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import { APP_VERSION } from '../../config/appVersion';
import { getReleaseEntries } from './releases';

const channel = import.meta.env.VITE_RELEASE_CHANNEL === 'development'
  || (import.meta.env.VITE_RELEASE_CHANNEL !== 'production' && import.meta.env.DEV)
  ? 'development' : 'production';

export function ReleaseHistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const entries = getReleaseEntries(channel);
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="release-history-title" maxWidth={false}
      slotProps={{
        container: { sx: { justifyContent: 'flex-end' } },
        paper: { sx: { m: 0, width: 'min(100%, 520px)', height: '100%', maxHeight: '100%', borderRadius: 0 } },
      }}>
      <DialogTitle id="release-history-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        버전 변경 이력
        <IconButton aria-label="버전 변경 이력 닫기" onClick={onClose}><CloseOutlined /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>현재 버전 {APP_VERSION}</Typography>
          <Chip size="small" variant="outlined" label={channel === 'development' ? '개발용' : '운영용'} />
        </Stack>
        {entries.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          등록된 버전 변경 이력이 없습니다.
        </Typography>}
        <Stack spacing={1.5}>
          {entries.map(entry => (
            <Box component="article" key={entry.version} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>{entry.version}</Typography>
                {entry.version === APP_VERSION && <Chip size="small" color="primary" label="현재" />}
                {entry.deployedOn && <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  운영 반영 {entry.deployedOn}
                </Typography>}
              </Stack>
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 0, listStyle: 'none' }}>
                {entry.changes.map(({ keyword, description }) => (
                  <Box component="li" key={keyword} sx={{ mb: 1 }}>
                    <Typography component="h3" variant="body2" sx={{ color: 'primary.main', fontWeight: 800 }}>{keyword}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.65 }}>{description}</Typography>
                  </Box>
                ))}
              </Box>
              {channel === 'development' && entry.verification && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>{entry.verification}</Typography>
              )}
            </Box>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
