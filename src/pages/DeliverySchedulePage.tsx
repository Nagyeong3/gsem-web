import {
  CalendarMonthOutlined,
  ErrorOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  Search,
} from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { StatusChip } from '../components/common/StatusChip';
import { deliveryScheduleService } from '../services';
import type { DeliverySchedule, DeliveryScheduleFilters } from '../types/domain';

const initialFilters: DeliveryScheduleFilters = {
  query: '',
  business: '',
  aircraftType: '',
  destination: '',
  status: '',
};

function FilterSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const labelId = `delivery-${id}-label`;
  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select id={`delivery-${id}`} labelId={labelId} label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <MenuItem value="">전체</MenuItem>
        {options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function Metric({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.75, minHeight: 92, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Box>
        <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ mt: 0.55, fontSize: 24, fontWeight: 700 }}>{value}</Typography>
        <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 10.5 }}>{helper}</Typography>
      </Box>
      <Box sx={{ width: 36, height: 36, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'primary.main' }}>{icon}</Box>
    </Paper>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 1.5, py: 0.65 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 12.5, fontWeight: 500 }}>{children}</Typography>
    </Box>
  );
}

export function DeliverySchedulePage() {
  const [allSchedules, setAllSchedules] = useState<DeliverySchedule[]>([]);
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    deliveryScheduleService.list(initialFilters).then((items) => {
      if (active) setAllSchedules(items);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) { setLoading(true); setError(false); }
    });
    deliveryScheduleService.list(filters).then((items) => {
      if (!active) return;
      setSchedules(items);
      setSelectedId((current) => items.some((item) => item.deliveryId === current) ? current : items[0]?.deliveryId);
      setLoading(false);
    }).catch(() => {
      if (active) { setError(true); setLoading(false); }
    });
    return () => { active = false; };
  }, [filters]);

  const options = useMemo(() => ({
    businesses: [...new Set(allSchedules.map((item) => item.business))].sort(),
    aircraftTypes: [...new Set(allSchedules.map((item) => item.aircraftType))].sort(),
    destinations: [...new Set(allSchedules.map((item) => item.destination))].sort(),
  }), [allSchedules]);
  const selected = schedules.find((item) => item.deliveryId === selectedId);
  const totalQuantity = schedules.reduce((sum, item) => sum + item.plannedQuantity, 0);
  const completedQuantity = schedules.reduce((sum, item) => sum + (item.deliveredQuantity ?? 0), 0);

  return (
    <Box sx={{ p: 3, minWidth: 1080, bgcolor: 'background.default' }}>
      <PageHeader title="납품 일정 관리" description="사업과 납지별 납품 일정 및 수량을 확인합니다." />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1.5, mb: 1.5 }}>
        <Metric icon={<CalendarMonthOutlined fontSize="small" />} label="조회 일정" value={`${schedules.length}건`} helper="현재 검색 조건 기준" />
        <Metric icon={<Inventory2Outlined fontSize="small" />} label="계획 수량" value={`${totalQuantity}개`} helper="목업 데이터 합계" />
        <Metric icon={<LocalShippingOutlined fontSize="small" />} label="납품 완료 수량" value={`${completedQuantity}개`} helper="완료 상태 기준" />
        <Metric icon={<ErrorOutlined fontSize="small" />} label="지연 표시" value={`${schedules.filter((item) => item.delayed).length}건`} helper="판정 규칙 미확정" />
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4, minmax(130px, 1fr))', gap: 1 }}>
          <TextField value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="품번, 품명, 사업, 납지 검색" slotProps={{ htmlInput: { 'aria-label': '납품 일정 검색' }, input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 19, color: 'text.secondary' }} /></InputAdornment> } }} />
          <FilterSelect id="business" label="사업" value={filters.business} options={options.businesses} onChange={(value) => setFilters((current) => ({ ...current, business: value }))} />
          <FilterSelect id="aircraft-type" label="기종" value={filters.aircraftType} options={options.aircraftTypes} onChange={(value) => setFilters((current) => ({ ...current, aircraftType: value }))} />
          <FilterSelect id="destination" label="납지" value={filters.destination} options={options.destinations} onChange={(value) => setFilters((current) => ({ ...current, destination: value }))} />
          <FilterSelect id="status" label="진행 상태" value={filters.status} options={['예정', '진행', '완료']} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: 1.5 }}>
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small" aria-label="납품 일정 목록">
              <TableHead><TableRow>
                <TableCell>품번</TableCell><TableCell>품명</TableCell><TableCell>사업</TableCell><TableCell>기종</TableCell><TableCell>납지</TableCell><TableCell align="right">계획</TableCell><TableCell align="right">발주</TableCell><TableCell align="right">입고</TableCell><TableCell align="right">납품</TableCell><TableCell>예정일</TableCell><TableCell>상태</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={11} align="center" sx={{ height: 280 }}><CircularProgress size={26} /></TableCell></TableRow>
                  : error ? <TableRow><TableCell colSpan={11} align="center" sx={{ height: 280 }}>납품 일정을 불러오지 못했습니다.</TableCell></TableRow>
                  : schedules.length === 0 ? <TableRow><TableCell colSpan={11} align="center" sx={{ height: 280 }}>검색 결과가 없습니다.</TableCell></TableRow>
                  : schedules.map((item) => <TableRow key={item.deliveryId} hover selected={item.deliveryId === selectedId} onClick={() => setSelectedId(item.deliveryId)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{item.itemNum}</TableCell><TableCell>{item.itemName}</TableCell><TableCell>{item.business}</TableCell><TableCell>{item.aircraftType}</TableCell><TableCell>{item.destination}</TableCell><TableCell align="right">{item.plannedQuantity}</TableCell><TableCell align="right">{item.orderedQuantity ?? '-'}</TableCell><TableCell align="right">{item.receivedQuantity ?? '-'}</TableCell><TableCell align="right">{item.deliveredQuantity ?? '-'}</TableCell><TableCell>{item.deliveryDate}</TableCell><TableCell><StatusChip status={item.status} /></TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <SectionCard title="선택 일정 상세">
          <Box sx={{ p: 2 }}>
            {!selected ? <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>일정을 선택해주세요.</Typography> : <>
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{selected.itemName}</Typography>
              <Typography sx={{ mt: 0.2, mb: 1.5, color: 'text.secondary', fontSize: 12 }}>{selected.itemNum}</Typography>
              <DetailRow label="사업">{selected.business}</DetailRow>
              <DetailRow label="기종">{selected.aircraftType}</DetailRow>
              <DetailRow label="납지">{selected.destination}</DetailRow>
              <DetailRow label="납품 예정일">{selected.deliveryDate}</DetailRow>
              <DetailRow label="진행 상태"><StatusChip status={selected.status} /></DetailRow>
              <DetailRow label="담당자">{selected.managers.map((item) => item.name).join(' · ') || '-'}</DetailRow>
              <Box sx={{ mt: 1.5, p: 1.25, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 11.5 }}>발주·입고·납품 단계와 지연 판정 방식은 프로토타입 가정이며 실제 업무 상태값 확정 후 조정합니다.</Typography>
              </Box>
              <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
                {[['계획', selected.plannedQuantity], ['발주', selected.orderedQuantity], ['입고', selected.receivedQuantity], ['납품', selected.deliveredQuantity]].map(([label, value]) => <Box key={String(label)} sx={{ textAlign: 'center', p: 0.8, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}><Typography sx={{ color: 'text.secondary', fontSize: 10 }}>{label}</Typography><Typography sx={{ mt: 0.2, fontSize: 13, fontWeight: 700 }}>{value ?? '-'}</Typography></Box>)}
              </Box>
            </>}
          </Box>
        </SectionCard>
      </Box>
    </Box>
  );
}
