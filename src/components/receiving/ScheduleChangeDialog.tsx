import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, Paper, Radio, RadioGroup, FormControlLabel, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { isCalendarDate } from '../../features/delivery-calendar/calendarPreview';
import { addCalendarMonths } from '../../features/delivery-calendar/warrantyDates';

export type ScheduleChangeItem = { matchId: number; itemNumber: string; itemName: string | null; quantity: number | null; previousDate: string | null };
export type ScheduleChangeDetails = { title: string; roundName: string; items: ScheduleChangeItem[]; fieldLabel?: string; kind?: 'receiving' | 'delivery' };
type Props = { open: boolean; details: ScheduleChangeDetails | null; onClose: () => void; onPreview: (result: { itemIds: number[]; nextDate: string; reason: string; attachments: string[]; warrantyEnd?: string; warrantyBasis?: '12' | '24' | 'custom' }) => void };

/** UI-only evidence collector. No uploads and no database writes are performed. */
export function ScheduleChangeDialog({ open, details, onClose, onPreview }: Props) {
  const [date, setDate] = useState('');
  const [warrantyMode, setWarrantyMode] = useState<'12' | '24' | 'custom'>('12');
  const [customWarrantyEnd, setCustomWarrantyEnd] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (open) { setDate(''); setWarrantyMode('12'); setCustomWarrantyEnd(''); setReason(''); setFiles([]); setSearch(''); setConfirm(false); setShowAll(false); setTab(0); } }, [open, details]);
  const currentDates = useMemo(() => [...new Set(details?.items.map(item => item.previousDate?.slice(0, 10) || '미등록') ?? [])], [details]);
  const isDelivery = details?.kind === 'delivery';
  const warrantyEnd = warrantyMode === 'custom' ? customWarrantyEnd : addCalendarMonths(date, Number(warrantyMode));
  const validWarranty = !isDelivery || (isCalendarDate(warrantyEnd) && warrantyEnd >= date);
  const valid = !!details?.items.length && isCalendarDate(date) && validWarranty && reason.trim().length > 0 && files.length > 0;
  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles(current => [...new Set([...current, ...Array.from(event.target.files ?? []).map(file => file.name)])]);
    event.target.value = '';
  };
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="gsem-schedule-dialog-title">
    <DialogTitle id="gsem-schedule-dialog-title">{details?.title ?? '입고 예정일 변경'}</DialogTitle>
    <DialogContent dividers>
      <Alert severity="warning" sx={{ mb: 2 }}>화면 미리보기 전용입니다. 변경 요청, 문서 및 날짜는 서버나 DB에 저장되지 않습니다.</Alert>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover' }}>
        <Typography sx={{ fontWeight: 700 }}>{details?.roundName}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.75, alignItems: 'center' }}><Chip size="small" label={isDelivery ? '납품 예정일 · 차수 기준' : `선택 품목 ${details?.items.length ?? 0}건`} /><Typography variant="caption">{isDelivery ? '납품 예정일 변경은 해당 차수 전체의 계획 변경 미리보기입니다.' : '변경 대상은 선택된 행으로 한정됩니다.'}</Typography></Stack>
      </Paper>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Box><Typography sx={{ fontWeight: 700, mb: 1 }}>{isDelivery ? '변경 대상 차수' : '변경 대상 품목'}</Typography>
            <Paper variant="outlined" sx={{ maxHeight: 180, overflowY: 'auto' }}><List dense disablePadding>
              {(showAll ? details?.items : details?.items.slice(0, 4))?.map(item => <ListItem key={item.matchId} divider sx={{ display: 'block' }}>
                <Typography variant="body2" noWrap title={`${item.itemNumber} ${item.itemName ?? ''}`}>{item.itemNumber} · {item.itemName || '품명 없음'}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{isDelivery ? '차수 전체' : `${item.quantity ?? '-'}점`} · 기존 {item.previousDate?.slice(0, 10) || '미등록'}</Typography>
              </ListItem>)}</List></Paper>
            {(details?.items.length ?? 0) > 4 && <Button size="small" onClick={() => setShowAll(value => !value)}>{showAll ? '접기' : `전체 ${details?.items.length}건 보기`}</Button>}
          </Box>
          <Box><Typography sx={{ fontWeight: 700, mb: 1 }}>{details?.fieldLabel || '입고 예정일'} 변경</Typography>
            <TextField size="small" fullWidth label="변경 전" value={currentDates.length === 1 ? currentDates[0] : `서로 다른 날짜 ${currentDates.length}종`} disabled sx={{ mb: 1.5 }} />
            <TextField size="small" fullWidth type="date" label="변경 후 *" value={date} onChange={e => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
          {isDelivery && <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>보증기간 설정 *</Typography>
            <RadioGroup row value={warrantyMode} onChange={event => setWarrantyMode(event.target.value as '12' | '24' | 'custom')}>
              <FormControlLabel value="12" control={<Radio size="small" />} label="+12개월" />
              <FormControlLabel value="24" control={<Radio size="small" />} label="+24개월" />
              <FormControlLabel value="custom" control={<Radio size="small" />} label="직접입력" />
            </RadioGroup>
            {warrantyMode === 'custom' && <TextField size="small" type="date" fullWidth label="보증 종료일 직접입력"
              value={customWarrantyEnd} onChange={event => setCustomWarrantyEnd(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ mt: 1 }} />}
            <TextField size="small" fullWidth label="계산된 보증 종료일" value={warrantyEnd || '변경 후 날짜를 선택하세요'}
              slotProps={{ input: { readOnly: true } }} sx={{ mt: 1 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>변경 후 납품 예정일을 기준으로 달력 개월 수를 더합니다. 월말은 해당 월 마지막 날로 맞춥니다.</Typography>
            {date && !validWarranty && <Alert severity="error" sx={{ mt: 1 }}>보증 종료일은 변경 날짜 이후여야 합니다.</Alert>}
          </Paper>}
        </Stack>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Box><Typography sx={{ fontWeight: 700 }}>근거자료 *</Typography>
            <Tabs value={tab} onChange={(_, next: number) => setTab(next)}><Tab label="새 파일 첨부" /><Tab label="기존 자료 검색" /></Tabs>
            {tab === 0 ? <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed', textAlign: 'center' }}>
              <Button component="label" variant="outlined" size="small">파일 선택<input type="file" multiple hidden onChange={chooseFiles} /></Button>
              <Typography variant="caption" sx={{ display: "block", mt: 1 }}>파일명만 미리보기로 표시하며 업로드하지 않습니다.</Typography>
            </Paper> : <Box sx={{ py: 2 }}><TextField size="small" fullWidth label="기존 문서명 검색" value={search} onChange={e => setSearch(e.target.value)} />
              <Alert severity="info" sx={{ mt: 1 }}>기존 문서 조회 API는 연결되지 않았습니다. 새 파일을 선택해 미리보기를 진행하세요.</Alert>
            </Box>}
            {!!files.length && <List dense>{files.map(name => <ListItem key={name} secondaryAction={<Button size="small" onClick={() => setFiles(v => v.filter(file => file !== name))}>제거</Button>}><Typography variant="body2" noWrap title={name}>{name}</Typography></ListItem>)}</List>}
          </Box>
          <TextField label="변경 세부내역 *" multiline minRows={4} fullWidth value={reason} onChange={e => setReason(e.target.value)} placeholder="변경 사유와 관련 내용을 입력하세요." />
        </Stack>
      </Box>
      {confirm && <Alert severity="info" sx={{ mt: 2 }}>{details?.items.length}건을 {date}로 변경하는 미리보기를 적용할까요? {isDelivery ? `보증 종료일은 ${warrantyEnd}입니다. ` : ''}DB에는 반영되지 않습니다.</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 1.5 }}><Button onClick={onClose}>취소</Button>
      {confirm ? <Button variant="contained" onClick={() => { if (valid && details) { onPreview({ itemIds: details.items.map(i => i.matchId), nextDate: date, reason: reason.trim(), attachments: files, ...(isDelivery ? { warrantyEnd, warrantyBasis: warrantyMode } : {}) }); onClose(); } }}>미리보기 확정</Button>
        : <Button variant="contained" disabled={!valid} onClick={() => setConfirm(true)}>변경 등록 미리보기</Button>}
    </DialogActions>
  </Dialog>;
}
