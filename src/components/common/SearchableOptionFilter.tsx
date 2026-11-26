import { Autocomplete, TextField } from '@mui/material';

/** Searchable exact-option filter; clearing restores the unrestricted query. */
export function SearchableOptionFilter({ id, label, value, options, onChange, minWidth }: {
  id?: string; label: string; value: string; options: string[]; onChange: (value: string) => void; minWidth?: number;
}) {
  const choices = value && !options.includes(value) ? [value, ...options] : options;
  return <Autocomplete<string> id={id} size="small" fullWidth={minWidth === undefined} sx={{ minWidth }}
    options={choices} value={value || null} onChange={(_, next) => onChange(next ?? '')}
    openOnFocus noOptionsText="일치하는 항목 없음" clearText="전체" openText="옵션 열기" closeText="닫기"
    renderInput={params => <TextField {...params} label={label} placeholder={value ? '' : '전체 · 검색'} />} />;
}
