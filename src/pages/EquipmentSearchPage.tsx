import { Box, Button, FormControl, InputLabel, MenuItem, Pagination, Select, Typography } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchField } from '../components/common/SearchField';
import { useUrlState } from '../hooks/useUrlState';
import { useSearchDraft } from '../hooks/useSearchDraft';
import { useColumnWidths } from '../hooks/useColumnWidths';
import { PageHeader } from '../components/common/PageHeader';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import { equipmentService } from '../services';
import type { Equipment, EquipmentFilterOptions, EquipmentFilters, EquipmentSortKey, SortDirection } from '../types/domain';
import { columns, defaultPageSize, pageSizeOptions } from '../features/equipment-search/searchConfig';
import { EquipmentDetail } from '../features/equipment-search/components/EquipmentSearchDetail';
import { EquipmentSearchFilters } from '../features/equipment-search/components/EquipmentSearchFilters';
import { EquipmentSearchResults } from '../features/equipment-search/components/EquipmentSearchResults';

export function EquipmentSearchPage() {
  const navigate = useNavigate();
  const { params: searchParams, update: updateParams } = useUrlState();
  const filters = useMemo<EquipmentFilters>(() => ({
    query: searchParams.get('q') ?? '',
    aircraftType: searchParams.get('aircraftType') ?? '',
    business: searchParams.get('business') ?? '',
    system: searchParams.get('system') ?? '',
    category: searchParams.get('category') ?? '',
    manager: searchParams.get('manager') ?? '',
    destination: searchParams.get('destination') ?? '',
    status: searchParams.get('status') ?? '',
  }), [searchParams]);

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
  const [searchInput, setSearchInput] = useSearchDraft(filters.query);
  const columnWidths = useColumnWidths('gsem:equipment-search:widths:v1');
  const selectedParam = searchParams.get('selected');
  const parsedSelected = Number(selectedParam);
  const setSelectedId = (id: number | null) => updateParams({ selected: id ?? 'none' });


  const searchEquipment = useCallback(
    () => equipmentService.search({ filters, sortKey, sortDirection, page, size: pageSize }),
    [filters, page, pageSize, sortDirection, sortKey],
  );
  const equipmentQuery = useAsyncQuery({ queryFn: searchEquipment, keepPreviousData: true });
  const loadFilterOptions = useCallback(() => equipmentService.getFilterOptions(), []);
  const optionsQuery = useAsyncQuery<EquipmentFilterOptions>({ queryFn: loadFilterOptions });
  const equipment = equipmentQuery.data?.items ?? [];
  const selectedId = selectedParam === 'none' ? null : equipment.some((item) => item.itemId === parsedSelected) ? parsedSelected : equipment[0]?.itemId ?? null;
  const totalElements = equipmentQuery.data?.totalElements ?? 0;
  const totalPages = equipmentQuery.data?.totalPages ?? 1;
  const options = optionsQuery.data ?? {
    aircraftTypes: [], businesses: [], systems: [], categories: [],
    managers: [], destinations: [], statuses: [],
  };

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
  const selectedSummary =
    selectedId === null
      ? null
      : (equipment.find((item) => item.itemId === selectedId) ??
        equipment[0] ??
        null);
  const selectedEquipment =
    detailQuery.data?.itemId === selectedSummary?.itemId ? detailQuery.data : selectedSummary;

  const updateFilter = (key: keyof EquipmentFilters, value: string) => {
    updateParams({ [key === 'query' ? 'q' : key]: value.trim(), page: null, selected: null });
  };

  const removeFilter = (key: keyof EquipmentFilters) => {
    if (key === 'query') setSearchInput('');
    updateFilter(key, '');
  };

  const applySearch = () => {
    updateFilter('query', searchInput);
  };

  const resetFilters = () => {
    setSearchInput('');
    updateParams(Object.fromEntries([...searchParams.keys()].filter((key) => key !== '__gsemDataSource').map((key) => [key, null])));
  };

  const activeFilters = (Object.entries(filters) as Array<[keyof EquipmentFilters, string]>).filter(
    ([, value]) => Boolean(value),
  );

  const filterLabels: Record<keyof EquipmentFilters, string> = {
    query: '검색어',
    aircraftType: '기종',
    business: '사업',
    system: '계통',
    category: '장비 구분',
    manager: '담당자',
    destination: '주요 납지',
    status: '사용 상태',
  };

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

  return (
    <Box sx={{ display: 'flex', minWidth: 1080, bgcolor: 'background.paper' }}>
      <Box sx={{ flex: 1, minWidth: 0, p: 3, bgcolor: 'background.default' }}>
        <PageHeader
          title="장비 검색"
          description="품번과 지원장비 정보를 빠르게 조회합니다."
        />

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, maxWidth: 790 }}>
          <SearchField value={searchInput} onChange={setSearchInput} onSearch={applySearch} />
        </Box>

        <EquipmentSearchFilters filters={filters} options={options} activeFilters={activeFilters} filterLabels={filterLabels} updateFilter={updateFilter} resetFilters={resetFilters} onRemoveFilter={removeFilter} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>
            검색 결과{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              {totalElements}건
            </Box>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <Button variant="outlined" onClick={columnWidths.resetWidths}>컬럼 너비 초기화</Button>
          </Box>
        </Box>

        <EquipmentSearchResults equipment={equipment} selectedId={selectedId} isLoading={equipmentQuery.isLoading} isError={equipmentQuery.isError} refetch={equipmentQuery.refetch} resetFilters={resetFilters} sortKey={sortKey} sortDirection={sortDirection} changeSort={changeSort} onSelect={setSelectedId} columnWidths={columnWidths} />

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

      {selectedEquipment && (
        <EquipmentDetail
          equipment={selectedEquipment}
          onClose={() => setSelectedId(null)}
          onOpenFullDetail={() => navigate(`/equipment/${selectedEquipment.itemId}`)}
        />
      )}
    </Box>
  );
}
