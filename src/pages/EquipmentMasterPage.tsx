/** Equipment-master page coordinator: filters, queries, pagination, and view state. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Pagination, Paper, Select, Tab, Tabs, Tooltip, Typography, type SelectChangeEvent } from '@mui/material';
import { DownloadOutlined, SettingsOutlined, TableRowsOutlined, ViewModuleOutlined } from '@mui/icons-material';
import { PageHeader } from '../components/common/PageHeader';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import { runtimeConfig } from '../config/runtime';
import { initialEquipmentMasterItems, masterUnits } from '../data/equipmentMasterMock';
import type { EquipmentMasterItem, MasterViewMode } from '../types/equipmentMaster';
import { cloneItem, fetchBusinessOptions, fetchMasterFilterOptions, fetchDatabaseMaster, getTotalQuantity, mapDatabaseItem, realDataMode } from '../features/equipment-master/model';
import { DetailPanel, SummaryCard } from '../features/equipment-master/visuals';
import { StableExcelFriendlyTable, StableOptimizedTable, FilterBar } from '../features/equipment-master/tables';
import { EditDialog } from '../features/equipment-master/editor';

export function EquipmentMasterPage() {
  const [items, setItems] = useState(() => initialEquipmentMasterItems.map(cloneItem));
  const [mode, setMode] = useState<MasterViewMode>('excel');
  const [search, setSearch] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [risk, setRisk] = useState('');
  const [supplier, setSupplier] = useState('');
  const [progress, setProgress] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState('50');
  const [draft, setDraft] = useState<EquipmentMasterItem | null>(null);
  const [page, setPage] = useState(1);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [downloading, setDownloading] = useState(false);
  const loadFilterOptions = useCallback(() => fetchMasterFilterOptions(), []);
  const masterFilterOptions = useAsyncQuery({ queryFn: loadFilterOptions, enabled: realDataMode });
  const loadBusinessOptions = useCallback(() => fetchBusinessOptions(), []);
  const businessesQuery = useAsyncQuery({ queryFn: loadBusinessOptions, enabled: realDataMode });
  // The first demo opens only LAH 2차 PBL. Match the business returned by SQL Server,
  // rather than hard-coding a numeric ID that may differ between environments.
  const demoBusiness = (businessesQuery.data ?? []).find(
    (business) => business.businessName.replace(/\s+/g, '').toUpperCase() === 'LAH2차PBL',
  );
  useEffect(() => {
    if (!realDataMode) return;
    const allowedId = demoBusiness?.businessId ?? null;
    setBusinessId((current) => current === allowedId ? current : allowedId);
    setPage(1);
  }, [demoBusiness?.businessId]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Korean IME input should never trigger a request before composition ends.
  useEffect(() => {
    if (isComposing) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [search, isComposing]);
  const loadDatabaseMaster = useCallback(() => fetchDatabaseMaster(page, Number(pageSize), debouncedSearch, businessId, vendorFilter, buyerFilter), [page, pageSize, debouncedSearch, businessId, vendorFilter, buyerFilter]);
  const dbQuery = useAsyncQuery({ queryFn: loadDatabaseMaster, enabled: realDataMode && businessId != null && businessId === demoBusiness?.businessId, keepPreviousData: true });
  const databaseItems = useMemo(() => (dbQuery.data?.items ?? []).map(mapDatabaseItem), [dbQuery.data]);
  const allItems = realDataMode ? databaseItems : items;
  const totalRows = realDataMode ? (dbQuery.data?.totalElements ?? 0) : items.length;
  // Stabilize destination columns between searches. A new destination may add a column,
  // but filtering or an empty result must not remove existing headers and reset widths.
  const [knownUnitNames, setKnownUnitNames] = useState<string[]>([]);
  useEffect(() => {
    if (!realDataMode || !dbQuery.data) return;
    const discovered = databaseItems.flatMap((item) => item.deliveries.map((d) => d.unitName));
    setKnownUnitNames((previous) => {
      const additions = [...new Set(discovered)].filter((name) => !previous.includes(name)).sort();
      return additions.length ? [...previous, ...additions] : previous;
    });
  }, [databaseItems, dbQuery.data]);
  const unitNames = realDataMode ? knownUnitNames : masterUnits;
  // Keep selected item if its integrated ID still exists in the newly loaded result.
  useEffect(() => {
    if (!realDataMode || !dbQuery.data || dbQuery.isLoading || dbQuery.isError) return;
    setSelectedId((previous) => previous && !databaseItems.some((item) => item.id === previous) ? null : previous);
  }, [databaseItems, dbQuery.data, dbQuery.isLoading, dbQuery.isError]);
  // In mock mode, a page change may hide the selected item; clear it consistently.
  useEffect(() => { if (!realDataMode) setSelectedId(null); }, [page, debouncedSearch, pageSize]);

  const filteredItems = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    return allItems.filter((item) => {
      if (realDataMode) return true;
      const searchTargets = [item.itemNameKor, item.itemNumber, item.material, item.supplier, item.buyer, item.progress, item.description];
      const matchesQuery = !query || searchTargets.some((value) => value.toLowerCase().includes(query));
      const matchesRisk = !risk || item.risk === risk;
      const matchesSupplier = !supplier || item.supplier === supplier;
      const matchesProgress = !progress || item.progress === progress;
      return matchesQuery && matchesRisk && matchesSupplier && matchesProgress;
    });
  }, [allItems, progress, risk, debouncedSearch, supplier]);

  const visibleItems = realDataMode ? filteredItems : filteredItems.slice((page - 1) * Number(pageSize), page * Number(pageSize));
  const selectedItem = selectedId ? allItems.find((item) => item.id === selectedId) ?? null : null;
  const riskCount = allItems.filter((item) => item.risk === 'Y' || item.risk === 'R').length;
  const manageCount = allItems.filter((item) => item.progressTone === 'warning' || item.progressTone === 'error').length;
  const totalQuantity = allItems.reduce((sum, item) => sum + getTotalQuantity(item), 0);

  const downloadExcel = async () => {
    if (!realDataMode || downloading) return;
    setDownloading(true);
    try {
      const params = new URLSearchParams({ query: debouncedSearch });
      if (businessId != null) params.set('businessId', String(businessId));
      if (vendorFilter) params.set('vendor', vendorFilter);
      if (buyerFilter) params.set('buyer', buyerFilter);
      const response = await fetch(`${runtimeConfig.apiBaseUrl}/equipment-master/export?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.blob();
      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = 'GSEM_equipment_master.csv';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(objectUrl);
    } catch (error) { window.alert(`엑셀 다운로드 실패: ${error instanceof Error ? error.message : '서버 오류'}`); }
    finally { setDownloading(false); }
  };
  const resetFilters = () => { setIsComposing(false); setDebouncedSearch(''); setSearch(''); setRisk(''); setSupplier(''); setProgress(''); setBusinessId(demoBusiness?.businessId ?? null); setVendorFilter(''); setBuyerFilter(''); setPage(1); };
  const openEditDialog = useCallback((item: EquipmentMasterItem) => { if (realDataMode) return; setSelectedId(item.id); setDraft(cloneItem(item)); }, []);
  const saveEditDialog = () => {
    if (!draft) return;
    setItems((current) => current.map((item) => item.id === draft.id ? cloneItem(draft) : item));
    setSelectedId(draft.id);
    setDraft(null);
  };

  return (
    <Box sx={{ display: 'flex', minWidth: 0, bgcolor: 'background.paper' }}>
      <Box sx={{ flex: 1, minWidth: 0, p: { xs: 1.5, md: 3 }, bgcolor: 'background.default' }}>
        <PageHeader title="지원장비 통합현황" description={realDataMode ? "SQL Server 실데이터 · 읽기 전용 (미등록 항목은 대시로 표시)" : "엑셀 마스터 파일의 업무 구조를 기준으로 지원장비 조달·계약·납품 현황을 Mock 데이터로 확인합니다."} />

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 1.5, mb: 2 }}>
          <SummaryCard label="전체 품목" value={`${totalRows}건`} helper={realDataMode ? "SQL Server 전체 등록 건수 (사업별)" : "Mock 마스터 기준"} />
          <SummaryCard label="확인 필요" value={`${riskCount}건`} helper={realDataMode ? "RISK 데이터 미연동" : "RISK Y/R 품목"} tone="#F04438" />
          <SummaryCard label="진행 관리" value={`${manageCount}건`} helper={realDataMode ? "진행 상태 미연동" : "조립·수급·납품 준비"} tone="#F97316" />
          <SummaryCard label="총 납품 수량" value={`${totalQuantity}개`} helper={realDataMode ? "현재 페이지의 중복 matchId 제외 합계" : "부대별 수량 합산"} tone="#079455" />
        </Box>

        {realDataMode && <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}><Typography sx={{ fontSize: 12, fontWeight: 700 }}>현재 페이지 데이터 점검: {databaseItems.filter((item) => item.validationIssues?.length).length}개 품목에 확인 사항 · 계약정보 미등록 {databaseItems.filter((item) => !item.contractLines?.length).length}개 · 이 결과는 전체 등록건 전수검증이 아닙니다.</Typography></Paper>}
        {realDataMode && <Paper variant="outlined" sx={{ mb: 1.5, p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 245 }}><InputLabel id="master-business-filter-label">사업</InputLabel>
            <Select labelId="master-business-filter-label" label="사업" value={businessId == null ? '' : String(businessId)}
              onChange={(event) => { setBusinessId(event.target.value ? Number(event.target.value) : null); setPage(1); }}>
              {demoBusiness && <MenuItem value={String(demoBusiness.businessId)}>{demoBusiness.businessName}</MenuItem>}
              {(businessesQuery.data ?? []).filter((business) => business.businessId !== demoBusiness?.businessId)
                .map((business) => <MenuItem key={business.businessId} value={String(business.businessId)} disabled>
                  {business.businessName} (추후 오픈 예정)
                </MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}><InputLabel id="gsem-vendor-label">조달원</InputLabel><Select labelId="gsem-vendor-label" label="조달원" value={vendorFilter} onChange={(event) => { setVendorFilter(event.target.value); setPage(1); }}><MenuItem value="">전체 조달원</MenuItem>{(masterFilterOptions.data?.vendors ?? []).map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}</Select></FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}><InputLabel id="gsem-buyer-label">바이어</InputLabel><Select labelId="gsem-buyer-label" label="바이어" value={buyerFilter} onChange={(event) => { setBuyerFilter(event.target.value); setPage(1); }}><MenuItem value="">전체 바이어</MenuItem>{(masterFilterOptions.data?.buyers ?? []).map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}</Select></FormControl>
          {masterFilterOptions.isError && <Button size="small" onClick={masterFilterOptions.refetch}>조달원·바이어 다시 조회</Button>}
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>1차 데모는 LAH 2차 PBL 사업만 조회할 수 있습니다. 나머지 사업은 추후 오픈 예정입니다.</Typography>
          {businessesQuery.isError && <Button size="small" onClick={businessesQuery.refetch}>사업 목록 다시 조회</Button>}
          {!businessesQuery.isLoading && !businessesQuery.isError && !demoBusiness && <Typography color="error" sx={{ fontSize: 12 }}>LAH 2차 PBL 사업을 찾지 못했습니다. 조회를 중단했습니다. DB의 사업명을 확인하세요.</Typography>}
        </Paper>}
        <FilterBar search={search} setSearch={setSearch} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} risk={risk} setRisk={setRisk} supplier={supplier} setSupplier={setSupplier} progress={progress} setProgress={setProgress} reset={resetFilters} items={allItems} apiMode={realDataMode} />

        <Paper variant="outlined" sx={{ mb: 1.5, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', gap: 2 }}>
            <Tabs value={mode} onChange={(_, nextMode: MasterViewMode) => setMode(nextMode)} sx={{ minHeight: 38, '& .MuiTab-root': { minHeight: 38 } }}>
              <Tab icon={<TableRowsOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="엑셀 친화형" value="excel" />
              <Tab icon={<ViewModuleOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="업무 최적화형" value="optimized" />
            </Tabs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>전체 <Box component="span" sx={{ color: 'primary.main' }}>{realDataMode ? totalRows : filteredItems.length}건</Box></Typography>
              <FormControl size="small" sx={{ minWidth: 118 }}><InputLabel>페이지당</InputLabel><Select value={pageSize} label="페이지당" onChange={(event: SelectChangeEvent) => { setPageSize(event.target.value); setPage(1); }}>{['20', '50', '100'].map((value) => <MenuItem key={value} value={value}>{value}개</MenuItem>)}</Select></FormControl>
              <Tooltip title="엑셀 친화형 표의 헤더 오른쪽 경계를 드래그하거나 두 번 클릭하면 너비를 조절할 수 있습니다. 너비는 이 브라우저에 저장됩니다."><span><Button variant="outlined" disabled startIcon={<SettingsOutlined />}>컬럼 너비 조절 안내</Button></span></Tooltip>
              <Tooltip title={realDataMode ? '현재 검색·필터에 해당하는 전체 데이터 다운로드 (Excel 호환 CSV)' : 'Mock 모드에서는 다운로드 미지원'}><span><Button variant="outlined" disabled={!realDataMode || downloading} onClick={downloadExcel} startIcon={<DownloadOutlined />}>{downloading ? '다운로드 중...' : '엑셀 다운로드 (CSV)'}</Button></span></Tooltip>
            </Box>
          </Box>
          <Box sx={{ px: 1.5, py: 1, bgcolor: '#FBFCFE', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
              {realDataMode ? 'SQL Server 읽기 전용 · 같은 품번도 사업이 다르면 별도 행입니다. 부대별 수량은 개별 계약 합계이며 날짜가 여러 개면 다건(상세)로 표시합니다. 전체 데이터 정합성은 별도 SQL 검증이 필요합니다.' : mode === 'excel' ? '엑셀 사용자 적응을 위해 부대별 반복 컬럼과 장비형상/정비 컬럼을 최대한 유지한 화면입니다. 행 더블클릭 또는 상세 패널의 수정 버튼으로 편집합니다.' : '같은 데이터를 업무 판단 중심으로 압축하고, 행 선택 시 상세 패널에서 부대별 현황을 확인하는 화면입니다.'}
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {realDataMode && dbQuery.isLoading && <Typography role="status" aria-live="polite" sx={{ px: 1, py: 0.5, fontSize: 12, color: 'text.secondary' }}>검색 결과 갱신 중... 기존 결과를 표시합니다.</Typography>}
            {realDataMode && dbQuery.isError && <Box role="alert" sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5 }}><Typography color="error" sx={{ fontSize: 12 }}>조회 실패. 이전 결과를 유지합니다.</Typography><Button size="small" onClick={dbQuery.refetch}>재시도</Button></Box>}
            {mode === 'excel'
              ? <StableExcelFriendlyTable items={visibleItems} unitNames={unitNames} selectedId={selectedId} onSelect={setSelectedId} onEdit={openEditDialog} />
              : <StableOptimizedTable items={visibleItems} selectedId={selectedId} onSelect={setSelectedId} onEdit={openEditDialog} />}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{totalRows === 0 ? 0 : (page - 1) * Number(pageSize) + 1} - {(page - 1) * Number(pageSize) + visibleItems.length} / {realDataMode ? totalRows : filteredItems.length}건</Typography>
              <Pagination page={page} onChange={(_, next) => setPage(next)} count={Math.max(1, realDataMode ? (dbQuery.data?.totalPages ?? 1) : Math.ceil(filteredItems.length / Number(pageSize)))} color="primary" shape="rounded" />
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{realDataMode ? 'SQL Server 조회 · 읽기 전용' : 'Mock 데이터 · 새로고침 시 편집값 초기화'}</Typography>
            </Box>
          </Box>
          {selectedItem && <Box sx={{ ml: 2 }}><DetailPanel item={selectedItem} onClose={() => setSelectedId(null)} onEdit={openEditDialog} /></Box>}
        </Box>
      </Box>
      <EditDialog draft={realDataMode ? null : draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={saveEditDialog} />
    </Box>
  );
}