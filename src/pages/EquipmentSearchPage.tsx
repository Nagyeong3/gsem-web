import {
  Close,
  DownloadOutlined,
  History,
  OpenInNew,
  Refresh,
  Search,
  SettingsOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Radio,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { QueryStatePanel } from '../components/common/QueryStatePanel';
import { StatusChip } from '../components/common/StatusChip';
import {
  emptyEquipmentFilters,
  getAircraftTypes,
  getBusinesses,
  getDestinations,
  summarize,
  summarizeManagers,
} from '../features/equipment-search/equipmentSearch';
import { equipmentService } from '../services';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentFilters,
  EquipmentSortKey,
  SortDirection,
} from '../types/domain';

const pageSize = 5;

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

const columns: Array<{ key: EquipmentSortKey; label: string }> = [
  { key: 'itemNum', label: '품번' },
  { key: 'itemNameKor', label: '품명' },
  { key: 'aircraftType', label: '기종' },
  { key: 'business', label: '사업' },
  { key: 'system', label: '계통' },
  { key: 'category', label: '장비 구분' },
  { key: 'manager', label: '담당자' },
  { key: 'destination', label: '주요 납지' },
  { key: 'status', label: '상태' },
  { key: 'recentChangeDate', label: '최근 변경일' },
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 1.5, py: 0.45 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ mb: 0.75, fontSize: 13, fontWeight: 700 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function EquipmentDetail({
  equipment,
  onClose,
  onOpenFullDetail,
}: {
  equipment: Equipment;
  onClose: () => void;
  onOpenFullDetail: () => void;
}) {
  const businesses = getBusinesses(equipment);
  const aircraftTypes = getAircraftTypes(equipment);
  const destinations = getDestinations(equipment);

  return (
    <Paper
      component="aside"
      square
      elevation={0}
      aria-label="선택 장비 상세"
      sx={{
        width: 336,
        flex: '0 0 336px',
        minHeight: 'calc(100vh - 58px)',
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          height: 52,
          px: 2.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>장비 상세</Typography>
        <IconButton size="small" aria-label="상세 패널 닫기" onClick={onClose}>
          <Close sx={{ fontSize: 19 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 2.25, py: 1.75 }}>
        <StatusChip status={equipment.status} />
        <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 700 }}>
          {equipment.itemNameKor}
        </Typography>
        <Typography sx={{ mt: 0.25, color: 'text.secondary' }}>{equipment.itemNum}</Typography>

        <DetailSection title="기본정보">
          <DetailRow label="품번" value={equipment.itemNum} />
          <DetailRow label="품명" value={equipment.itemNameKor} />
          <DetailRow label="영문 품명" value={equipment.itemNameEng} />
          <DetailRow label="장비 구분" value={equipment.category.name} />
          <DetailRow label="제조사" value={equipment.manufacturer} />
          <DetailRow label="최근 변경" value={equipment.recentChangeDate} />
        </DetailSection>

        <DetailSection title="적용정보">
          <DetailRow label="기종" value={aircraftTypes.join(' · ') || '-'} />
          <DetailRow label="사업" value={businesses.join(' · ') || '-'} />
          <DetailRow
            label="계통"
            value={equipment.systems.map((system) => system.name).join(' · ') || '-'}
          />
          <DetailRow
            label="정비 계단"
            value={equipment.maintenanceLevels.map((level) => level.name).join(' · ') || '-'}
          />
        </DetailSection>

        <DetailSection title="담당자">
          {equipment.managers.map((manager) => (
            <Box
              key={`${manager.id}-${manager.role}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: '44px 72px 1fr',
                alignItems: 'center',
                gap: 0.75,
                py: 0.5,
              }}
            >
              <Chip
                label={manager.assignmentType ?? '미지정'}
                size="small"
                variant="outlined"
                color={manager.assignmentType === '정' ? 'primary' : 'default'}
              />
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{manager.name}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>
                {manager.role ?? '역할 미지정'}
              </Typography>
            </Box>
          ))}
        </DetailSection>

        <DetailSection title="용도 및 납품">
          <DetailRow label="용도" value={equipment.itemUsageKor} />
          <DetailRow label="영문 용도" value={equipment.itemUsageEng} />
          <DetailRow label="주요 납지" value={destinations.join(' · ') || '-'} />
        </DetailSection>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 1, pt: 1.25 }}>
          <Tooltip title="변경 이력은 후속 프로토타입 범위입니다.">
            <span>
              <Button fullWidth variant="outlined" startIcon={<History />} disabled>
                변경 이력
              </Button>
            </span>
          </Tooltip>
          <Button
            fullWidth
            variant="contained"
            endIcon={<OpenInNew />}
            onClick={onOpenFullDetail}
          >
            전체 상세
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export function EquipmentSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<EquipmentFilters>({
    ...emptyEquipmentFilters,
    query: searchParams.get('q') ?? '',
    status: searchParams.get('status') ?? '',
  });
  const [sortKey, setSortKey] = useState<EquipmentSortKey>('itemNum');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [requestedSelectedId, setRequestedSelectedId] = useState<number | null>(1);

  const searchEquipment = useCallback(
    () => equipmentService.search({ filters, sortKey, sortDirection, page, size: pageSize }),
    [filters, page, sortDirection, sortKey],
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
  const visibleEquipment = equipment;
  const selectedId = requestedSelectedId === null
    ? null
    : equipment.some((item) => item.itemId === requestedSelectedId)
      ? requestedSelectedId
      : (equipment[0]?.itemId ?? null);
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
        visibleEquipment[0] ??
        null);
  const selectedEquipment =
    detailQuery.data?.itemId === selectedSummary?.itemId ? detailQuery.data : selectedSummary;

  const updateFilter = (key: keyof EquipmentFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(emptyEquipmentFilters);
    setPage(1);
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
    if (sortKey === key) setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
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
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
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
          <Button variant="contained" sx={{ minWidth: 74 }}>
            검색
          </Button>
        </Box>

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
                    onDelete={() => updateFilter(key, '')}
                    variant="outlined"
                  />
                ))
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={resetFilters}>
                초기화
              </Button>
              <Tooltip title="실제 다운로드는 1차 프로토타입 범위에서 제외됩니다.">
                <span>
                  <Button variant="outlined" startIcon={<DownloadOutlined />} disabled>
                    엑셀 다운로드
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

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
          <Tooltip title="개인별 컬럼 저장은 후속 프로토타입에서 제공할 예정입니다.">
            <span>
              <Button variant="outlined" startIcon={<SettingsOutlined />} disabled>
                컬럼 설정
              </Button>
            </span>
          </Tooltip>
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
                        onClick={() => setRequestedSelectedId(item.itemId)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setRequestedSelectedId(item.itemId);
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
              onChange={(_, nextPage) => setPage(nextPage)}
            />
          </Box>
        )}
      </Box>

      {selectedEquipment && (
        <EquipmentDetail
          equipment={selectedEquipment}
          onClose={() => setRequestedSelectedId(null)}
          onOpenFullDetail={() => navigate(`/equipment/${selectedEquipment.itemId}`)}
        />
      )}
    </Box>
  );
}
