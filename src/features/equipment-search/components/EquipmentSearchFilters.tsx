import { DownloadOutlined, Refresh } from '@mui/icons-material';
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Tooltip, Typography } from '@mui/material';
import type { EquipmentFilterOptions, EquipmentFilters } from '../../../types/domain';

interface FilterSelectProps {
  id: keyof EquipmentFilters;
  label: string;
  value: string;
  options: string[];
  onChange: (key: keyof EquipmentFilters, value: string) => void;
}

function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  const labelId = `${id}-label`;
  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        value={value}
        label={label}
        onChange={(event) => onChange(id, event.target.value)}
      >
        <MenuItem value="">전체</MenuItem>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function EquipmentSearchFilters({ filters, options, activeFilters, filterLabels, updateFilter, resetFilters, onRemoveFilter }: {
  filters: EquipmentFilters;
  options: EquipmentFilterOptions;
  activeFilters: Array<[keyof EquipmentFilters, string]>;
  filterLabels: Record<keyof EquipmentFilters, string>;
  updateFilter: (key: keyof EquipmentFilters, value: string) => void;
  resetFilters: () => void;
  onRemoveFilter: (key: keyof EquipmentFilters) => void;
}) {
  return (
        <Paper variant="outlined" sx={{ p: 1.75, mb: 1.75 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
              gap: 1.25,
            }}
          >
            <FilterSelect
              id="aircraftType"
              label="기종"
              value={filters.aircraftType}
              options={options.aircraftTypes}
              onChange={updateFilter}
            />
            <FilterSelect
              id="business"
              label="사업"
              value={filters.business}
              options={options.businesses}
              onChange={updateFilter}
            />
            <FilterSelect
              id="system"
              label="계통"
              value={filters.system}
              options={options.systems}
              onChange={updateFilter}
            />
            <FilterSelect
              id="category"
              label="장비 구분"
              value={filters.category}
              options={options.categories}
              onChange={updateFilter}
            />
            <FilterSelect
              id="manager"
              label="담당자"
              value={filters.manager}
              options={options.managers}
              onChange={updateFilter}
            />
            <FilterSelect
              id="destination"
              label="주요 납지"
              value={filters.destination}
              options={options.destinations}
              onChange={updateFilter}
            />
            <FilterSelect
              id="status"
              label="사용 상태"
              value={filters.status}
              options={options.statuses}
              onChange={updateFilter}
            />
            <Tooltip title="상세 조건은 후속 프로토타입에서 제공할 예정입니다.">
              <span>
                <Button fullWidth variant="outlined" disabled sx={{ height: 38 }}>
                  상세 조건
                </Button>
              </span>
            </Tooltip>
          </Box>

          <Box
            sx={{
              minHeight: 42,
              mt: 1.5,
              pt: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {activeFilters.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                  선택된 검색 조건이 없습니다.
                </Typography>
              ) : (
                activeFilters.map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${filterLabels[key]}: ${value}`}
                    onDelete={() => onRemoveFilter(key)}
                    variant="outlined"
                  />
                ))
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={resetFilters}>
                초기화
              </Button>
              <Tooltip title="실제 다운로드는 현재 프로토타입 범위에서 제외됩니다.">
                <span>
                  <Button variant="outlined" startIcon={<DownloadOutlined />} disabled>
                    엑셀 다운로드
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

  );
}
