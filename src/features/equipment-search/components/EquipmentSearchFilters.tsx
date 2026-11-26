import { ExpandLess, ExpandMore, Refresh, TuneOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { SearchableOptionFilter } from '../../../components/common/SearchableOptionFilter';
import type { EquipmentFilterOptions, EquipmentFilters } from '../../../types/domain';
import { advancedChoiceFields } from '../advancedFilters';
import { availableAdvancedTexts, availableBasicFilters, pendingFilterFields, type FilterBoxKey } from '../filterVisibility';

type BasicFilterKey = Exclude<keyof EquipmentFilters, 'advanced' | 'partNumbers'>;
const gridSx = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 1.25 };

export function EquipmentSearchFilters({
  filters, options, activeFilters, updateFilter, resetFilters, onToggleAdvanced, advancedOpen, advancedCount,
  hiddenFilters, onSaveVisibility, advancedPanel, profile,
}: {
  filters: EquipmentFilters;
  options: EquipmentFilterOptions;
  activeFilters: Array<{ key: string; label: string; remove: () => void }>;
  updateFilter: (key: BasicFilterKey, value: string) => void;
  resetFilters: () => void;
  onToggleAdvanced: () => void;
  advancedOpen: boolean;
  advancedCount: number;
  hiddenFilters: ReadonlySet<FilterBoxKey>;
  onSaveVisibility: (hidden: FilterBoxKey[]) => boolean;
  advancedPanel?: ReactNode;
  profile: string;
}) {
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const basic = availableBasicFilters(options);
  const shown = basic.filter(([key]) => !hiddenFilters.has(key));
  const groups = [
    { label: '기본 필터', fields: basic },
    { label: '상세 필터', fields: [...availableAdvancedTexts, ...advancedChoiceFields] },
    { label: '연결 예정', fields: pendingFilterFields },
  ];
  const save = (next: FilterBoxKey[]) => setSaveError(!onSaveVisibility(next));

  return (
    <Paper variant="outlined" sx={{ p: 1.75, mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>검색 필터</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={onToggleAdvanced} aria-expanded={advancedOpen}
            aria-controls="equipment-advanced-filters" endIcon={advancedOpen ? <ExpandLess /> : <ExpandMore />}>
            상세 조건{advancedCount > 0 ? ` (${advancedCount})` : ''}
          </Button>
          <Button variant="outlined" size="small" startIcon={<TuneOutlined />} onClick={() => setVisibilityOpen(open => !open)}
            aria-expanded={visibilityOpen} aria-controls="equipment-filter-visibility">
            필터 표시 설정
          </Button>
        </Box>
      </Box>
      {visibilityOpen && <Box component="section" id="equipment-filter-visibility" aria-label="필터 표시 설정"
        sx={{ p: 1.5, mb: 1.75, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          {profile ? `${profile} 프로필에 저장합니다. ` : '현재 브라우저의 기본 프로필에 저장합니다. '}숨긴 필터의 적용 조건은 아래에서 확인할 수 있습니다.
        </Typography>
        {saveError && <Alert severity="error">이 브라우저에 필터 표시 설정을 저장할 수 없습니다.</Alert>}
        {groups.map(({ label, fields }) => fields.length > 0 &&
          <Box key={label} component="fieldset" sx={{ border: 0, m: 0, p: 0, mb: 1, minWidth: 0 }}>
            <Typography component="legend" sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5 }}>
              {fields.map(([key, fieldLabel]) => (
                <FormControlLabel key={key} sx={{ m: 0 }} label={fieldLabel}
                  control={<Checkbox size="small" checked={!hiddenFilters.has(key)} onChange={(_, checked) =>
                    save(checked ? [...hiddenFilters].filter(entry => entry !== key) : [...hiddenFilters, key])} />} />
              ))}
            </Box>
          </Box>)}
        <Button size="small" onClick={() => save([])} disabled={hiddenFilters.size === 0}>모두 표시</Button>
      </Box>}
      {shown.length > 0 && <Box sx={gridSx}>
        {shown.map(([key, label, source]) => <SearchableOptionFilter key={key} id={`${key}-filter`}
          label={label} value={filters[key]} options={options[source]} onChange={value => updateFilter(key, value)} />)}
      </Box>}
      {advancedOpen && <Box id="equipment-advanced-filters">{advancedPanel}</Box>}
      <Box sx={{ mt: 1.5, pt: 1.25, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: 1, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, minWidth: 0 }}>
          {activeFilters.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>선택된 검색 조건이 없습니다.</Typography>
          ) : activeFilters.map(({ key, label, remove }) => (
            <Chip key={key} label={label} title={label} onDelete={remove} variant="outlined" sx={{ maxWidth: '100%' }} />
          ))}
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={resetFilters}>초기화</Button>
      </Box>
    </Paper>
  );
}
