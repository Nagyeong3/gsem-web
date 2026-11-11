import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, Tooltip, Dialog, DialogTitle, DialogContent, IconButton,
} from '@mui/material';
import { RefreshOutlined, ImageNotSupportedOutlined, CloseOutlined, ZoomInOutlined } from '@mui/icons-material';
import { PageHeader } from '../components/common/PageHeader';
import { runtimeConfig } from '../config/runtime';
import { fetchBusinessOptions, type DbBusiness } from '../features/equipment-master/model';
import { aggregateDemoLines, mockBusinesses, mockRoundItems, mockRounds } from '../data/deliveryRoundMock';

type Round = {
  subContractId: number; businessId: number; businessName: string;
  destination: string | null; subContractName: string | null; deliveryDate: string | null;
  itemCount: number; pointCount: number; prCount: number; poCount: number;
  receivedCount: number; deliveredCount: number; deliveryCompleted: boolean;
  deliveryAmount: number;
};
type RoundItem = {
  matchId: number; itemId: number; itemNumber: string; itemName: string | null;
  quantity: number | null; receivingExpected: string | null; receivedAt: string | null;
  deliveredAt: string | null; vendorName: string | null; buyerName: string | null;
  contractPrice?: number | null;
};
type LoadState<T> = { loading: boolean; data?: T; error?: string };
type FilterOptions = { vendors: string[]; destinations: string[] };
type AircraftCategory = 'all' | 'fixed' | 'rotary';
const date = (value: string | null) => value?.slice(0, 10) || '-';
const number = (value: number | null | undefined) => value == null ? '-' : value.toLocaleString('ko-KR');

type DeliveryIndicator = 'complete' | 'due-soon' | 'incomplete';
type StatusFilter = DeliveryIndicator;
const statusChoices: Array<{ value: StatusFilter; label: string; color: string }> = [
  { value: 'complete', label: '완료', color: '#16A34A' },
  { value: 'incomplete', label: '미완료', color: '#EAB308' },
  { value: 'due-soon', label: '납기 임박/경과', color: '#DC2626' },
];

/**
 * Only an incomplete delivery within 7 calendar days before its contractual due
 * date (or already overdue) is critical. Compare calendar days, not timestamps.
 */
function getDeliveryIndicator(round: Pick<Round, 'deliveryCompleted' | 'deliveryDate'>, today = new Date()): DeliveryIndicator {
  if (round.deliveryCompleted) return 'complete';
  if (!round.deliveryDate) return 'incomplete';
  const datePart = round.deliveryDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return 'incomplete';
  const [year, month, day] = datePart.split('-').map(Number);
  const due = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysRemaining = Math.round((due - todayUtc) / 86_400_000);
  return daysRemaining <= 7 ? 'due-soon' : 'incomplete';
}

const indicatorInfo: Record<DeliveryIndicator, { label: string; color: string }> = {
  complete: { label: '납품완료', color: '#16A34A' },
  incomplete: { label: '납품미완료', color: '#EAB308' },
  'due-soon': { label: '납품미완료 · 납기 7일 이내 또는 경과', color: '#DC2626' },
};

function DeliveryStatusDot({ round }: { round: Round }) {
  const status = indicatorInfo[getDeliveryIndicator(round)];
  return (
    <Box component="span" role="img" aria-label={status.label} title={status.label}
      sx={{ display: 'inline-block', width: 13, height: 13, borderRadius: '50%',
        bgcolor: status.color, verticalAlign: 'middle', boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }} />
  );
}



function demoImageUrl(itemId: number): string {
  const hue = (itemId * 41 + 160) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="320" viewBox="0 0 400 320">
    <rect width="400" height="320" rx="18" fill="#eef2f6"/>
    <rect x="82" y="75" width="236" height="162" rx="16" fill="hsl(${hue},22%,35%)"/>
    <rect x="103" y="97" width="194" height="92" rx="7" fill="#dce8ed"/>
    <rect x="115" y="109" width="168" height="66" rx="5" fill="#a1bcc8"/>
    <circle cx="132" cy="209" r="9" fill="#8ee0ac"/>
    <circle cx="163" cy="209" r="9" fill="#f4bb75"/>
    <rect x="222" y="201" width="59" height="15" rx="5" fill="#748899"/>
    <path d="M150 74 V53 Q150 43 160 43 H240 Q250 43 250 53 V74" stroke="#647789" stroke-width="13" fill="none"/>
    <rect x="112" y="238" width="30" height="16" rx="4" fill="#3f5365"/>
    <rect x="259" y="238" width="30" height="16" rx="4" fill="#3f5365"/>
    <text x="200" y="289" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">DEMO-${String(itemId).padStart(3, '0')}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function EquipmentImageThumbnail({
  item, onExpand,
}: { item: RoundItem; onExpand: (item: RoundItem, url: string) => void }) {
  const url = runtimeConfig.dataSource === 'api'
    ? `${runtimeConfig.apiBaseUrl}/equipment-master/image/${item.itemId}`
    : demoImageUrl(item.itemId);
  const [failed, setFailed] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  if (failed) {
    return <Box aria-label={`${item.itemNumber} 이미지 없음`} sx={{ width: 52, height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover',
      borderRadius: 1, color: 'text.disabled' }}><ImageNotSupportedOutlined fontSize="small" /></Box>;
  }
  return (
    <Tooltip placement="right" arrow enterDelay={250} enterTouchDelay={0}
      open={hoverOpen} onOpen={() => setHoverOpen(true)} onClose={() => setHoverOpen(false)}
      title={<Box component="img" src={url} alt={item.itemName || item.itemNumber}
        sx={{ display: 'block', width: 270, maxHeight: 240, objectFit: 'contain', bgcolor: 'background.paper' }} />}>
      <IconButton aria-label={`${item.itemNumber} 이미지 확대`} onClick={() => { setHoverOpen(false); onExpand(item, url); }}
        sx={{ p: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider',
          position: 'relative', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}>
        <Box component="img" src={url} loading="lazy" onError={() => setFailed(true)}
          alt={`${item.itemNumber} 장비 이미지`}
          sx={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 0.5 }} />
        <ZoomInOutlined sx={{ position: 'absolute', right: 1, bottom: 1, fontSize: 16,
          bgcolor: 'background.paper', borderRadius: 0.5 }} />
      </IconButton>
    </Tooltip>
  );
}

function loadString(key: string) {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function loadIds(): number[] {
  try {
    const value: unknown = JSON.parse(loadString('gsem.deliveryRound.businessIds.v1') || '[]');
    return Array.isArray(value) ? value.filter((id): id is number => Number.isSafeInteger(id) && id > 0) : [];
  } catch { return []; }
}
function loadStringList(key: string, legacyKey: string): string[] {
  const raw = loadString(key);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    } catch { /* Ignore an invalid saved value. */ }
  }
  const previous = loadString(legacyKey);
  return previous ? [previous] : [];
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Storage can be disabled. */ }
}
async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path.split('?')[0]}`);
  return await response.json() as T;
}

export function DeliveryRoundMasterPage() {
  const [businesses, setBusinesses] = useState<DbBusiness[]>(() => runtimeConfig.dataSource === 'api' ? [] : mockBusinesses);
  const [selectedIds, setSelectedIds] = useState<number[]>(loadIds);
  const [aircraftCategory, setAircraftCategory] = useState<AircraftCategory>(() => {
    const value = loadString('gsem.deliveryRound.aircraftCategory.v1');
    return value === 'fixed' || value === 'rotary' ? value : 'all';
  });
  const [vendors, setVendors] = useState<string[]>(() => loadStringList('gsem.deliveryRound.vendors.v2', 'gsem.deliveryRound.vendor.v1'));
  const [destinations, setDestinations] = useState<string[]>(() => loadStringList('gsem.deliveryRound.destinations.v2', 'gsem.deliveryRound.destination.v1'));
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>(() => {
    const saved = loadStringList('gsem.deliveryRound.statuses.v2', 'gsem.deliveryRound.status.v1');
    return saved.filter((value): value is StatusFilter =>
      value === 'complete' || value === 'incomplete' || value === 'due-soon');
  });
  const [dateFrom, setDateFrom] = useState(() => loadString('gsem.deliveryRound.dateFrom.v1'));
  const [dateTo, setDateTo] = useState(() => loadString('gsem.deliveryRound.dateTo.v1'));
  const [options, setOptions] = useState<FilterOptions>({ vendors: [], destinations: [] });
  const [filterOptionsError, setFilterOptionsError] = useState('');
  const [rounds, setRounds] = useState<LoadState<Round[]>>({ loading: true });
  const [expanded, setExpanded] = useState<number[]>([]);
  const [detail, setDetail] = useState<Record<number, LoadState<RoundItem[]>>>({});
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState<{ url: string; item: RoundItem } | null>(null);

  useEffect(() => { save('gsem.deliveryRound.businessIds.v1', JSON.stringify(selectedIds)); }, [selectedIds]);
  useEffect(() => { save('gsem.deliveryRound.aircraftCategory.v1', aircraftCategory); }, [aircraftCategory]);
  useEffect(() => { save('gsem.deliveryRound.vendors.v2', JSON.stringify(vendors)); }, [vendors]);
  useEffect(() => { save('gsem.deliveryRound.destinations.v2', JSON.stringify(destinations)); }, [destinations]);
  useEffect(() => { save('gsem.deliveryRound.statuses.v2', JSON.stringify(statusFilters)); }, [statusFilters]);
  useEffect(() => { save('gsem.deliveryRound.dateFrom.v1', dateFrom); }, [dateFrom]);
  useEffect(() => { save('gsem.deliveryRound.dateTo.v1', dateTo); }, [dateTo]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api') return;
    // fetchBusinessOptions has its own request; guard against late completion.
    let active = true;
    fetchBusinessOptions()
      .then((values) => { if (active) { setBusinesses(values); if (values.length === 0) setRounds({ loading: false, data: [] }); } })
      .catch((error: unknown) => {
        if (active) setRounds({ loading: false, error: error instanceof Error ? error.message : '사업 목록 조회 실패' });
      });
    return () => { active = false; };
  }, [reload]);

  const selectedBusinessIds = useMemo(() => {
    const valid = new Set(businesses.map((item) => item.businessId));
    const ids = selectedIds.filter((id) => valid.has(id));
    return ids.length ? ids : businesses.map((item) => item.businessId);
  }, [businesses, selectedIds]);

  useEffect(() => {
    if (businesses.length === 0) return;
    if (runtimeConfig.dataSource !== 'api') return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    selectedBusinessIds.forEach((id) => params.append('businessIds', String(id)));
    readJson<FilterOptions>(`/delivery-rounds/filter-options?${params}`, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setOptions(data); setFilterOptionsError(''); } })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOptions({ vendors: [], destinations: [] });
          setFilterOptionsError(error instanceof Error ? error.message : '필터 옵션 조회 실패');
        }
      });
    return () => controller.abort();
  }, [businesses, selectedBusinessIds, reload]);

  const mockOptions = useMemo<FilterOptions>(() => ({
    vendors: [...new Set(
      mockRounds.filter((round) => selectedBusinessIds.includes(round.businessId))
        .flatMap((round) => (mockRoundItems[round.subContractId] ?? []).map((item) => item.vendorName)),
    )].sort(),
    destinations: [...new Set(
      mockRounds.filter((round) => selectedBusinessIds.includes(round.businessId)).map((round) => round.destination),
    )].sort(),
  }), [selectedBusinessIds]);
  const displayOptions = runtimeConfig.dataSource === 'api' ? options : mockOptions;
  const dateError = dateFrom && dateTo && dateFrom > dateTo
    ? '계약상 납기 시작일이 종료일보다 늦습니다.' : '';

  const mockData = useMemo<Round[]>(() => mockRounds
    .filter((round) => selectedBusinessIds.includes(round.businessId))
    .filter((round) => destinations.length === 0 || destinations.includes(round.destination))
    .filter((round) => !dateFrom || round.deliveryDate >= dateFrom)
    .filter((round) => !dateTo || round.deliveryDate <= dateTo)
    .map((round) => {
      const lines = mockRoundItems[round.subContractId] ?? [];
      const matching = vendors.length > 0 ? lines.filter((line) => vendors.includes(line.vendorName)) : lines;
      return { ...round, ...aggregateDemoLines(matching), hasMatchingItems: matching.length > 0 };
    })
    .filter((round) => vendors.length === 0 || round.hasMatchingItems),
  [selectedBusinessIds, vendors, destinations, dateFrom, dateTo]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api' || businesses.length === 0 || dateError) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    selectedBusinessIds.forEach((id) => params.append('businessIds', String(id)));
    vendors.forEach((value) => params.append('vendors', value));
    destinations.forEach((value) => params.append('destinations', value));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    readJson<{ items: Round[] }>(`/delivery-rounds?${params}`, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setRounds({ loading: false, data: result.items }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setRounds({ loading: false, error: error instanceof Error ? error.message : '차수 조회 실패' });
      });
    return () => controller.abort();
  }, [businesses, selectedBusinessIds, vendors, destinations, dateFrom, dateTo, dateError, reload]);

  const displayedRounds: LoadState<Round[]> = dateError
    ? { loading: false, error: dateError }
    : runtimeConfig.dataSource === 'api' ? rounds : { loading: false, data: mockData };
  const statusFilteredRounds: LoadState<Round[]> = displayedRounds.data && statusFilters.length > 0
    ? { ...displayedRounds, data: displayedRounds.data.filter((round) => statusFilters.includes(getDeliveryIndicator(round))) }
    : displayedRounds;
  const changeFilters = (apply: () => void) => {
    apply();
    setExpanded([]);
    setDetail({});
    if (runtimeConfig.dataSource === 'api') setRounds({ loading: true });
  };

  const openRound = useCallback((roundId: number) => {
    const isOpen = expanded.includes(roundId);
    setExpanded((current) => isOpen ? current.filter((id) => id !== roundId) : [...current, roundId]);
    if (isOpen || detail[roundId]?.data || detail[roundId]?.loading) return;
    const round = statusFilteredRounds.data?.find((entry) => entry.subContractId === roundId);
    if (!round) return;
    if (runtimeConfig.dataSource !== 'api') {
      const all = mockRoundItems[roundId] ?? [];
      setDetail((current) => ({ ...current, [roundId]: {
        loading: false, data: vendors.length > 0 ? all.filter((item) => vendors.includes(item.vendorName)) : all,
      } }));
      return;
    }
    setDetail((current) => ({ ...current, [roundId]: { loading: true } }));
    const params = new URLSearchParams({ businessId: String(round.businessId) });
    vendors.forEach((value) => params.append('vendors', value));
    void readJson<{ items: RoundItem[] }>(`/delivery-rounds/${roundId}/items?${params}`)
      .then((result) => setDetail((current) => ({ ...current, [roundId]: { loading: false, data: result.items } })))
      .catch((error: unknown) => setDetail((current) => ({ ...current, [roundId]: {
        loading: false, error: error instanceof Error ? error.message : '품목 조회 실패',
      } })));
  }, [expanded, detail, statusFilteredRounds.data, vendors]);

  const resetFilters = () => changeFilters(() => {
    setSelectedIds([]); setVendors([]); setDestinations([]); setStatusFilters([]); setDateFrom(''); setDateTo('');
  });

  return (
    <Box sx={{ minWidth: 0, p: { xs: 1.5, md: 3 }, bgcolor: 'background.default' }}>
      <PageHeader title="지원장비 통합현황" description="사업·납품 부대·차수별 현황을 조회하고 행을 클릭해 납품 품목을 확인합니다. (읽기 전용)" />
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <ToggleButtonGroup size="small" exclusive value={aircraftCategory}
          onChange={(_, value: AircraftCategory | null) => { if (value) setAircraftCategory(value); }}
          aria-label="항공기 유형 (UI 시안)">
          <ToggleButton value="all">전체</ToggleButton>
          <ToggleButton value="fixed">고정익</ToggleButton>
          <ToggleButton value="rotary">회전익</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ width: { xs: '100%', sm: 260 }, minWidth: 210 }}>
          <Autocomplete multiple size="small" options={businesses}
            value={businesses.filter((entry) => selectedIds.includes(entry.businessId))}
            getOptionLabel={(entry) => entry.businessName}
            isOptionEqualToValue={(a, b) => a.businessId === b.businessId}
            onChange={(_, values) => changeFilters(() => {
              setSelectedIds(values.map((entry) => entry.businessId));
              setVendors([]);
              setDestinations([]);
            })}
            renderInput={(params) => <TextField {...params} label="사업 선택 (복수)" placeholder={selectedIds.length ? '' : '전체 사업'} />}
            limitTags={2}
          />
        </Box>
        <Box sx={{ minWidth: 155, width: 180 }}>
          <Autocomplete multiple size="small" options={displayOptions.vendors}
            value={vendors} filterSelectedOptions limitTags={1}
            onChange={(_, values) => changeFilters(() => setVendors(values))}
            renderInput={(params) => <TextField {...params} label="조달원 (복수)" placeholder={vendors.length ? '' : '전체 조달원'} />}
          />
        </Box>
        <Box sx={{ minWidth: 155, width: 180 }}>
          <Autocomplete multiple size="small" options={displayOptions.destinations}
            value={destinations} filterSelectedOptions limitTags={1}
            onChange={(_, values) => changeFilters(() => setDestinations(values))}
            renderInput={(params) => <TextField {...params} label="납품 부대 (복수)" placeholder={destinations.length ? '' : '전체 부대'} />}
          />
        </Box>
        <Box sx={{ minWidth: 190, width: 210 }}>
          <Autocomplete multiple size="small" disableCloseOnSelect
            filterOptions={(choices) => choices}
            options={statusChoices} value={statusChoices.filter((choice) => statusFilters.includes(choice.value))}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            getOptionLabel={(choice) => choice.label} limitTags={1}
            onChange={(_, values) => changeFilters(() => setStatusFilters(values.map((value) => value.value)))}
            renderOption={(props, choice) => (
              <Box component="li" {...props} key={choice.value} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box component="span" sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: choice.color, flexShrink: 0 }} />
                {choice.label}
              </Box>
            )}
            renderInput={(params) => <TextField {...params} label="납품완료 (복수)" placeholder={statusFilters.length ? '' : '전체 상태'} />}
          />
        </Box>
        <TextField type="date" size="small" label="계약상 납기 시작" value={dateFrom}
          onChange={(event) => changeFilters(() => setDateFrom(event.target.value))}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 165 }} />
        <TextField type="date" size="small" label="계약상 납기 종료" value={dateTo}
          onChange={(event) => changeFilters(() => setDateTo(event.target.value))}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 165 }} />
        <Button size="small" onClick={resetFilters}>필터 초기화</Button>
        <Button size="small" startIcon={<RefreshOutlined />} onClick={() => changeFilters(() => setReload((value) => value + 1))}>새로고침</Button>
        <Chip size="small" variant="outlined" label="고정익/회전익 선택은 UI 시안 · 실제 필터 미적용" />
      </Paper>
      {runtimeConfig.dataSource !== 'api' && <Alert severity="info" sx={{ mb: 2 }}>목데이터 시연 모드입니다. 사업·차수·품목은 가상 예시이며 실제 DB와 무관합니다.</Alert>}
      {filterOptionsError && <Alert severity="warning" sx={{ mb: 2 }}>조달원·납품 부대 선택지 조회 실패: {filterOptionsError}</Alert>}
      {statusFilteredRounds.error && <Alert severity="error" sx={{ mb: 2 }}>납품 차수 조회 실패: {statusFilteredRounds.error}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table aria-label="납품 차수별 지원장비 통합현황" size="small" sx={{ minWidth: 1240 }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 800, bgcolor: 'action.hover', whiteSpace: 'nowrap' } }}>
              <TableCell>사업명</TableCell>
              <TableCell>납품 부대</TableCell>
              <TableCell>납품 차수</TableCell>
              <TableCell>계약상 납기</TableCell>
              <TableCell align="right" title="서로 다른 품목 수">종</TableCell>
              <TableCell align="right" title="계약 품목 수량 합계">점</TableCell>
              <TableCell align="right">PR</TableCell>
              <TableCell align="right">PO</TableCell>
              <TableCell align="right">입고</TableCell>
              <TableCell align="right">납품</TableCell>
              <TableCell align="center" title="모든 품목의 납품일 등록 여부">납품완료</TableCell>
              <TableCell align="right">납품금액 (원)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statusFilteredRounds.loading && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!statusFilteredRounds.loading && statusFilteredRounds.error && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 4 }}>조회 오류가 발생했습니다.</TableCell></TableRow>}
            {!statusFilteredRounds.loading && !statusFilteredRounds.error && statusFilteredRounds.data?.length === 0 && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 4 }}>조회할 납품 차수가 없습니다.</TableCell></TableRow>}
            {!statusFilteredRounds.loading && !statusFilteredRounds.error && statusFilteredRounds.data?.map((round) => (
              <Fragment key={round.subContractId}>
                <TableRow hover selected={expanded.includes(round.subContractId)}
                  aria-expanded={expanded.includes(round.subContractId)}
                  aria-label={`${round.businessName} ${round.subContractName || '납품 차수'} 품목 ${expanded.includes(round.subContractId) ? '접기' : '보기'}`}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRound(round.subContractId); }
                  }}
                  onClick={() => openRound(round.subContractId)}
                  sx={{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } }}>
                  <TableCell>{round.businessName}</TableCell>
                  <TableCell>{round.destination || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{round.subContractName || '-'}</TableCell>
                  <TableCell>{date(round.deliveryDate)}</TableCell>
                  <TableCell align="right">{number(round.itemCount)}</TableCell>
                  <TableCell align="right">{number(round.pointCount)}</TableCell>
                  <TableCell align="right">{number(round.prCount)}</TableCell>
                  <TableCell align="right">{number(round.poCount)}</TableCell>
                  <TableCell align="right">{number(round.receivedCount)}</TableCell>
                  <TableCell align="right">{number(round.deliveredCount)}</TableCell>
                  <TableCell align="center"><DeliveryStatusDot round={round} /></TableCell>
                  <TableCell align="right">{number(round.deliveryAmount)}</TableCell>
                </TableRow>
                {expanded.includes(round.subContractId) && (
                  <TableRow>
                    <TableCell colSpan={12} sx={{ p: 0, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                      <Box sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                        {detail[round.subContractId]?.loading && <CircularProgress size={22} />}
                        {detail[round.subContractId]?.error && <Alert severity="error">{detail[round.subContractId].error}</Alert>}
                        {detail[round.subContractId]?.data && (
                          <TableContainer sx={{ maxHeight: 420, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table stickyHeader size="small" aria-label={`${round.subContractName ?? round.subContractId} 납품 품목`}>
                              <TableHead><TableRow>{['이미지', '품번', '품명', '수량', '조달원', '바이어', '입고 예정', '입고일', '납품일', '계약 가격'].map((name) => <TableCell key={name} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</TableCell>)}</TableRow></TableHead>
                              <TableBody>
                                {detail[round.subContractId].data?.map((item) => <TableRow key={item.matchId}>
                                  <TableCell sx={{ width: 72 }}><EquipmentImageThumbnail item={item}
                                    onExpand={(selected, url) => setPreview({ item: selected, url })} /></TableCell>
                                  <TableCell>{item.itemNumber}</TableCell>
                                  <TableCell>{item.itemName || '-'}</TableCell>
                                  <TableCell>{number(item.quantity)}</TableCell>
                                  <TableCell>{item.vendorName || '-'}</TableCell>
                                  <TableCell>{item.buyerName || '-'}</TableCell>
                                  <TableCell>{date(item.receivingExpected)}</TableCell>
                                  <TableCell>{date(item.receivedAt)}</TableCell>
                                  <TableCell>{date(item.deliveredAt)}</TableCell>
                                  <TableCell align="right">{number(item.contractPrice)}</TableCell>
                                </TableRow>)}
                                {detail[round.subContractId].data?.length === 0 && <TableRow><TableCell colSpan={10} align="center">등록된 품목이 없습니다.</TableCell></TableRow>}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={preview !== null} onClose={() => setPreview(null)} maxWidth="md" fullWidth
        aria-labelledby="equipment-image-title">
        <DialogTitle id="equipment-image-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {preview?.item.itemNumber} — {preview?.item.itemName || '장비 이미지'}
          </Box>
          <IconButton aria-label="이미지 미리보기 닫기" onClick={() => setPreview(null)}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
          {preview && <Box component="img" src={preview.url} alt={preview.item.itemName || preview.item.itemNumber}
            sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />}
        </DialogContent>
      </Dialog>
      <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 12 }}>
        종=품목 종류 수, 점=수량 합계, PR·PO=번호 등록 행 수, 입고·납품=날짜 등록 행 수,
        납품완료 표시: 초록=완료, 노랑=미완료, 빨강=미완료이면서 납기 7일 이내 또는 경과. 납품금액=계약가격×수량 합계.
        조달원 선택 시 해당 조달원 품목 기준으로 집계합니다. 고정익/회전익은 실제 분류에 아직 적용되지 않습니다.
      </Typography>
    </Box>
  );
}
