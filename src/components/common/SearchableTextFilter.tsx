import { Autocomplete, TextField } from '@mui/material';
import { matchingSearchOptions } from '../../utils/searchOptions';

/** A free-text contains filter with suggestions. Typing updates the filter immediately;
 * selecting a suggestion simply fills the same text filter. */
export function SearchableTextFilter({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  const update = (next: string) => { if (next !== value) onChange(next); };
  return <Autocomplete<string, false, false, true> freeSolo size="small" fullWidth
    options={options} value={value || null} inputValue={value} clearOnBlur={false} openOnFocus
    filterOptions={choices => matchingSearchOptions(choices, value)}
    onInputChange={(_, next, reason) => { if (reason === 'input' || reason === 'clear') update(next); }}
    onChange={(_, next) => update(next ?? '')}
    clearText="검색 초기화" openText="옵션 열기" closeText="닫기"
    noOptionsText="일치하는 항목 없음"
    renderInput={params => <TextField {...params} label={label} placeholder="입력하여 검색" />} />;
}
