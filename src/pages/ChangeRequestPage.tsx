import { ArrowForward, AssignmentOutlined, Search } from '@mui/icons-material';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { QueryStatePanel } from '../components/common/QueryStatePanel';
import { SectionCard } from '../components/common/SectionCard';
import { changeRequestService } from '../services';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import type { ChangeRequest, ChangeRequestFilters, ChangeRequestStatus } from '../types/domain';
import { useMockRole } from '../auth/mockRoleContext';

const statusTone: Record<ChangeRequestStatus, 'default' | 'warning' | 'success'> = {
  접수: 'default', '검토 중': 'warning', '처리 완료': 'success',
};

function RequestStatus({ status }: { status: ChangeRequestStatus }) {
  return <Chip label={status} size="small" color={statusTone[status]} variant="outlined" />;
}

function FilterSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const labelId = `request-${id}-label`;
  return <FormControl size="small" fullWidth><InputLabel id={labelId}>{label}</InputLabel><Select id={`request-${id}`} labelId={labelId} label={label} value={value} onChange={(event) => onChange(event.target.value)}><MenuItem value="">전체</MenuItem>{options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select></FormControl>;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: '94px 1fr', gap: 1.5, py: 0.65 }}><Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography><Typography component="div" sx={{ fontSize: 12.5, fontWeight: 500 }}>{children}</Typography></Box>;
}

export function ChangeRequestPage() {
  const theme = useTheme();
  const { role, permissions } = useMockRole();
  const [searchParams] = useSearchParams();
  const [requestedSelectedId, setRequestedSelectedId] = useState<string>();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftReason, setDraftReason] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [filters, setFilters] = useState<ChangeRequestFilters>({ query: '', changeType: '', status: searchParams.get('status') ?? '', requester: '' });

  const itemIdParam = searchParams.get('itemId') ?? '';
  const loadAllRequests = useCallback(
    () => changeRequestService.list({ query: '', changeType: '', status: '', requester: '' }),
    [],
  );
  const allRequestsQuery = useAsyncQuery<ChangeRequest[]>({ queryFn: loadAllRequests });
  const loadRequests = useCallback(async () => {
    const items = await changeRequestService.list(filters);
    const itemId = Number(itemIdParam);
    return Number.isInteger(itemId) && itemId > 0
      ? items.filter((item) => item.itemId === itemId)
      : items;
  }, [filters, itemIdParam]);
  const requestsQuery = useAsyncQuery<ChangeRequest[]>({
    queryFn: loadRequests,
    keepPreviousData: true,
  });
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const allRequests = useMemo(() => allRequestsQuery.data ?? [], [allRequestsQuery.data]);
  const selectedId = requestedSelectedId !== undefined && requests.some((item) => item.changeId === requestedSelectedId)
    ? requestedSelectedId
    : requests[0]?.changeId;

  const options = useMemo(() => ({
    types: [...new Set(allRequests.map((item) => item.changeType))].sort(),
    requesters: [...new Set(allRequests.map((item) => item.requestedBy.name))].sort(),
  }), [allRequests]);
  const selected = requests.find((item) => item.changeId === selectedId);

  return <Box sx={{ p: 3, minWidth: 1080, bgcolor: 'background.default' }}>
    <PageHeader
      title="변경 신청 및 처리 현황"
      description="장비 정보 변경 신청의 내용과 처리 과정을 조회합니다."
      action={
        <Button
          variant="contained"
          disabled={!permissions.canCreateChangeDraft}
          onClick={() => setDraftOpen(true)}
        >
          변경 신청 초안
        </Button>
      }
    />
    <Alert severity="info" variant="outlined" sx={{ mb: 1.5, py: 0 }}>
      Mock 권한: {role} · {permissions.description}
      {permissions.canReviewChange ? ' 실제 승인·반려 처리는 제공하지 않습니다.' : ''}
    </Alert>
    {draftSaved && <Alert severity="success" sx={{ mb: 1.5 }}>작성한 초안은 현재 브라우저 메모리에만 보관되며 새로고침하면 사라집니다.</Alert>}
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}><Box sx={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(3, minmax(150px, 1fr))', gap: 1 }}>
      <TextField value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="신청번호, 품번, 품명, 변경 유형 검색" slotProps={{ htmlInput: { 'aria-label': '변경 신청 검색' }, input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 19, color: 'text.secondary' }} /></InputAdornment> } }} />
      <FilterSelect id="type" label="변경 유형" value={filters.changeType} options={options.types} onChange={(value) => setFilters((current) => ({ ...current, changeType: value }))} />
      <FilterSelect id="status" label="처리 상태" value={filters.status} options={['접수', '검토 중', '처리 완료']} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
      <FilterSelect id="requester" label="신청자" value={filters.requester} options={options.requesters} onChange={(value) => setFilters((current) => ({ ...current, requester: value }))} />
    </Box></Paper>

    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 390px', gap: 1.5 }}>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}><TableContainer><Table size="small" aria-label="변경 신청 목록"><TableHead><TableRow><TableCell>신청번호</TableCell><TableCell>대상 품번</TableCell><TableCell>품명</TableCell><TableCell>변경 유형</TableCell><TableCell>신청자</TableCell><TableCell>신청일</TableCell><TableCell>처리 상태</TableCell><TableCell>처리자</TableCell><TableCell>최근 처리일</TableCell></TableRow></TableHead><TableBody>
        {requestsQuery.isLoading ? <TableRow><TableCell colSpan={9} sx={{ p: 0 }}><QueryStatePanel state="loading" loadingMessage="변경 신청을 불러오고 있습니다." minHeight={330} compact /></TableCell></TableRow> : requestsQuery.isError ? <TableRow><TableCell colSpan={9} sx={{ p: 0 }}><QueryStatePanel state="error" errorMessage="변경 신청을 불러오지 못했습니다." onRetry={requestsQuery.refetch} minHeight={330} /></TableCell></TableRow> : requests.length === 0 ? <TableRow><TableCell colSpan={9} sx={{ p: 0 }}><QueryStatePanel state="empty" emptyMessage="조회된 변경 신청이 없습니다." emptyDescription="검색 조건을 변경해보세요." minHeight={330} /></TableCell></TableRow> : requests.map((item) => <TableRow key={item.changeId} hover selected={item.changeId === selectedId} onClick={() => setRequestedSelectedId(item.changeId)} sx={{ cursor: 'pointer' }}><TableCell sx={{ fontWeight: 600 }}>{item.changeId}</TableCell><TableCell>{item.itemNum}</TableCell><TableCell>{item.itemName}</TableCell><TableCell>{item.changeType}</TableCell><TableCell>{item.requestedBy.name}</TableCell><TableCell>{item.requestedAt.split(' ')[0]}</TableCell><TableCell><RequestStatus status={item.status} /></TableCell><TableCell>{item.processedBy?.name ?? '-'}</TableCell><TableCell>{item.processedAt?.split(' ')[0] ?? '-'}</TableCell></TableRow>)}
      </TableBody></Table></TableContainer></Paper>

      <SectionCard title="선택 신청 상세"><Box sx={{ p: 2 }}>
        {!selected ? <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>신청을 선택해주세요.</Typography> : <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}><Box><Typography sx={{ fontSize: 17, fontWeight: 700 }}>{selected.changeId}</Typography><Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 12 }}>{selected.itemName} · {selected.itemNum}</Typography></Box><RequestStatus status={selected.status} /></Box>
          <Box sx={{ mt: 1.5, py: 1.2, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}><DetailRow label="변경 유형">{selected.changeType}</DetailRow><DetailRow label="신청자">{selected.requestedBy.name}</DetailRow><DetailRow label="신청일">{selected.requestedAt}</DetailRow><DetailRow label="처리자">{selected.processedBy?.name ?? '-'}</DetailRow><DetailRow label="최근 처리일">{selected.processedAt ?? '-'}</DetailRow></Box>
          <Typography sx={{ mt: 1.5, mb: 0.75, fontSize: 13, fontWeight: 700 }}>변경 전·후 비교</Typography>
          {selected.differences.map((difference) => <Paper key={difference.field} variant="outlined" sx={{ overflow: 'hidden', mb: 0.75 }}><Typography sx={{ px: 1.25, py: 0.65, bgcolor: 'action.hover', fontSize: 11, fontWeight: 700 }}>{difference.label}</Typography><Box sx={{ p: 1.1, display: 'grid', gridTemplateColumns: '1fr 22px 1fr', alignItems: 'center', gap: 0.5 }}><Typography sx={{ fontSize: 12 }}>{difference.before ?? '-'}</Typography><ArrowForward sx={{ fontSize: 16, color: 'text.secondary' }} /><Typography sx={{ color: 'primary.main', fontSize: 12, fontWeight: 700 }}>{difference.after ?? '-'}</Typography></Box></Paper>)}
          <DetailRow label="변경 사유">{selected.reason ?? '-'}</DetailRow><DetailRow label="변경 근거">{selected.basis ?? '-'}</DetailRow>
          <Typography sx={{ mt: 1.5, mb: 0.75, fontSize: 13, fontWeight: 700 }}>처리 과정</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.6 }}>{['신청', '검토', '처리 완료'].map((step, index) => { const active = index === 0 || selected.status === '처리 완료' || (selected.status === '검토 중' && index <= 1); return <Box key={step} sx={{ p: 0.8, textAlign: 'center', borderRadius: 1, bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'action.hover', color: active ? 'primary.main' : 'text.secondary' }}><Typography sx={{ fontSize: 11, fontWeight: 700 }}>{step}</Typography></Box>; })}</Box>
          <Box sx={{ mt: 1.5, p: 1.1, display: 'flex', gap: 1, bgcolor: 'action.hover', borderRadius: 1 }}><AssignmentOutlined sx={{ fontSize: 18, color: 'text.secondary' }} /><Typography sx={{ color: 'text.secondary', fontSize: 11.5 }}>상태값과 처리 순서는 프로토타입 가정입니다. 실제 승인 처리는 제공하지 않습니다.</Typography></Box>
        </>}
      </Box></SectionCard>
    </Box>
    <Dialog open={draftOpen} onClose={() => setDraftOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>변경 신청 초안</DialogTitle>
      <DialogContent>
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          프로토타입 가정: 실제 저장·승인 요청은 수행하지 않습니다.
        </Alert>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={4}
          label="변경 사유"
          value={draftReason}
          onChange={(event) => setDraftReason(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDraftOpen(false)}>취소</Button>
        <Button
          variant="contained"
          disabled={!draftReason.trim()}
          onClick={() => {
            setDraftSaved(true);
            setDraftOpen(false);
          }}
        >
          메모리에 보관
        </Button>
      </DialogActions>
    </Dialog>
    <Snackbar
      open={draftSaved}
      autoHideDuration={2200}
      onClose={() => setDraftSaved(false)}
      message="변경 신청 초안을 브라우저 메모리에 보관했습니다."
    />
  </Box>;
}
