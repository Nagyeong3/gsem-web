import { Search } from '@mui/icons-material';
import { Box, Button, InputAdornment, TextField } from '@mui/material';
import { useRef } from 'react';

/** 한글 조합 중에는 제출하지 않고 Enter와 버튼에서 같은 검색을 실행한다. */
export function SearchField({ value, onChange, onSearch, label = '품번, 품명, 용도 검색', placeholder = label }: {
  value: string; onChange: (value: string) => void; onSearch: () => void; label?: string; placeholder?: string;
}) {
  const composing = useRef(false);
  return <Box component="form" onSubmit={(event) => { event.preventDefault(); if (!composing.current) onSearch(); }} sx={{ display: 'flex', gap: 1, width: '100%' }}>
    <TextField fullWidth value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={(event) => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || composing.current || event.keyCode === 229)) event.preventDefault(); }}
      slotProps={{ htmlInput: { 'aria-label': label }, input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment> } }} />
    <Button type="submit" variant="contained" sx={{ minWidth: 74 }}>검색</Button>
  </Box>;
}
