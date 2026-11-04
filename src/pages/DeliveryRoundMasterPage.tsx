import { Fragment, useCallback, useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Alert, Button, Autocomplete, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { RefreshOutlined } from '@mui/icons-material';
import { PageHeader } from '../components/common/PageHeader';
import { runtimeConfig } from '../config/runtime';
import { fetchBusinessOptions, type DbBusiness } from '../features/equipment-master/model';
import { mockBusinesses, mockRounds, mockRoundItems } from '../data/deliveryRoundMock';

type Round = {
  subContractId: number;
  businessId: number;
  businessName: string;
  destination: string | null;
  subContractName: string | null;
  deliveryDate: string | null;
  itemCount: number;
  lineCount: number;
  receivedCount: number | null;
  deliveredCount: number | null;
  prCount: number | null;
  poCount: number | null;
  deliveryAmount: number | null;
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
  contractPrice?: number | null;
};
type LoadState<T> = { loading: boolean; data?: T; error?: string };
const date = (value: string | null) => value?.slice(0, 10) || '-';
const count = (value: number | null | undefined) => value == null ? '-' : value.toLocaleString('ko-KR');
const currency = (value: number | null | undefined) => value == null ? '-' : value.toLocaleString('ko-KR');

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
      setBusinesses(mockBusinesses);
      return;
    }
    let alive = true;
    fetchBusinessOptions()
      .then((options) => { if (alive) setBusinesses(options); })
      .catch((error: unknown) => { if (alive) setRounds({ loading: false, error: error instanceof Error ? error.message : '사업 목록 조회 실패' }); });
    return () => { alive = false; };
  }, [reload]);

  useEffect(() => {
    if (businesses.length === 0) return;
    const valid = new Set(businesses.map((item) => item.businessId));
    const ids = selectedIds.filter((id) => valid.has(id));
    const chosen = ids.length ? ids : businesses.map((entry) => entry.businessId);
    const params = new URLSearchParams();
    chosen.forEach((id) => params.append('businessIds', String(id)));
    if (runtimeConfig.dataSource !== 'api') {
      setRounds({ loading: false, data: mockRounds.filter((round) => chosen.includes(round.businessId)) });
      return;
    }
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
    if (runtimeConfig.dataSource !== 'api') {
      setDetail((current) => ({ ...current, [roundId]: { loading: false, data: mockRoundItems[roundId] ?? [] } }));
      return;
    }
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
        <Typography color="text.secondary" sx={{ fontSize: 12 }}>부대·납품 차수는 API 모드에서 Sub_Contract를 기준으로 구분합니다.</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshOutlined />} onClick={() => { setRounds({ loading: true }); setExpanded(null); setDetail({}); setReload((v) => v + 1); }}>새로고침</Button>
      </Paper>
      {runtimeConfig.dataSource !== 'api' && <Alert severity="info" sx={{ mb: 2 }}>목데이터 시연 모드입니다. 사업·차수·품목은 가상 예시이며 실제 DB와 무관합니다.</Alert>}
      {rounds.error && <Alert severity="error" sx={{ mb: 2 }}>납품 차수 목록 조회 실패: {rounds.error}</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table aria-label="납품 차수별 지원장비 통합현황" size="small" sx={{ minWidth: 1240 }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 800, bgcolor: 'action.hover', whiteSpace: 'nowrap' } }}>
              <TableCell>사업명</TableCell>
              <TableCell>납품 부대</TableCell>
              <TableCell>납품 차수</TableCell>
              <TableCell>계약상 납기</TableCell>
              <TableCell align="right" title="서로 다른 item_id 수">종</TableCell>
              <TableCell align="right" title="계약 품목 match_id 행 수 (평의 실제 업무 기준 확인 필요)">평</TableCell>
              <TableCell align="right">PR</TableCell>
              <TableCell align="right">PO</TableCell>
              <TableCell align="right" title="입고일이 등록된 계약 품목 행 수 (잠정)">입고</TableCell>
              <TableCell align="right" title="납품 집계 기준 미확정">납품</TableCell>
              <TableCell align="right" title="납품일이 등록된 계약 품목 행 수 (잠정)">납품완료</TableCell>
              <TableCell align="right" title="계약 단가/총액 구분 미확정">납품금액</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rounds.loading && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!rounds.loading && rounds.error && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 4 }}>조회 오류가 발생했습니다.</TableCell></TableRow>}
            {!rounds.loading && !rounds.error && rounds.data?.length === 0 && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 4 }}>조회할 납품 차수가 없습니다.</TableCell></TableRow>}
            {!rounds.loading && !rounds.error && rounds.data?.map((round) => (
              <Fragment key={round.subContractId}>
                <TableRow hover selected={expanded === round.subContractId}
                  aria-expanded={expanded === round.subContractId}
                  aria-label={`${round.businessName} ${round.subContractName || '납품 차수'} 품목 ${expanded === round.subContractId ? '접기' : '보기'}`}
                  tabIndex={0}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openRound(round.subContractId); } }}
                  onClick={() => void openRound(round.subContractId)}
                  sx={{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } }}>
                  <TableCell>{round.businessName}</TableCell>
                  <TableCell>{round.destination || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{round.subContractName || '-'}</TableCell>
                  <TableCell>{date(round.deliveryDate)}</TableCell>
                  <TableCell align="right">{count(round.itemCount)}</TableCell>
                  <TableCell align="right">{count(round.lineCount)}</TableCell>
                  <TableCell align="right">{count(round.prCount)}</TableCell>
                  <TableCell align="right">{count(round.poCount)}</TableCell>
                  <TableCell align="right">{count(round.receivedCount)}</TableCell>
                  <TableCell align="right">-</TableCell>
                  <TableCell align="right">{count(round.deliveredCount)}</TableCell>
                  <TableCell align="right">{currency(round.deliveryAmount)}</TableCell>
                </TableRow>
                {expanded === round.subContractId && (
                  <TableRow>
                    <TableCell colSpan={12} sx={{ p: 0, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                      <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <Typography sx={{ fontWeight: 800, mb: 1.5, fontSize: 13 }}>{round.subContractName || '납품 차수'} · 납품 품목</Typography>
                        {detail[round.subContractId]?.loading && <CircularProgress size={22} />}
                        {detail[round.subContractId]?.error && <Alert severity="error">{detail[round.subContractId].error}</Alert>}
                        {detail[round.subContractId]?.data && (
                          <TableContainer sx={{ maxHeight: 420, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table stickyHeader size="small" aria-label={`${round.subContractName ?? round.subContractId} 납품 품목`}>
                              <TableHead><TableRow>{['품번', '품명', '수량', '조달원', '바이어', '입고 예정', '입고일', '납품일', '계약 가격'].map((name) => <TableCell key={name} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</TableCell>)}</TableRow></TableHead>
                              <TableBody>
                                {detail[round.subContractId].data?.map((item) => <TableRow key={item.matchId}>
                                  <TableCell>{item.itemNumber}</TableCell><TableCell>{item.itemName || '-'}</TableCell><TableCell>{count(item.quantity)}</TableCell><TableCell>{item.vendorName || '-'}</TableCell><TableCell>{item.buyerName || '-'}</TableCell><TableCell>{date(item.receivingExpected)}</TableCell><TableCell>{date(item.receivedAt)}</TableCell><TableCell>{date(item.deliveredAt)}</TableCell><TableCell align="right">{currency(item.contractPrice)}</TableCell>
                                </TableRow>)}
                                {detail[round.subContractId].data?.length === 0 && <TableRow><TableCell colSpan={9} align="center">등록된 품목이 없습니다.</TableCell></TableRow>}
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
      <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 12 }}>집계 기준: 종 = 서로 다른 item_id 수. 평 = match_id 행 수(잠정). 입고 = 입고일 등록 행 수, 납품완료 = 납품일 등록 행 수(모두 잠정). PR·PO·납품·납품금액은 원천 테이블과 업무 산식 미확정으로 - 표시. 고정익/회전익은 분류 UI 시안이며 실제 사업 필터와 연동되지 않습니다.</Typography>
    </Box>
  );
}
