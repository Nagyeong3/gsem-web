import { DownloadOutlined, Search, SettingsOutlined } from '@mui/icons-material';
import { Box, Button, FormControl, InputAdornment, InputLabel, MenuItem, Pagination, Select, TextField, Tooltip, Typography } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const selectedParam = searchParams.get('selected');
    if (selectedParam === 'none') return null;
    const parsed = Number(selectedParam);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

  const updateParams = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
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
    updateParams({ [key === 'query' ? 'q' : key]: value, page: null });
  };

  const applySearch = () => {
    updateFilter('query', searchInput);
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    const dataSource = searchParams.get('__gsemDataSource');
    if (dataSource) next.set('__gsemDataSource', dataSource);
    setSearchInput('');
    setSearchParams(next, { replace: true });
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
          <TextField
            fullWidth
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                applySearch();
              }
            }}
            placeholder="품번, 품명, 용도 검색"
            slotProps={{
              htmlInput: {
                'aria-label': '품번, 품명, 용도 검색',
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 20, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="contained"
            sx={{ minWidth: 74 }}
            onClick={applySearch}
          >
            검색
          </Button>
        </Box>

        <EquipmentSearchFilters filters={filters} options={options} activeFilters={activeFilters} filterLabels={filterLabels} updateFilter={updateFilter} resetFilters={resetFilters} />

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
            <Tooltip title="개인별 컬럼 저장은 후속 프로토타입에서 제공할 예정입니다.">
              <span>
                <Button variant="outlined" startIcon={<SettingsOutlined />} disabled>
                  컬럼 설정
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          {equipmentQuery.isLoading ? (
            <QueryStatePanel state="loading" loadingMessage="장비 정보를 불러오고 있습니다." minHeight={302} />
          ) : equipmentQuery.isError ? (
            <QueryStatePanel state="error" errorMessage="장비 정보를 불러오지 못했습니다." onRetry={equipmentQuery.refetch} minHeight={302} />
          ) : equipment.length === 0 ? (
            <QueryStatePanel state="empty" emptyMessage="검색 결과가 없습니다." emptyDescription="검색어 또는 필터 조건을 변경해보세요." onReset={resetFilters} minHeight={302} />
          ) : (
            <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
              <Table
                size="small"
                aria-label="장비 검색 결과"
                sx={{
                  minWidth: 850,
                  '& .MuiTableCell-root': {
                    px: 0.75,
                    maxWidth: 112,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 42 }} />
                    <TableCell sx={{ width: 70 }}>이미지</TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        <TableSortLabel
                          active={sortKey === column.key}
                          direction={sortKey === column.key ? sortDirection : 'asc'}
                          onClick={() => changeSort(column.key)}
                        >
                          {column.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleEquipment.map((item) => {
                    const selected = selectedEquipment?.itemId === item.itemId;
                    return (
                      <TableRow
                        key={item.itemId}
                        hover
                        selected={selected}
                        aria-selected={selected}
                        onClick={() => setSelectedId(item.itemId)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedId(item.itemId);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&.Mui-selected': {
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(108,168,255,0.14)'
                                : '#EEF5FF',
                          },
                          '&.Mui-selected:hover': {
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(108,168,255,0.2)'
                                : '#E4F0FF',
                          },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Radio
                            checked={selected}
                            size="small"
                            slotProps={{
                              input: { 'aria-label': `${item.itemNameKor} 선택` },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <EquipmentImagePreview equipment={item} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{item.itemNum}</TableCell>
                        <TableCell>{item.itemNameKor}</TableCell>
                        <TableCell>{summarize(getAircraftTypes(item))}</TableCell>
                        <TableCell>{summarize(getBusinesses(item))}</TableCell>
                        <TableCell>
                          {summarize(item.systems.map((system) => system.name))}
                        </TableCell>
                        <TableCell>{item.category.name}</TableCell>
                        <TableCell>{summarizeManagers(item)}</TableCell>
                        <TableCell>{summarize(getDestinations(item))}</TableCell>
                        <TableCell>
                          <StatusChip status={item.status} />
                        </TableCell>
                        <TableCell>{item.recentChangeDate}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

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
