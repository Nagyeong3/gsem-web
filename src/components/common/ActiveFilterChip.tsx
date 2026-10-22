import { Cancel } from '@mui/icons-material';
import { Box, Chip, IconButton } from '@mui/material';

export function ActiveFilterChip({ label, onDelete }: { label: string; onDelete: () => void }) {
  return <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
    <Chip component="span" label={label} variant="outlined" sx={{ border: 0 }} />
    <IconButton size="small" aria-label={`${label} 삭제`} onClick={(event) => { event.stopPropagation(); onDelete(); }} sx={{ mr: 0.25 }}><Cancel fontSize="small" /></IconButton>
  </Box>;
}
