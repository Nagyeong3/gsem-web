import { useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { matchingSearchOptions } from '../../utils/searchOptions';
import { normalizeTextSearchTerms, type TextSearchTerm } from '../../utils/textSearchTerms';
import { AdaptiveFilterTags } from './AdaptiveFilterTags';

export function SearchableMultiTextFilter({ label, value, options, onChange }: {
  label: string; value: TextSearchTerm[]; options: string[]; onChange: (value: TextSearchTerm[]) => void;
}) {
  const [input, setInput] = useState('');
  return <Autocomplete<TextSearchTerm, true, false, true> multiple freeSolo disableCloseOnSelect
    size="small" fullWidth openOnFocus clearOnBlur={false} filterSelectedOptions
    options={options.map(option => ({ value: option, match: 'exact' }))}
    value={value} inputValue={input}
    getOptionLabel={option => typeof option === 'string' ? option : option.value}
    isOptionEqualToValue={(a, b) => a.match === b.match && a.value === b.value}
    filterOptions={choices => {
      const matches = new Set(matchingSearchOptions(options, input));
      return choices.filter(choice => matches.has(choice.value));
    }}
    onInputChange={(_, next, reason) => { if (reason === 'input' || reason === 'clear') setInput(next); }}
    onChange={(_, next, reason) => {
      onChange(normalizeTextSearchTerms(next.map(term => typeof term === 'string'
        ? { value: term, match: 'contains' } : term)));
      if (reason === 'createOption' || reason === 'clear') setInput('');
    }}
    renderValue={(values, getItemProps) => <AdaptiveFilterTags
      labels={values.map(term => typeof term === 'string' ? `포함: ${term}`
        : `${term.match === 'contains' ? '포함: ' : ''}${term.value}`)} getItemProps={getItemProps} />}
    clearText="검색 초기화" openText="옵션 열기" closeText="닫기"
    renderInput={params => <TextField {...params} label={label} placeholder="검색 · Enter로 포함 조건 추가" />} />;
}
