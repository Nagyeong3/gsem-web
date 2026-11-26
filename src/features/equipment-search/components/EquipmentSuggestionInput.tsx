import { Search } from '@mui/icons-material';
import { Autocomplete, InputAdornment, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { equipmentService } from '../../../services';
import type { EquipmentSuggestionField } from '../advancedFilters';

export function EquipmentSuggestionInput({ field, label, value, onChange, onSubmit }: {
  field: EquipmentSuggestionField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<{ query: string; options: string[]; failed?: boolean }>();
  const query = value.trim();
  const limit = field === 'query' ? 100 : 200;

  useEffect(() => {
    if (!focused || !query || !equipmentService.suggest) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      equipmentService.suggest?.(field, query, controller.signal).then(
        options => { if (!controller.signal.aborted) setResult({ query, options }); },
        () => { if (!controller.signal.aborted) setResult({ query, options: [], failed: true }); },
      );
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [field, focused, query]);

  const current = result?.query === query ? result : undefined;
  return <Autocomplete<string, false, false, true> freeSolo fullWidth
    size={field === 'query' ? 'medium' : 'small'}
    inputValue={value} value={null} clearOnBlur={false}
    options={current?.options ?? []} filterOptions={options => options}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onInputChange={(_, next, reason) => {
      if (reason === 'input' || reason === 'clear') onChange(next);
    }}
    onChange={(_, next, reason) => {
      if (reason === 'selectOption' || reason === 'createOption') {
        const value = (next ?? '').slice(0, limit);
        onChange(value);
        onSubmit?.(value);
      }
    }}
    onKeyDown={event => {
      if (event.key !== 'Enter') return;
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        event.defaultMuiPrevented = true;
      } else if (!query && onSubmit) {
        onSubmit('');
      }
    }}
    clearText="입력 지우기"
    renderInput={params => <TextField {...params}
      label={field === 'query' ? undefined : label}
      placeholder={field === 'query' ? label : undefined}
      slotProps={{
        ...params.slotProps,
        htmlInput: { ...params.slotProps.htmlInput, 'aria-label': label, maxLength: limit },
        input: field === 'query' ? { ...params.slotProps.input, startAdornment: (
          <InputAdornment position="start"><Search sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>
        ) } : params.slotProps.input,
      }}
      helperText={focused && current?.failed ? '검색 제안을 불러오지 못했습니다.' : undefined}
    />}
  />;
}
