import { ContentPasteSearchOutlined, DownloadOutlined, SettingsOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, LinearProgress, InputLabel, MenuItem, Pagination, Select, TextField, Typography, useMediaQuery } from '@mui/material';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { runtimeConfig } from '../config/runtime';
import { preferenceKey } from '../features/preferences/pagePreferences';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import { equipmentService } from '../services';
import type { Equipment, EquipmentAdvancedFilters, EquipmentFilterOptions, EquipmentFilters, EquipmentSortKey, SortDirection } from '../types/domain';
import { columns, defaultPageSize, pageSizeOptions } from '../features/equipment-search/searchConfig';
import { EquipmentDetail } from '../features/equipment-search/components/EquipmentSearchDetail';
import { EquipmentSearchFilters } from '../features/equipment-search/components/EquipmentSearchFilters';
import { EquipmentAdvancedFiltersPanel } from '../features/equipment-search/components/EquipmentAdvancedFiltersPanel';
import { advancedFilterFields, readAdvancedFilters } from '../features/equipment-search/advancedFilters';
import { basicFilterFields, readHiddenFilters, saveHiddenFilters, type FilterBoxKey } from '../features/equipment-search/filterVisibility';
import { EquipmentSuggestionInput } from '../features/equipment-search/components/EquipmentSuggestionInput';
import { EquipmentBatchDialog } from '../features/equipment-search/components/EquipmentBatchDialog';
import { EquipmentColumnDialog } from '../features/equipment-search/components/EquipmentColumnDialog';
import { readColumnSettings, saveColumnSettings, visibleColumns, type ColumnLayout, type LayoutPreset } from '../features/equipment-search/resultColumns';
import { usePagePreference } from '../features/preferences/pagePreferences';
import { EquipmentSearchResults } from '../features/equipment-search/components/EquipmentSearchResults';

type BasicFilterKey = Exclude<keyof EquipmentFilters, 'advanced' | 'partNumbers'>;

const preferenceFields = ['q', 'aircraftType', 'business', 'system', 'category', 'manager',
  'destination', 'status', 'sort', 'direction', 'size', 'page', ...advancedFilterFields.map(([key]) => key)];
const searchPreferenceKey = preferenceKey('equipment-search', 'query');

function restoreSearchParams(params: URLSearchParams): URLSearchParams | undefined {
  if (preferenceFields.some((field) => params.has(field))) return;
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(searchPreferenceKey) ?? 'null');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return;
    const next = new URLSearchParams(params);
    for (const field of preferenceFields) {
      const value = (stored as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.length > 0) next.set(field, value);
      if (Array.isArray(value)) for (const entry of value) if (typeof entry === 'string' && entry) next.append(field, entry);
    }
    if (preferenceFields.some((field) => next.has(field))) return next;
  } catch { /* 손상된 저장값은 건너뛴다. */ }
}

export function EquipmentSearchPage() {
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [profile, setProfile] = usePagePreference('equipment-search', 'columnProfile',
    runtimeConfig.dataSource === 'mock' ? '김책임' : '', (value): value is string => typeof value === 'string' && value.length <= 80);
  const [hiddenFilterKeys, setHiddenFilterKeys] = useState(() => readHiddenFilters(profile));
  const hiddenFilters = useMemo(() => new Set(hiddenFilterKeys), [hiddenFilterKeys]);
  const saveFilterVisibility = (next: FilterBoxKey[]) => {
    try {
      saveHiddenFilters(profile, next);
      setHiddenFilterKeys(next);
      return true;
    } catch {
      return false;
    }
  };
  const [columnSettings, setColumnSettings] = useState(() => readColumnSettings(profile));
  const [columnOpen, setColumnOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporter, setExporter] = useState('');
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number }>();
  const [exportError, setExportError] = useState('');
  const shownColumns = useMemo(() => visibleColumns(columnSettings.layout), [columnSettings.layout]);
  const compactPanel = useMediaQuery('(max-width: 1199px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const [initial] = useState(() => ({ source: searchParams, restored: restoreSearchParams(searchParams) }));
  const [searchInput, setSearchInput] = useState(() => (initial.restored ?? initial.source).get('q') ?? '');

  useEffect(() => {
    if (searchParams === initial.source && initial.restored) {
      setSearchParams(initial.restored, { replace: true });
      return;
    }
    try {
      window.localStorage.setItem(searchPreferenceKey, JSON.stringify(Object.fromEntries(
        preferenceFields.filter((field) => searchParams.has(field)).map((field) => [field, searchParams.getAll(field)]),
      )));
    } catch { /* 브라우저 저장소가 차단되어도 검색은 동작한다. */ }
  }, [initial, searchParams, setSearchParams]);
  const filters = useMemo<EquipmentFilters>(() => ({
    advanced: readAdvancedFilters(searchParams),
    partNumbers,
    query: searchParams.get('q') ?? '',
    aircraftType: searchParams.get('aircraftType') ?? '',
    business: searchParams.get('business') ?? '',
    system: searchParams.get('system') ?? '',
    category: searchParams.get('category') ?? '',
    manager: searchParams.get('manager') ?? '',
    destination: searchParams.get('destination') ?? '',
    status: searchParams.get('status') ?? '',
  }), [partNumbers, searchParams]);

  const requestedSortKey = searchParams.get('sort') as EquipmentSortKey | null;
  const sortKey = columns.some((column) => column.key === requestedSortKey)
    ? requestedSortKey!
    : 'itemNum';
  const sortDirection: SortDirection = searchParams.get('direction') === 'desc' ? 'desc' : 'asc';
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedPageSize = Number(searchParams.get('size'));
  const pageSize = pageSizeOptions.includes(requestedPageSize)
    ? requestedPageSize
    : defaultPageSize;
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const selectedParam = searchParams.get('selected');
    if (selectedParam === 'none') return null;
    const parsed = Number(selectedParam);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });

  const updateParams = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSelectedId(null);
    setSearchParams(next, { replace: true });
  };

  const searchEquipment = useCallback(
    () => equipmentService.search({ filters, sortKey, sortDirection, page, size: pageSize }),
    [filters, page, pageSize, sortDirection, sortKey],
  );
  const equipmentQuery = useAsyncQuery({ queryFn: searchEquipment, keepPreviousData: true });
  const loadFilterOptions = useCallback(() => equipmentService.getFilterOptions(), []);
  const optionsQuery = useAsyncQuery<EquipmentFilterOptions>({ queryFn: loadFilterOptions });
  const equipment = equipmentQuery.data?.items ?? [];
  const totalElements = equipmentQuery.data?.totalElements ?? 0;
  const totalPages = equipmentQuery.data?.totalPages ?? 1;
  const options = optionsQuery.data ?? {
    aircraftTypes: [], businesses: [], systems: [], categories: [],
    managers: [], destinations: [], statuses: [],
  };

  // Legacy prototype filters may be stored in localStorage. Do not silently ignore them in SQL mode.
  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api' || !optionsQuery.data) return;
    const next = new URLSearchParams(searchParams);
    let updated = false;
    for (const field of ['system', 'category', 'status'] as const) {
      if (next.has(field)) { next.delete(field); updated = true; }
    }
    if (updated) setSearchParams(next, { replace: true });
  }, [optionsQuery.data, searchParams, setSearchParams]);

  const safePage = Math.min(page, totalPages);

  const loadSelectedEquipment = useCallback(
    () => equipmentService.getById(selectedId ?? 0),
    [selectedId],
  );
  const detailQuery = useAsyncQuery<Equipment | undefined>({
    queryFn: loadSelectedEquipment,
    enabled: selectedId !== null,
    keepPreviousData: true,
  });
  // Never substitute a different equipment record if filtering or paging removes the selection.
  const selectedSummary = selectedId === null ? null : equipment.find(item => item.itemId === selectedId) ?? null;
  const selectedEquipment = detailQuery.data?.itemId === selectedId ? detailQuery.data : selectedSummary;
  const closeDetail = () => setSelectedId(null);
  const detailPanel = selectedId !== null && selectedEquipment ? (
    <EquipmentDetail key={selectedId} equipment={selectedEquipment} onClose={closeDetail}
      loading={detailQuery.isLoading || (!detailQuery.isError && detailQuery.data?.itemId !== selectedId)}
      error={detailQuery.isError} onRetry={detailQuery.refetch}
      onOpenFullDetail={() => navigate(`/equipment/${selectedId}`)} />
  ) : selectedId !== null ? (
    <Box sx={{ p: 2 }}>
      {detailQuery.isError ? <Alert severity="error" action={<Button onClick={detailQuery.refetch}>재시도</Button>}>장비 상세 조회에 실패했습니다.</Alert> : detailQuery.status === 'success' ? <Alert severity="info">장비 정보를 찾을 수 없습니다.</Alert> : <LinearProgress />}
      <Button onClick={closeDetail} sx={{ mt: 1 }}>닫기</Button>
    </Box>
  ) : null;

  const updateFilter = (key: BasicFilterKey, value: string) => {
    updateParams({ [key === 'query' ? 'q' : key]: value, page: null });
  };

  const removeFilter = (key: BasicFilterKey) => {
    if (key === 'query') setSearchInput('');
    updateFilter(key, '');
  };

  const applySearch = () => {
    updateFilter('query', searchInput);
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    const dataSource = searchParams.get('__gsemDataSource');
    if (dataSource) next.set('__gsemDataSource', dataSource);
    setSearchInput('');
    setPartNumbers([]);
    setSearchParams(next, { replace: true });
  };

  const applyAdvanced = (values: EquipmentAdvancedFilters) => {
    const next = new URLSearchParams(searchParams);
    for (const [key] of advancedFilterFields) {
      next.delete(key);
      const value = values[key];
      if (Array.isArray(value)) value.forEach(entry => next.append(key, entry));
      else if (value?.trim()) next.set(key, value.trim());
    }
    next.delete('page');
    setSelectedId(null);
    setSearchParams(next, { replace: true });
  };

  const basicActiveFilters = ([['query', '검색어'] as const, ...basicFilterFields]).flatMap(([key, label]) =>
    filters[key] ? [{ key, label: `${label}: ${filters[key]}`, remove: () => removeFilter(key) }] : []);
  const advancedActiveFilters = advancedFilterFields.flatMap(([key, label]) => {
    const value = filters.advanced?.[key];
    if (!value?.length) return [];
    const display = typeof value === 'string' ? value : value.map(code =>
      (key === 'subsystems' || key === 'maintenanceLevels' || key === 'categories')
        ? options.advanced?.[key]?.find(choice => choice.code === code)?.name ?? code
        : code).join(', ');
    return [{
      key,
      label: `${label}: ${display}`,
      remove: () => {
        const next = { ...filters.advanced };
        delete next[key];
        applyAdvanced(next);
      },
    }];
  });

  const changeSort = (key: EquipmentSortKey) => {
    updateParams({
      sort: key === 'itemNum' ? null : key,
      direction: sortKey === key && sortDirection === 'asc' ? 'desc' : null,
      page: null,
    });
  };

  const changePageSize = (nextPageSize: number) => {
    updateParams({
      size: nextPageSize === defaultPageSize ? null : nextPageSize,
      page: null,
    });
  };

  const applyBatch = (numbers: string[]) => {
    setPartNumbers(numbers);
    updateParams({ page: null });
    setBatchOpen(false);
  };

  const saveColumns = (layout: ColumnLayout, presets: LayoutPreset[]) => {
    try {
      saveColumnSettings(profile, layout, presets);
      setColumnSettings({ layout, presets });
      setColumnOpen(false);
      return true;
    } catch {
      return false;
    }
  };

  const startExport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!exporter.trim() || exportProgress) return;
    setExportError('');
    setExportProgress({ done: 0, total: totalElements });
    try {
      const { exportEquipment } = await import('../features/equipment-search/equipmentExport');
      await exportEquipment(equipmentService, { filters, sortKey, sortDirection }, shownColumns, exporter.trim(),
        (done, total) => setExportProgress({ done, total }));
      setExportOpen(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '엑셀 문서를 만들지 못했습니다.');
    } finally {
      setExportProgress(undefined);
    }
  };

  return (
    <Box sx={{ minWidth: 0, p: { xs: 1.5, md: 3 }, bgcolor: 'background.default' }}>
        <PageHeader
          title="장비 검색"
          description="품번과 지원장비 정보를 빠르게 조회합니다."
        />

        <Box sx={{ display: 'flex', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 1, mb: 1.5, maxWidth: 990 }}>
          <EquipmentSuggestionInput field="query"
            label={runtimeConfig.dataSource === 'api' ? '품번, KAI 품번, 품명, NSN 검색' : '품번, 품명 검색'}
            value={searchInput} onChange={setSearchInput} onSubmit={value => updateFilter('query', value)} />
          <Button
            variant="contained"
            sx={{ minWidth: 74 }}
            onClick={applySearch}
          >
            검색
          </Button>
          <Button variant="outlined" startIcon={<ContentPasteSearchOutlined />} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => setBatchOpen(true)}>품번 일괄 검색{partNumbers.length > 0 ? ` (${partNumbers.length})` : ''}</Button>
        </Box>
        {batchOpen && <EquipmentBatchDialog numbers={partNumbers} onApply={applyBatch} onClose={() => setBatchOpen(false)} />}
        {partNumbers.length > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="body2">품번 {partNumbers.length}개 정확일치 · 다른 검색 조건과 함께 적용</Typography>
          <Button size="small" onClick={() => applyBatch([])}>일괄 조건 해제</Button>
        </Box>}

        <EquipmentSearchFilters filters={filters} options={options} activeFilters={[...basicActiveFilters, ...advancedActiveFilters]}
          updateFilter={updateFilter} resetFilters={resetFilters} profile={profile} hiddenFilters={hiddenFilters} onSaveVisibility={saveFilterVisibility}
          advancedOpen={advancedOpen} onToggleAdvanced={() => setAdvancedOpen(open => !open)} advancedCount={advancedActiveFilters.length}
          advancedPanel={<EquipmentAdvancedFiltersPanel key={JSON.stringify(filters.advanced)} filters={filters.advanced ?? {}}
            options={options.advanced} hiddenFilters={hiddenFilters} onApply={applyAdvanced} />} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 1,
            mb: 1,
          }}
        >
          <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>
            검색 결과{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              {totalElements}건
            </Box>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 116 }}>
              <InputLabel id="equipment-page-size-label">표시 개수</InputLabel>
              <Select
                labelId="equipment-page-size-label"
                value={String(pageSize)}
                label="표시 개수"
                onChange={(event) => changePageSize(Number(event.target.value))}
              >
                {pageSizeOptions.map((option) => (
                  <MenuItem key={option} value={String(option)}>
                    {option}개
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<SettingsOutlined />} onClick={() => setColumnOpen(true)}>컬럼 설정</Button>
            <Button variant="outlined" startIcon={<DownloadOutlined />}
              disabled={equipmentQuery.isLoading || equipmentQuery.isError || !totalElements}
              onClick={() => { setExporter(profile); setExportError(''); setExportOpen(true); }}>엑셀 내보내기</Button>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: selectedId !== null && !compactPanel ? 'minmax(0, 1fr) minmax(320px, 360px)' : 'minmax(0, 1fr)', gap: 1.5, alignItems: 'start' }}>
          <Box sx={{ minWidth: 0 }}>
        <EquipmentSearchResults columns={shownColumns} query={filters.query} equipment={equipment} selectedId={selectedId} isLoading={equipmentQuery.isLoading} isError={equipmentQuery.isError} refetch={equipmentQuery.refetch} resetFilters={resetFilters} sortKey={sortKey} sortDirection={sortDirection} changeSort={changeSort} onSelect={setSelectedId} />

        {!equipmentQuery.isLoading && !equipmentQuery.isError && equipment.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              page={safePage}
              count={totalPages}
              color="primary"
              shape="rounded"
              onChange={(_, nextPage) => updateParams({ page: nextPage === 1 ? null : nextPage })}
            />
          </Box>
        )}
          </Box>
          {selectedId !== null && !compactPanel && <Box sx={{ position: 'sticky', top: theme => `${theme.layout.headerHeight + 12}px`, minWidth: 0 }}>{detailPanel}</Box>}
        </Box>
        {columnOpen && <EquipmentColumnDialog key={profile} profile={profile} layout={columnSettings.layout}
          presets={columnSettings.presets} onClose={() => setColumnOpen(false)} onSave={saveColumns}
          onSwitchProfile={name => {
            setProfile(name);
            setColumnSettings(readColumnSettings(name));
            setHiddenFilterKeys(readHiddenFilters(name));
          }} />}
        {exportOpen && <Dialog open onClose={() => { if (!exportProgress) setExportOpen(false); }} fullWidth maxWidth="xs"
          aria-labelledby="equipment-export-title">
          <Box component="form" onSubmit={startExport}>
            <DialogTitle id="equipment-export-title">검색 결과 엑셀 내보내기</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ mb: 2 }}>
                검색 조건에 맞는 전체 결과를 현재 열 순서로 내보냅니다. 담당자는 항상 포함합니다.
              </Typography>
              <TextField fullWidth required label="추출 담당자" size="small" value={exporter} disabled={!!exportProgress}
                slotProps={{ htmlInput: { maxLength: 80 } }} onChange={event => setExporter(event.target.value)} />
              {exportError && <Alert severity="error" sx={{ mt: 2 }}>{exportError}</Alert>}
              {exportProgress && <Box sx={{ mt: 2 }} role="status">
                <Typography variant="body2" sx={{ mb: 0.5 }}>{exportProgress.done} / {exportProgress.total}건</Typography>
                <LinearProgress aria-label="내보내기 진행률" variant="determinate"
                  value={exportProgress.total ? Math.min(100, 100 * exportProgress.done / exportProgress.total) : 0} />
              </Box>}
            </DialogContent>
            <DialogActions>
              <Button disabled={!!exportProgress} onClick={() => setExportOpen(false)}>취소</Button>
              <Button type="submit" variant="contained" disabled={!!exportProgress || !exporter.trim()}>엑셀 다운로드</Button>
            </DialogActions>
          </Box>
        </Dialog>}
        {compactPanel && <Dialog open={selectedId !== null} onClose={closeDetail} fullWidth maxWidth="sm" aria-label="장비 상세">{detailPanel}</Dialog>}
    </Box>
  );
}
