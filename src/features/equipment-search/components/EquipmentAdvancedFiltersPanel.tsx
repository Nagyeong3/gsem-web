import { Autocomplete, createFilterOptions, Box, Button, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import type { EquipmentAdvancedFilters, EquipmentFilterOptions } from '../../../types/domain';
import { EquipmentSuggestionInput } from './EquipmentSuggestionInput';
import { advancedChoiceFields } from '../advancedFilters';
import { availableAdvancedTexts, pendingFilterFields, type FilterBoxKey } from '../filterVisibility';

const gridSx = { display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))' };

export function EquipmentAdvancedFiltersPanel({ filters, options, hiddenFilters, onApply }: {
  filters: EquipmentAdvancedFilters;
  options: EquipmentFilterOptions['advanced'];
  hiddenFilters: ReadonlySet<FilterBoxKey>;
  onApply: (values: EquipmentAdvancedFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const texts = availableAdvancedTexts.filter(([key]) => !hiddenFilters.has(key));
  const choices = advancedChoiceFields.filter(([key]) => !hiddenFilters.has(key));
  const pending = pendingFilterFields.filter(([key]) => !hiddenFilters.has(key));
  return (
    <Box component="section" aria-label="장비 검색 상세 조건" sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 2 }}>
      <Box component="form" onSubmit={event => { event.preventDefault(); onApply(draft); }}>
        {texts.length + choices.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          표시할 상세 필터가 없습니다. 필터 표시 설정에서 추가할 수 있습니다.
        </Typography>}
        <Box sx={gridSx}>
          {texts.map(([key, label]) => (
            <EquipmentSuggestionInput key={key} field={key} label={label} value={draft[key] ?? ''}
              onChange={value => setDraft(current => ({ ...current, [key]: value }))} />
          ))}
          {choices.map(([key, label]) => {
            const available = options?.[key] ?? [];
            const values = draft[key] ?? [];
            const name = (code: string) => available.find(choice => choice.code === code)?.name ?? code;
            return <Autocomplete key={key} multiple size="small" disableCloseOnSelect limitTags={2}
              options={available.map(choice => choice.code)} value={values} getOptionLabel={name}
              filterOptions={createFilterOptions({ stringify: code => `${name(code)} ${code}` })}
              getOptionDisabled={option => values.length >= 50 && !values.includes(option)}
              onChange={(_, next) => setDraft(current => ({ ...current, [key]: next }))}
              noOptionsText="선택 가능한 값이 없습니다."
              renderInput={params => <TextField {...params} label={label} />} />;
          })}
        </Box>
        {pending.length > 0 && <>
          <Typography sx={{ mt: 2, mb: 1.25, fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>연결 예정</Typography>
          <Box sx={gridSx}>
            {pending.map(([key, label]) => <TextField key={key} label={label} size="small" disabled
              value={key === 'calibration' ? '세부 조건 미정' : 'DB 매핑 확인 필요'} />)}
          </Box>
        </>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
          <Button onClick={() => { setDraft({}); onApply({}); }}>상세 조건 초기화</Button>
          <Button type="submit" variant="contained">적용</Button>
        </Box>
      </Box>
    </Box>
  );
}
