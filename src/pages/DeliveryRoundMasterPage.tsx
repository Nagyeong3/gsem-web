import { Fragment, useCallback, useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Collapse, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Alert, Button, Autocomplete, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, RefreshOutlined } from '@mui/icons-material';
import { PageHeader } from '../components/common/PageHeader';
import { runtimeConfig } from '../config/runtime';
import { fetchBusinessOptions, type DbBusiness } from '../features/equipment-master/model';

type Round = {
  subContractId: number;
  businessId: number;
  businessName: string;
  destination: string | null;
  subContractName: string | null;
  deliveryDate: string | null;
  itemCount: number;
  lineCount: number;
};
type RoundItem = {
  matchId: number;
  itemId: number;
  itemNumber: string;
  itemName: string | null;
  quantity: number | null;
  receivingExpected: string | null;
  receivedAt: string | null;
  deliveredAt: string | null;
  vendorName: string | null;
  buyerName: string | null;
};
type LoadState<T> = { loading: boolean; data?: T; error?: string };
const date = (value: string | null) => value?.slice(0, 10) || '-';

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json() as T;
}

export function DeliveryRoundMasterPage() {
  const [businesses, setBusinesses] = useState<DbBusiness[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('gsem.deliveryRound.businessIds.v1') || '[]') as unknown;
      return Array.isArray(raw) ? raw.filter((id): id is number => Number.isSafeInteger(id) && id > 0) : [];
    } catch { return []; }
  });
  const [aircraftCategory, setAircraftCategory] = useState<'all' | 'fixed' | 'rotary'>(() => {
    const saved = localStorage.getItem('gsem.deliveryRound.aircraftCategory.v1');
    return saved === 'fixed' || saved === 'rotary' ? saved : 'all';
  });
  const [rounds, setRounds] = useState<LoadState<Round[]>>({ loading: true });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<number, LoadState<RoundItem[]>>>({});
  const [reload, setReload] = useState(0);

  useEffect(() => { localStorage.setItem('gsem.deliveryRound.businessIds.v1', JSON.stringify(selectedIds)); }, [selectedIds]);
  useEffect(() => { localStorage.setItem('gsem.deliveryRound.aircraftCategory.v1', aircraftCategory); }, [aircraftCategory]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api') {
      setRounds({ loading: false, data: [] });
      return;
    }
    let alive = true;
    fetchBusinessOptions()
      .then((options) => { if (alive) setBusinesses(options); })
      .catch((error: unknown) => { if (alive) setRounds({ loading: false, error: error instanceof Error ? error.message : '사업 목록 조회 실패' }); });
    return () => { alive = false; };
  }, [reload]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api' || businesses.length === 0) return;
    const valid = new Set(businesses.map((item) => item.businessId));
    const ids = selectedIds.filter((id) => valid.has(id));
    const chosen = ids.length ? ids : businesses.map((entry) => entry.businessId);
    const params = new URLSearchParams();
    chosen.forEach((id) => params.append('businessIds', String(id)));
    let alive = true;
    readJson<{ items: Round[] }>(`/delivery-rounds?${params.toString()}`)
      .then((response) => { if (alive) setRounds({ loading: false, data: response.items }); })
      .catch((error: unknown) => { if (alive) setRounds({ loading: false, error: error instanceof Error ? error.message : '차수 조회 실패' }); });
    return () => { alive = false; };
  }, [businesses, selectedIds, reload]);

  const changeBusinessSelection = (ids: number[]) => {
    setSelectedIds(ids);
    setRounds({ loading: true });
    setExpanded(null);
    setDetail({});
  };

  const openRound = useCallback(async (roundId: number) => {
    if (expanded === roundId) { setExpanded(null); return; }
    setExpanded(roundId);
    const round = rounds.data?.find((value) => value.subContractId === roundId);
    if (!round || detail[roundId]?.data || detail[roundId]?.loading) return;
    setDetail((current) => ({ ...current, [roundId]: { loading: true } }));
    try {
      const response = await readJson<{ items: RoundItem[] }>(`/delivery-rounds/${roundId}/items?businessId=${round.businessId}`);
      setDetail((current) => ({ ...current, [roundId]: { loading: false, data: response.items } }));
    } catch (error) {
      setDetail((current) => ({ ...current, [roundId]: { loading: false, error: error instanceof Error ? error.message : '품목 조회 실패' } }));
    }
  }, [rounds.data, detail, expanded]);

  return (
    <Box sx={{ minWidth: 0, p: { xs: 1.5, md: 3 }, bgcolor: 'background.default' }}>
      <PageHeader title="지원장비 통합현황" description="사업·납품 부대·차수별 현황을 조회하고, 행을 펼쳐 해당 납품 품목을 확인합니다. (읽기 전용)" />
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ width: { xs: '100%', sm: 300 }, minWidth: 200 }}>
          <Autocomplete multiple size="small" options={businesses}
            value={businesses.filter((entry) => selectedIds.includes(entry.businessId))}
            getOptionLabel={(entry) => entry.businessName}
            isOptionEqualToValue={(a, b) => a.businessId === b.businessId}
            onChange={(_, values) => changeBusinessSelection(values.map((entry) => entry.businessId))}
            renderInput={(params) => <TextField {...params} label="사업 선택 (복수)" placeholder={selectedIds.length ? '' : '전체 사업'} />}
            limitTags={2}
          />
        </Box>
        <ToggleButtonGroup size="small" exclusive value={aircraftCategory}
          onChange={(_, value: 'all' | 'fixed' | 'rotary' | null) => { if (value) setAircraftCategory(value); }}
          aria-label="항공기 유형 (UI 시안)">
          <ToggleButton value="all">전체</ToggleButton>
          <ToggleButton value="fixed">고정익</ToggleButton>
          <ToggleButton value="rotary">회전익</ToggleButton>
        </ToggleButtonGroup>
        <Chip size="small" variant="outlined" label="기종 분류 UI 시안 · 실제 필터 미적용" />
        <Typography color="text.secondary" sx={{ fontSize: 12 }}>부대·납품 차수는 실제 Sub_Contract 정보를 기준으로 구분합니다.</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshOutlined />} onClick={() => { setRounds({ loading: true }); setExpanded(null); setDetail({}); setReload((v) => v + 1); }}>새로고침</Button>
      </Paper>
      {runtimeConfig.dataSource !== 'api' && <Alert severity="info" sx={{ mb: 2 }}>납품 차수별 실데이터 화면입니다. API 모드에서 SQL Server에 연결하면 표시됩니다.</Alert>}
      {rounds.error && <Alert severity="error" sx={{ mb: 2 }}>납품 차수 목록 조회 실패: {rounds.error}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table aria-label="납품 차수별 지원장비 통합현황" size="small" sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 800, bgcolor: 'action.hover', whiteSpace: 'nowrap' } }}>
              <TableCell width={48} />
              <TableCell>사업명</TableCell>
              <TableCell>납품 부대</TableCell>
              <TableCell>납품 차수</TableCell>
              <TableCell>계약상 납기</TableCell>
              <TableCell align="right">품목 종류</TableCell>
              <TableCell align="right">계약 품목 행</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rounds.loading && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!rounds.loading && !rounds.error && rounds.data?.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>조회할 납품 차수가 없습니다.</TableCell></TableRow>}
            {rounds.data?.map((round) => (
              <Fragment key={round.subContractId}>
                <TableRow hover onClick={() => void openRound(round.subContractId)} sx={{ cursor: 'pointer', '& td': { borderBottom: expanded === round.subContractId ? 0 : undefined } }}>
                  <TableCell><IconButton size="small" aria-label={`${round.subContractName ?? '납품 차수'} ${expanded === round.subContractId ? '접기' : '펼치기'}`}>{expanded === round.subContractId ? <KeyboardArrowUp /> : <KeyboardArrowDown />}</IconButton></TableCell>
                  <TableCell>{round.businessName}</TableCell>
                  <TableCell>{round.destination || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{round.subContractName || '-'}</TableCell>
                  <TableCell>{date(round.deliveryDate)}</TableCell>
                  <TableCell align="right">{round.itemCount.toLocaleString('ko-KR')}</TableCell>
                  <TableCell align="right">{round.lineCount.toLocaleString('ko-KR')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0 }}>
                    <Collapse in={expanded === round.subContractId} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <Typography sx={{ fontWeight: 800, mb: 1.5, fontSize: 13 }}>{round.subContractName || '납품 차수'} · 납품 품목</Typography>
                        {detail[round.subContractId]?.loading && <CircularProgress size={22} />}
                        {detail[round.subContractId]?.error && <Alert severity="error">{detail[round.subContractId].error}</Alert>}
                        {detail[round.subContractId]?.data && (
                          <TableContainer sx={{ maxHeight: 420, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table stickyHeader size="small" aria-label={`${round.subContractName ?? round.subContractId} 납품 품목`}>
                              <TableHead><TableRow>{['품번', '품명', '수량', '조달원', '바이어', '입고 예정', '입고일', '납품일'].map((name) => <TableCell key={name} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</TableCell>)}</TableRow></TableHead>
                              <TableBody>
                                {detail[round.subContractId].data?.map((item) => <TableRow key={item.matchId}>
                                  <TableCell>{item.itemNumber}</TableCell><TableCell>{item.itemName || '-'}</TableCell><TableCell>{item.quantity ?? '-'}</TableCell><TableCell>{item.vendorName || '-'}</TableCell><TableCell>{item.buyerName || '-'}</TableCell><TableCell>{date(item.receivingExpected)}</TableCell><TableCell>{date(item.receivedAt)}</TableCell><TableCell>{date(item.deliveredAt)}</TableCell>
                                </TableRow>)}
                                {detail[round.subContractId].data?.length === 0 && <TableRow><TableCell colSpan={8} align="center">등록된 품목이 없습니다.</TableCell></TableRow>}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 12 }}>품목 종류는 서로 다른 item_id 수, 계약 품목 행은 match_id 건수입니다. 사업을 선택하지 않으면 전체 사업이 조회됩니다. 고정익/회전익은 DB 기종 분류 연동 전 UI만 제공합니다. PR·PO·완료 여부와 금액은 집계 규칙 확인 후 추가합니다.</Typography>
    </Box>
  );
}
