import { Alert, Autocomplete, Box, createFilterOptions, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useState } from 'react';

export function EquipmentBatchDialog({ numbers, onApply, onClose }: {
  numbers: string[];
  onApply: (numbers: string[]) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState(numbers.join('\n'));
  const [excluded, setExcluded] = useState<string[]>([]);
  const chunks = input.split(/[\s,;，；]+/u).map(value => value.trim()).filter(Boolean);
  const unique = [...new Map(chunks.map(value => [value.toUpperCase(), value])).values()];
  const selected = unique.filter(value => !excluded.includes(value));
  const invalid = selected.find(value => value.length > 200);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="batch-search-title">
      <DialogTitle id="batch-search-title">품번 일괄 검색</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>엑셀의 품번 열을 그대로 붙여넣거나 줄바꿈, 쉼표, 탭, 공백으로 나눠 입력하세요. 중복은 자동으로 제거합니다.</Typography>
        <TextField fullWidth multiline minRows={6} maxRows={12} label="품번 목록" value={input}
          onChange={event => { setInput(event.target.value); setExcluded([]); }} />
        {invalid && <Alert severity="error" sx={{ mt: 2 }}>품번은 한 개당 200자까지 입력할 수 있습니다.</Alert>}
        {selected.length > 500 && <Alert severity="warning" sx={{ mt: 2 }}>한 번에 최대 500개를 검색합니다. 목록에서 검색할 품번을 골라 주세요.</Alert>}
        {unique.length > 0 && <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>입력 {unique.length}개 중 {selected.length}개 선택</Typography>
          <Autocomplete multiple disableCloseOnSelect limitTags={4} value={selected} options={unique}
            filterOptions={createFilterOptions({ limit: 100 })}
            onChange={(_, values) => {
              const chosen = new Set(values);
              setExcluded(unique.filter(value => !chosen.has(value)));
            }}
            renderInput={params => <TextField {...params} label="검색할 품번" />} />
          <Button size="small" onClick={() => setExcluded([])}>전체 선택</Button>
          <Button size="small" onClick={() => setExcluded(unique)}>선택 해제</Button>
        </Box>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onApply([])} disabled={!numbers.length}>일괄 조건 해제</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" disabled={!!invalid || !selected.length || selected.length > 500}
          onClick={() => onApply(selected)}>선택한 품번 검색</Button>
      </DialogActions>
    </Dialog>
  );
}
