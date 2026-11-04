import { Fragment, useCallback, useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Collapse, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Alert, Button } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, RefreshOutlined } from '@mui/icons-material';
import { PageHeader } from '../components/common/PageHeader';
import { runtimeConfig } from '../config/runtime';
import { fetchBusinessOptions, type DbBusiness } from '../features/equipment-master/model';

type Round = {
  subContractId: number;
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
  const [business, setBusiness] = useState<DbBusiness | null>(null);
  const [rounds, setRounds] = useState<LoadState<Round[]>>({ loading: true });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<number, LoadState<RoundItem[]>>>({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api') {
      setRounds({ loading: false, data: [] });
      return;
    }
    let alive = true;
    fetchBusinessOptions()
      .then((businesses) => {
        if (!alive) return;
        const selected = businesses.find((entry) => entry.businessName.replace(/\s+/g, '').toUpperCase() === 'LAH2차PBL');
        if (!selected) {
          setRounds({ loading: false, error: 'LAH 2차 PBL 사업을 찾지 못했습니다.' });
          return;
        }
        setBusiness(selected);
        return readJson<{ items: Round[] }>(`/delivery-rounds?businessId=${selected.businessId}`)
          .then((result) => { if (alive) setRounds({ loading: false, data: result.items }); });
      })
      .catch((error: unknown) => { if (alive) setRounds({ loading: false, error: error instanceof Error ? error.message : '조회 실패' }); });
    return () => { alive = false; };
  }, [reload]);

  const openRound = useCallback(async (roundId: number) => {
    if (expanded === roundId) { setExpanded(null); return; }
    setExpanded(roundId);
    if (!business || detail[roundId]?.data || detail[roundId]?.loading) return;
    setDetail((current) => ({ ...current, [roundId]: { loading: true } }));
    try {
      const response = await readJson<{ items: RoundItem[] }>(`/delivery-rounds/${roundId}/items?businessId=${business.businessId}`);
      setDetail((current) => ({ ...current, [roundId]: { loading: false, data: response.items } }));
    } catch (error) {
      setDetail((current) => ({ ...current, [roundId]: { loading: false, error: error instanceof Error ? error.message : '품목 조회 실패' } }));
    }
  }, [business, detail, expanded]);

  return (
    <Box sx={{ minWidth: 0, p: { xs: 1.5, md: 3 }, bgcolor: 'background.default' }}>
      <PageHeader title="지원장비 통합현황" description="사업·납품 부대·차수별 현황을 조회하고, 행을 펼쳐 해당 납품 품목을 확인합니다. (읽기 전용)" />
      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Chip label={business?.businessName ?? 'LAH 2차 PBL'} variant="outlined" color="primary" />
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
      <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 12 }}>품목 종류는 서로 다른 item_id 수, 계약 품목 행은 match_id 건수입니다. PR·PO·완료 여부와 금액 집계는 업무 규칙 확인 후 추가합니다.</Typography>
    </Box>
  );
}
