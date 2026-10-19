import {
  Close,
  DownloadOutlined,
  EditOutlined,
  Refresh,
  SaveOutlined,
  Search,
  SettingsOutlined,
  TableRowsOutlined,
  ViewModuleOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Radio,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useAsyncQuery } from '../hooks/useAsyncQuery';
import { runtimeConfig } from '../config/runtime';
import { PageHeader } from '../components/common/PageHeader';
import { initialEquipmentMasterItems, masterUnits, progressOptions } from '../data/equipmentMasterMock';
import type { EquipmentMasterItem, MasterViewMode, ProgressTone, RiskLevel, UnitDelivery } from '../types/equipmentMaster';

type DbDelivery = { matchId: number; subContractName: string | null; destination: string | null; quantity: number | null; receivingExpected: string | null; receivedAt: string | null; deliveredAt: string | null; contractDate: string | null; buyerName: string | null; vendorName: string | null; subContractId: number };
type DbMasterRow = { integratedId: number; businessId: number; businessName: string | null; itemNumber: string; itemNameKor: string | null; description: string | null; managerName: string | null; manufacturer: string | null; imagePath: string | null; deliveries: DbDelivery[] };
type DbMasterResponse = { items: DbMasterRow[]; page: number; size: number; totalElements: number; totalPages: number; readOnly: boolean };
const realDataMode = runtimeConfig.dataSource === 'api';

function dateText(value: string | null): string { return value ? value.slice(0, 10) : ''; }
function normalizeDestination(value: string | null): string {
  return (value || '납지 미지정').replace(/\s+/g, '').trim() || '납지 미지정';
}
function summarizeDate(values: Array<string | null>): string {
  const dates = [...new Set(values.map(dateText).filter(Boolean))];
  return dates.length > 1 ? '다건(상세)' : dates[0] || '';
}
function mapDatabaseItem(row: DbMasterRow): EquipmentMasterItem {
  const originalLines = row.deliveries ?? [];
  const seen = new Set<number>();
  const unique = originalLines.filter((line) => {
    if (seen.has(line.matchId)) return false;
    seen.add(line.matchId);
    return true;
  });
  const issues: string[] = [];
  if (!originalLines.length) issues.push('계약·납품 데이터 미등록');
  if (unique.length !== originalLines.length) issues.push(`중복 matchId ${originalLines.length - unique.length}건: 합계 제외`);
  const grouped = new Map<string, DbDelivery[]>();
  for (const line of unique) {
    const key = normalizeDestination(line.destination);
    grouped.set(key, [...(grouped.get(key) ?? []), line]);
    if (line.quantity == null || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) < 0) issues.push(`계약 #${line.matchId}: 수량 확인 필요`);
    if (!line.destination?.trim()) issues.push(`계약 #${line.matchId}: 납품처 미등록`);
    if (line.deliveredAt && line.receivedAt && dateText(line.deliveredAt) < dateText(line.receivedAt)) issues.push(`계약 #${line.matchId}: 납품일이 입고일보다 빠름`);
  }
  const deliveries: UnitDelivery[] = [...grouped.entries()].map(([unitName, lines]) => {
    const inboundExpected = summarizeDate(lines.map((line) => line.receivingExpected));
    const inboundActual = summarizeDate(lines.map((line) => line.receivedAt));
    const deliveredAt = summarizeDate(lines.map((line) => line.deliveredAt));
    const deliveryPlan = summarizeDate(lines.map((line) => line.contractDate));
    if ([inboundExpected, inboundActual, deliveredAt, deliveryPlan].some((value) => value === '다건(상세)')) {
      issues.push(`${unitName}: 계약별 날짜가 다름 (상세 확인)`);
    }
    return {
      unitName, contracted: true,
      quantity: lines.reduce((sum, line) => sum + (line.quantity != null && Number.isFinite(Number(line.quantity)) && Number(line.quantity) >= 0 ? Number(line.quantity) : 0), 0),
      inboundExpected, inboundActual, deliveredAt, deliveryPlan,
    };
  });
  const buyer = [...new Set(unique.map((entry) => entry.buyerName).filter(Boolean))].join(', ');
  const supplier = [...new Set(unique.map((entry) => entry.vendorName).filter(Boolean))].join(', ');
  return {
    id: String(row.integratedId), businessName: row.businessName || `사업 ID ${row.businessId}`, managerName: row.managerName || '-',
    contractLines: unique.map((line) => ({ matchId: line.matchId, subContractId: line.subContractId, subContractName: line.subContractName || '-', destination: line.destination || '미등록', quantity: line.quantity, receivingExpected: dateText(line.receivingExpected), receivedAt: dateText(line.receivedAt), deliveredAt: dateText(line.deliveredAt), deliveryPlan: dateText(line.contractDate), buyerName: line.buyerName || '-', vendorName: line.vendorName || '-' })),
    validationIssues: issues,
    risk: '?', itemNameKor: row.itemNameKor || '-', itemNumber: row.itemNumber || '-', material: '-', buyer: buyer || '-', supplier: supplier || '-',
    progress: '미등록', progressTone: 'info', tdtCode: '-', description: row.description || '-',
    maintenance: { priority: 0, serviceable: '-', hour100: '-', hour600: '-', periodicInspection: '-', planned: '-', unplanned: '-' }, deliveries,
  };
}

type DbBusiness = { businessId: number; businessName: string };
async function fetchBusinessOptions(): Promise<DbBusiness[]> {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/equipment-master/businesses`);
  if (!response.ok) throw new Error(`사업 목록 조회 오류 (HTTP ${response.status})`);
  return (await response.json()) as DbBusiness[];
}
async function fetchDatabaseMaster(page: number, size: number, query: string, businessId: number | null): Promise<DbMasterResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size), query });
  if (businessId != null) params.set('businessId', String(businessId));
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/equipment-master?${params.toString()}`);
  if (!response.ok) throw new Error(`통합현황 데이터 요청에 실패했습니다. (HTTP ${response.status})`);
  return (await response.json()) as DbMasterResponse;
}

function cloneItem(item: EquipmentMasterItem): EquipmentMasterItem {
  return JSON.parse(JSON.stringify(item)) as EquipmentMasterItem;
}

function inferProgressTone(progress: string): ProgressTone {
  return progressOptions.find((option) => option.label === progress)?.tone ?? 'info';
}

function getDelivery(item: EquipmentMasterItem, unitName: string) {
  return item.deliveries.find((delivery) => delivery.unitName === unitName);
}

function getTotalQuantity(item: EquipmentMasterItem) {
  return item.deliveries.reduce((sum, delivery) => sum + delivery.quantity, 0);
}

function getRiskStyle(risk: RiskLevel) {
  if (risk === '?') return { color: '#98A2B3', label: '-' };
  if (risk === 'R') return { color: '#F04438', label: 'R' };
  if (risk === 'Y') return { color: '#F59E0B', label: 'Y' };
  return { color: '#12B76A', label: 'G' };
}

function getProgressStyle(tone: ProgressTone) {
  if (tone === 'error') return { color: '#F04438', bg: '#FFF1F0' };
  if (tone === 'warning') return { color: '#B45309', bg: '#FFF7E6' };
  if (tone === 'info') return { color: '#0F6BFF', bg: '#EAF3FF' };
  return { color: '#079455', bg: '#E7F8EF' };
}

function equipmentImageDataUrl(item: EquipmentMasterItem, large = false) {
  const seed = Array.from(item.itemNumber).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hue = seed % 360;
  const width = large ? 360 : 120;
  const height = large ? 220 : 76;
  const title = item.itemNumber.replace(/&/g, '&amp;').slice(0, 14);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 66%, 92%)"/>
          <stop offset="100%" stop-color="hsl(${(hue + 42) % 360}, 66%, 76%)"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="14" fill="url(#bg)"/>
      <rect x="${width * 0.18}" y="${height * 0.28}" width="${width * 0.64}" height="${height * 0.32}" rx="10" fill="rgba(255,255,255,0.88)" stroke="rgba(12,34,64,0.16)"/>
      <circle cx="${width * 0.72}" cy="${height * 0.34}" r="${large ? 18 : 7}" fill="rgba(15,107,255,0.24)"/>
      <rect x="${width * 0.30}" y="${height * 0.43}" width="${width * 0.40}" height="${large ? 14 : 5}" rx="4" fill="rgba(12,34,64,0.22)"/>
      <text x="${width / 2}" y="${height * 0.82}" text-anchor="middle" fill="#0B1F3A" font-size="${large ? 22 : 10}" font-weight="700" font-family="Arial, sans-serif">${title}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const style = getRiskStyle(risk);
  return <Chip label={style.label} size="small" sx={{ minWidth: 28, height: 28, borderRadius: 999, bgcolor: style.color, color: '#FFFFFF', fontWeight: 800, '& .MuiChip-label': { px: 0 } }} />;
}

function ProgressChip({ item }: { item: EquipmentMasterItem }) {
  const style = getProgressStyle(item.progressTone);
  return <Chip label={item.progress} size="small" sx={{ bgcolor: style.bg, color: style.color, border: `1px solid ${style.color}33`, fontWeight: 700, maxWidth: 138, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />;
}

function EquipmentThumbnail({ item }: { item: EquipmentMasterItem }) {
  if (realDataMode) return <Box sx={{ width: 58, height: 42, border: '1px solid', borderColor: 'divider', display: 'grid', placeItems: 'center', color: 'text.secondary', fontSize: 10 }}>미연결</Box>;
  const src = equipmentImageDataUrl(item);
  const largeSrc = equipmentImageDataUrl(item, true);
  const alt = `${item.itemNameKor} 장비형상`;
  return (
    <Box className="equipment-master-thumbnail" sx={{ position: 'relative', width: 58, height: 42 }}>
      <Box component="img" src={src} alt={alt} sx={{ width: 58, height: 42, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'block' }} />
      <Box sx={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 360, height: 220, p: 1, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 10, border: '1px solid', borderColor: 'divider', zIndex: 1600, opacity: 0, pointerEvents: 'none', transition: 'opacity 120ms ease', '.equipment-master-thumbnail:hover &': { opacity: 1 } }}>
        <Box component="img" src={largeSrc} alt={alt} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5 }} />
      </Box>
    </Box>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <FormControl size="small" sx={{ minWidth: 154 }}><InputLabel>{label}</InputLabel><Select value={value} label={label} onChange={(event: SelectChangeEvent) => onChange(event.target.value)}><MenuItem value="">전체</MenuItem>{options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select></FormControl>;
}

function SummaryCard({ label, value, helper, tone = '#0F6BFF' }: { label: string; value: string; helper: string; tone?: string }) {
  return <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minHeight: 92 }}><Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>{label}</Typography><Typography sx={{ mt: 0.5, color: tone, fontSize: 27, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</Typography><Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 11 }}>{helper}</Typography></Paper>;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 1.5, py: 0.55 }}><Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography><Typography component="div" sx={{ color: 'text.primary', fontSize: 12, fontWeight: 600 }}>{value || '-'}</Typography></Box>;
}

function DetailSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <Box sx={{ py: 1.6, borderTop: '1px solid', borderColor: 'divider' }}><Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 14, fontWeight: 800 }}>{title}</Typography>{action}</Box>{children}</Box>;
}

function DetailPanel({ item, onClose, onEdit }: { item: EquipmentMasterItem; onClose: () => void; onEdit: (item: EquipmentMasterItem) => void }) {
  return (
    <Paper component="aside" square elevation={0} sx={{ width: 376, flex: '0 0 376px', minHeight: 'calc(100vh - 58px)', borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ height: 52, px: 2.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>장비 상세</Typography>
        <IconButton size="small" aria-label="상세 패널 닫기" onClick={onClose}><Close sx={{ fontSize: 19 }} /></IconButton>
      </Box>
      <Box sx={{ px: 2.25, py: 1.75 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 54px', gap: 1.25, alignItems: 'stretch' }}>
          <Box component="img" src={realDataMode ? undefined : equipmentImageDataUrl(item, true)} alt={`${item.itemNameKor} 장비형상`} sx={{ width: '100%', height: 168, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{(realDataMode ? [] : [0, 1, 2]).map((index) => <Box key={index} component="img" src={equipmentImageDataUrl(item)} alt={`${item.itemNameKor} 썸네일 ${index + 1}`} sx={{ width: 54, height: 50, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: index === 0 ? 'primary.main' : 'divider' }} />)}</Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.75 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{item.itemNameKor}</Typography>
          <Chip label={item.risk === 'R' ? 'Risk' : item.risk === 'Y' ? '주의' : item.risk === '?' ? 'RISK 미등록' : '정상'} size="small" color={item.risk === 'R' ? 'error' : item.risk === 'Y' ? 'warning' : 'success'} variant="outlined" />
        </Box>
        <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 13 }}>{item.itemNumber}</Typography>
        <Button fullWidth variant="contained" disabled={realDataMode} startIcon={<EditOutlined />} sx={{ mt: 1.5 }} onClick={() => onEdit(item)}>이 품목 수정</Button>
        <DetailSection title="기본정보">
          <DetailRow label="품명" value={item.itemNameKor} />
          <DetailRow label="사업명" value={item.businessName || '-'} />
          <DetailRow label="담당자" value={item.managerName || '-'} />
          <DetailRow label="품번" value={item.itemNumber} />
          <DetailRow label="Material" value={item.material} />
          <DetailRow label="담당 바이어" value={item.buyer} />
          <DetailRow label="조달원" value={item.supplier} />
          <DetailRow label="진행 상태" value={<ProgressChip item={item} />} />
          <DetailRow label="TDT CODE" value={item.tdtCode} />
        </DetailSection>
        <DetailSection title="부대별 납품현황" action={<Button size="small" disabled={realDataMode} onClick={() => onEdit(item)}>수정</Button>}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 212 }}>
            <Table size="small" stickyHeader aria-label="부대별 납품현황">
              <TableHead><TableRow>{['부대명', '계약', '입고예정', '납품계획', '수량'].map((header) => <TableCell key={header} sx={{ fontSize: 11, fontWeight: 800 }}>{header}</TableCell>)}</TableRow></TableHead>
              <TableBody>{item.deliveries.map((delivery) => <TableRow key={delivery.unitName}><TableCell sx={{ fontSize: 11, fontWeight: 700 }}>{delivery.unitName.replace('(파견중대 포함)', '')}</TableCell><TableCell>{delivery.contracted ? '●' : '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{delivery.inboundExpected || '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{delivery.deliveryPlan || '-'}</TableCell><TableCell align="right" sx={{ fontSize: 11, fontWeight: 800 }}>{delivery.quantity}</TableCell></TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </DetailSection>
        {realDataMode && <DetailSection title="정합성 확인">
          {item.validationIssues?.length ? item.validationIssues.map((issue, index) => <Typography key={`${issue}-${index}`} color="warning.main" sx={{ fontSize: 12, mb: 0.5 }}>• {issue}</Typography>) : <Typography sx={{ fontSize: 12 }}>현재 조회된 계약 데이터에서 이상 항목 없음 (전수검증 결과 아님)</Typography>}
        </DetailSection>}
        {realDataMode && <DetailSection title="개별 계약·납품 내역 (합산 근거)">
          {item.contractLines?.length ? <TableContainer sx={{ maxHeight: 270 }}><Table size="small" stickyHeader><TableHead><TableRow>{['계약', '납지', '수량', '입고예정', '입고', '납품'].map((key) => <TableCell key={key} sx={{ fontSize: 11, fontWeight: 800 }}>{key}</TableCell>)}</TableRow></TableHead><TableBody>{item.contractLines.map((line) => <TableRow key={line.matchId}><TableCell sx={{ fontSize: 11 }}>{line.subContractName} (#{line.matchId})</TableCell><TableCell sx={{ fontSize: 11 }}>{line.destination}</TableCell><TableCell>{line.quantity ?? '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{line.receivingExpected || '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{line.receivedAt || '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{line.deliveredAt || '-'}</TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Typography sx={{ fontSize: 12 }}>연결된 계약·납품정보 없음</Typography>}
        </DetailSection>}
        <DetailSection title="정비 / 운영 정보">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            <InfoTile label="납품 우선순위" value={item.maintenance.priority ? `${item.maintenance.priority}순위` : '-'} />
            <InfoTile label="운영/서비스성" value={item.maintenance.serviceable} />
            <InfoTile label="100시간" value={item.maintenance.hour100} />
            <InfoTile label="600시간" value={item.maintenance.hour600} />
            <InfoTile label="주기검사" value={item.maintenance.periodicInspection} />
            <InfoTile label="계획/비계획" value={`${item.maintenance.planned} / ${item.maintenance.unplanned}`} />
          </Box>
        </DetailSection>
      </Box>
    </Paper>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <Box sx={{ p: 1.1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}><Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700 }}>{label}</Typography><Typography sx={{ mt: 0.4, fontSize: 13, fontWeight: 800 }}>{value}</Typography></Box>;
}

const baseHeaderSx = { py: 1, px: 1, fontSize: 11, fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap', borderColor: '#D6DEE8' } as const;

function stickySx(left: number, width: number, header = false, selected = false) {
  return { position: 'sticky', left, width, minWidth: width, maxWidth: width, zIndex: header ? 4 : 2, bgcolor: header ? '#DDF5DA' : selected ? '#EEF5FF' : 'background.paper', boxShadow: '1px 0 0 #D6DEE8' } as const;
}

function ExcelFriendlyTable({ items, unitNames, selectedId, onSelect, onEdit }: { items: EquipmentMasterItem[]; unitNames: string[]; selectedId: string | null; onSelect: (id: string) => void; onEdit: (item: EquipmentMasterItem) => void }) {
  // Column width is keyed by identity so page-dependent delivery destinations do not lose sizing.
  const columns = useMemo(() => [
    ...[
      ['number', 52, '번호'], ['risk', 58, 'RISK'], ['name', 240, '품명(국문)'],
      ['business', 180, '사업명'], ['itemNumber', 150, '품번'], ['material', 150, 'Material'],
      ['buyer', 132, '담당 바이어'], ['supplier', 158, '조달원'], ['progress', 160, '진행 상세현황'],
    ].map(([key, width, title]) => ({ key: String(key), width: Number(width), title: String(title) })),
    ...unitNames.flatMap((unit) => ['계약', '입고예정', '계약상 납기', '입고', '납품', '수량'].map((title, index) => ({ key: `unit:${unit}:${index}`, width: index === 0 || index === 5 ? 74 : 124, title }))),
    ...[
      ['priority', 90, '납품 우선순위'], ['serviceable', 116, '운영/서비스성'],
      ['hour100', 78, '100시간'], ['hour600', 78, '600시간'],
      ['periodic', 116, '주기검사'], ['planned', 82, '계획'],
      ['unplanned', 82, '비계획'], ['image', 104, '장비형상'], ['description', 380, '장비설명'],
    ].map(([key, width, title]) => ({ key: String(key), width: Number(width), title: String(title) })),
  ], [unitNames]);
  const [customWidths, setCustomWidths] = useState<Record<string, number>>({});
  const widths = columns.map((col) => customWidths[col.key] ?? col.width);
  const offsets = widths.map((_, index) => widths.slice(0, index).reduce((sum, width) => sum + width, 0));
  const tableRef = useRef<HTMLTableElement | null>(null);
  const updateWidth = (index: number, width: number) => {
    if (!columns[index]) return;
    setCustomWidths((prev) => ({ ...prev, [columns[index].key]: Math.min(700, Math.max(52, Math.round(width))) }));
  };
  const autoFit = (index: number) => {
    const col = columns[index];
    if (!col || !tableRef.current) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    context.font = '600 12px "Noto Sans KR", sans-serif';
    const rows = Array.from(tableRef.current.querySelectorAll('tbody tr'));
    const labels = [col.title, ...rows.map((row) => row.cells[index]?.textContent?.trim() ?? '')];
    // Only the currently loaded page can be measured. Remaining server-side pages are not in the DOM.
    const fit = Math.max(...labels.map((label) => context.measureText(label).width)) + 34;
    updateWidth(index, fit);
  };
  const onHeaderPointerDown = (event: ReactPointerEvent<HTMLTableSectionElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const th = target.closest<HTMLTableCellElement>('th[data-resize-index]');
    if (!th || th.getBoundingClientRect().right - event.clientX > 12) return;
    const index = Number(th.dataset.resizeIndex);
    if (!columns[index]) return;
    event.stopPropagation();
    const x = event.clientX; const initial = widths[index];
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'col-resize';
    const move = (e: PointerEvent) => updateWidth(index, initial + e.clientX - x);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      document.body.style.cursor = previousCursor;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };
  const onHeaderDoubleClick = (event: ReactMouseEvent<HTMLTableSectionElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const th = target.closest<HTMLTableCellElement>('th[data-resize-index]');
    if (!th || th.getBoundingClientRect().right - event.clientX > 12) return;
    event.preventDefault(); event.stopPropagation();
    autoFit(Number(th.dataset.resizeIndex));
  };
  return (
    <TableContainer sx={{ height: 860, minHeight: 860, maxHeight: 'none', overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
      <Table ref={tableRef} size="small" stickyHeader aria-label="엑셀 친화형 지원장비 통합현황" sx={{ tableLayout: 'fixed', width: widths.reduce((sum, width) => sum + width, 0), minWidth: 0, '& th, & td': { borderColor: '#D6DEE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', boxSizing: 'border-box' }, '& th[data-resize-index]': { cursor: 'default' }, '& th[data-resize-index]::after': { content: '""', position: 'absolute', right: 1, top: '19%', height: '62%', borderRight: '2px solid rgba(40,83,140,0.3)' } }}>
        <colgroup>{columns.map((col, index) => <col key={col.key} style={{ width: widths[index], minWidth: widths[index] }} />)}</colgroup>
        <TableHead onPointerDownCapture={onHeaderPointerDown} onDoubleClickCapture={onHeaderDoubleClick}>
          <TableRow>
            <TableCell data-resize-index={0} rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(offsets[0], widths[0], true) }}>번호</TableCell>
            <TableCell data-resize-index={1} rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(offsets[1], widths[1], true) }}>RISK</TableCell>
            <TableCell data-resize-index={2} rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(offsets[2], widths[2], true), textAlign: 'left' }}>품명(국문)</TableCell>
            <TableCell data-resize-index={3} rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(offsets[3], widths[3], true), textAlign: 'left' }}>사업명</TableCell>
            <TableCell data-resize-index={4} rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(offsets[4], widths[4], true), textAlign: 'left' }}>품번</TableCell>
            <TableCell data-resize-index={5} rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(offsets[5], widths[5], true), textAlign: 'left' }}>Material</TableCell>
            <TableCell data-resize-index={6} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#DDF5DA' }}>담당<br />바이어</TableCell>
            <TableCell data-resize-index={7} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#DDF5DA' }}>조달원</TableCell>
            <TableCell data-resize-index={8} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#DDF5DA' }}>진행 상세현황</TableCell>
            {unitNames.map((unit, index) => <TableCell key={unit} colSpan={6} sx={{ ...baseHeaderSx, bgcolor: index === 2 ? '#D9ECFF' : index === 3 ? '#FFF6D8' : '#FFE7A3', fontSize: 12 }}>{unit}</TableCell>)}
            <TableCell data-resize-index={9 + unitNames.length * 6 + 0} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#FFF1B8' }}>납품<br />우선<br />순위<br />(주)</TableCell>
            <TableCell data-resize-index={9 + unitNames.length * 6 + 1} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#DDF5DA' }}>운영/<br />지상취급/<br />서비스성</TableCell>
            <TableCell data-resize-index={9 + unitNames.length * 6 + 2} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#D9ECFF' }}>100<br />시간</TableCell>
            <TableCell data-resize-index={9 + unitNames.length * 6 + 3} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#D9ECFF' }}>600<br />시간</TableCell>
            <TableCell data-resize-index={9 + unitNames.length * 6 + 4} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#D9ECFF' }}>주기검사<br />(400시간이내)</TableCell>
            <TableCell colSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#D9ECFF' }}>비계획</TableCell>
            <TableCell data-resize-index={9 + unitNames.length * 6 + 7} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#DDF5DA' }}>장비형상</TableCell>
            <TableCell data-resize-index={9 + unitNames.length * 6 + 8} rowSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#DDF5DA' }}>장비설명</TableCell>
          </TableRow>
          <TableRow>
            {unitNames.flatMap((unit) => ['계약', '입고예정', '계약상 납기', '입고', '납품', '수량'].map((label) => <TableCell key={`${unit}-${label}`} data-resize-index={9 + unitNames.indexOf(unit) * 6 + ['계약', '입고예정', '계약상 납기', '입고', '납품', '수량'].indexOf(label)} sx={{ ...baseHeaderSx, bgcolor: '#FFF9E8' }}>{label}</TableCell>))}
            <TableCell data-resize-index={9 + unitNames.length * 6 + 5} sx={{ ...baseHeaderSx, bgcolor: '#EAF3FF' }}>계획</TableCell>
            <TableCell data-resize-index={9 + unitNames.length * 6 + 6} sx={{ ...baseHeaderSx, bgcolor: '#EAF3FF' }}>비계획</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => {
            const selected = item.id === selectedId;
            const rowBg = selected ? '#EEF5FF' : index % 2 ? '#FBFCFE' : '#FFFFFF';
            return (
              <TableRow key={item.id} hover selected={selected} onClick={() => onSelect(item.id)} onDoubleClick={() => onEdit(item)} sx={{ cursor: 'pointer', '&.Mui-selected td': { bgcolor: '#EEF5FF' } }}>
                <TableCell align="center" sx={{ ...stickySx(offsets[0], widths[0], false, selected), bgcolor: rowBg }}>{index + 1}</TableCell>
                <TableCell align="center" sx={{ ...stickySx(offsets[1], widths[1], false, selected), bgcolor: rowBg }}><RiskBadge risk={item.risk} /></TableCell>
                <TableCell sx={{ ...stickySx(offsets[2], widths[2], false, selected), bgcolor: rowBg, fontWeight: 700 }}>{item.itemNameKor}</TableCell>
                <TableCell sx={{ ...stickySx(offsets[3], widths[3], false, selected), bgcolor: rowBg, fontWeight: 700 }}>{item.businessName || '-'}</TableCell>
                <TableCell sx={{ ...stickySx(offsets[4], widths[4], false, selected), bgcolor: rowBg }}>{item.itemNumber}</TableCell>
                <TableCell sx={{ ...stickySx(offsets[5], widths[5], false, selected), bgcolor: rowBg }}>{item.material}</TableCell>
                <TableCell sx={{ minWidth: 96 }}>{item.buyer}</TableCell>
                <TableCell sx={{ minWidth: 112 }}>{item.supplier}</TableCell>
                <TableCell sx={{ minWidth: 146 }}><ProgressChip item={item} /></TableCell>
                {unitNames.flatMap((unit) => {
                  const delivery = getDelivery(item, unit);
                  return [
                    <TableCell key={`${item.id}-${unit}-contract`} align="center">{delivery?.contracted ? '●' : '-'}</TableCell>,
                    <TableCell key={`${item.id}-${unit}-inboundExpected`} align="center">{delivery?.inboundExpected || '-'}</TableCell>,
                    <TableCell key={`${item.id}-${unit}-deliveryPlan`} align="center">{delivery?.deliveryPlan || '-'}</TableCell>,
                    <TableCell key={`${item.id}-${unit}-inboundActual`} align="center">{delivery?.inboundActual || '-'}</TableCell>,
                    <TableCell key={`${item.id}-${unit}-deliveredAt`} align="center">{delivery?.deliveredAt || '-'}</TableCell>,
                    <TableCell key={`${item.id}-${unit}-quantity`} align="right" sx={{ fontWeight: 700 }}>{delivery?.quantity || '-'}</TableCell>,
                  ];
                })}
                <TableCell align="center" sx={{ bgcolor: '#FFF9E8', fontWeight: 800 }}>{item.maintenance.priority}</TableCell>
                <TableCell align="center">{item.maintenance.serviceable}</TableCell>
                <TableCell align="center">{item.maintenance.hour100}</TableCell>
                <TableCell align="center">{item.maintenance.hour600}</TableCell>
                <TableCell align="center">{item.maintenance.periodicInspection}</TableCell>
                <TableCell align="center">{item.maintenance.planned}</TableCell>
                <TableCell align="center">{item.maintenance.unplanned}</TableCell>
                <TableCell align="center"><EquipmentThumbnail item={item} /></TableCell>
                <TableCell sx={{ minWidth: 360 }}>{item.description}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function OptimizedTable({ items, selectedId, onSelect, onEdit }: { items: EquipmentMasterItem[]; selectedId: string | null; onSelect: (id: string) => void; onEdit: (item: EquipmentMasterItem) => void }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'auto', height: 860, minHeight: 860, maxHeight: 'none' }}>
      <Table size="small" stickyHeader aria-label="업무 최적화형 지원장비 통합현황" sx={{ minWidth: 1120 }}>
        <TableHead><TableRow>{['', 'RISK', '장비형상', '품명', '사업명', '품번', 'Material', '담당 바이어', '조달원', '진행상태', '계약부대', '총수량', '정비 기준', '수정'].map((header) => <TableCell key={header} sx={{ fontWeight: 800, bgcolor: '#F6F9FC', whiteSpace: 'nowrap' }}>{header}</TableCell>)}</TableRow></TableHead>
        <TableBody>{items.map((item) => { const selected = item.id === selectedId; const contractedUnits = item.deliveries.filter((delivery) => delivery.contracted).length; return <TableRow key={item.id} hover selected={selected} onClick={() => onSelect(item.id)} onDoubleClick={() => onEdit(item)} sx={{ cursor: 'pointer' }}><TableCell padding="checkbox"><Radio checked={selected} size="small" /></TableCell><TableCell><RiskBadge risk={item.risk} /></TableCell><TableCell><EquipmentThumbnail item={item} /></TableCell><TableCell sx={{ fontWeight: 800 }}>{item.itemNameKor}</TableCell><TableCell sx={{ fontWeight: 700 }}>{item.businessName || '-'}</TableCell><TableCell>{item.itemNumber}</TableCell><TableCell>{item.material}</TableCell><TableCell>{item.buyer}</TableCell><TableCell>{item.supplier}</TableCell><TableCell><ProgressChip item={item} /></TableCell><TableCell>{contractedUnits}개 부대</TableCell><TableCell sx={{ fontWeight: 800 }}>{getTotalQuantity(item)}</TableCell><TableCell>{item.maintenance.periodicInspection === '-' ? '일반' : `주기검사 ${item.maintenance.periodicInspection}`}</TableCell><TableCell><Button size="small" disabled={realDataMode} startIcon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); onEdit(item); }}>수정</Button></TableCell></TableRow>; })}</TableBody>
      </Table>
    </TableContainer>
  );
}

function FilterBar({ search, setSearch, risk, setRisk, supplier, setSupplier, progress, setProgress, reset, items, apiMode }: { search: string; setSearch: (value: string) => void; risk: string; setRisk: (value: string) => void; supplier: string; setSupplier: (value: string) => void; progress: string; setProgress: (value: string) => void; reset: () => void; items: EquipmentMasterItem[]; apiMode: boolean }) {
  const suppliers = Array.from(new Set(items.map((item) => item.supplier)));
  const progresses = Array.from(new Set(items.map((item) => item.progress)));
  return <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}><Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}><TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="품명, 품번, Material, 조달원 검색" sx={{ minWidth: 360, flex: '1 1 360px' }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> } }} />{!apiMode && <FilterSelect label="RISK" value={risk} options={['G', 'Y', 'R']} onChange={setRisk} />}{!apiMode && <FilterSelect label="조달원" value={supplier} options={suppliers} onChange={setSupplier} />}{!apiMode && <FilterSelect label="진행상태" value={progress} options={progresses} onChange={setProgress} />}<Button variant="outlined" startIcon={<Refresh />} onClick={reset}>초기화</Button></Box></Paper>;
}

function EditTextField({ label, value, onChange, multiline = false, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; multiline?: boolean; type?: string }) {
  return <TextField size="small" label={label} value={value} type={type} multiline={multiline} minRows={multiline ? 3 : undefined} onChange={(event) => onChange(event.target.value)} fullWidth />;
}

function EditSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <FormControl size="small" fullWidth><InputLabel>{label}</InputLabel><Select value={value} label={label} onChange={(event: SelectChangeEvent) => onChange(event.target.value)}>{options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select></FormControl>;
}

function EditDialog({ draft, onChange, onClose, onSave }: { draft: EquipmentMasterItem | null; onChange: (draft: EquipmentMasterItem) => void; onClose: () => void; onSave: () => void }) {
  if (!draft) return null;
  const updateDelivery = (index: number, patch: Partial<UnitDelivery>) => {
    onChange({ ...draft, deliveries: draft.deliveries.map((delivery, deliveryIndex) => deliveryIndex === index ? { ...delivery, ...patch } : delivery) });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        <Box><Typography sx={{ fontSize: 19, fontWeight: 800 }}>지원장비 마스터 행 수정</Typography><Typography sx={{ color: 'text.secondary', fontSize: 12 }}>컬럼 성격에 맞는 입력 방식으로 Mock 데이터를 수정합니다. 저장 내용은 현재 화면에서만 유지됩니다.</Typography></Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ mb: 1.5, fontWeight: 800 }}>기본 / 조달 정보</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 1.25 }}>
            <EditSelect label="RISK" value={draft.risk} options={['G', 'Y', 'R']} onChange={(value) => onChange({ ...draft, risk: value as RiskLevel })} />
            <EditTextField label="품명(국문)" value={draft.itemNameKor} onChange={(value) => onChange({ ...draft, itemNameKor: value })} />
            <EditTextField label="품번" value={draft.itemNumber} onChange={(value) => onChange({ ...draft, itemNumber: value })} />
            <EditTextField label="Material" value={draft.material} onChange={(value) => onChange({ ...draft, material: value })} />
            <EditTextField label="담당 바이어" value={draft.buyer} onChange={(value) => onChange({ ...draft, buyer: value })} />
            <EditTextField label="조달원" value={draft.supplier} onChange={(value) => onChange({ ...draft, supplier: value })} />
            <EditSelect label="진행 상세현황" value={draft.progress} options={progressOptions.map((option) => option.label)} onChange={(value) => onChange({ ...draft, progress: value, progressTone: inferProgressTone(value) })} />
            <EditTextField label="TDT CODE" value={draft.tdtCode} onChange={(value) => onChange({ ...draft, tdtCode: value })} />
            <Box sx={{ gridColumn: '1 / -1' }}><EditTextField label="장비설명" value={draft.description} multiline onChange={(value) => onChange({ ...draft, description: value })} /></Box>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ mb: 1.5, fontWeight: 800 }}>부대별 계약 / 입고 / 납품</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {draft.deliveries.map((delivery, index) => (
              <Box key={delivery.unitName} sx={{ display: 'grid', gridTemplateColumns: '1.45fr 0.8fr repeat(4, 1fr) 0.65fr', gap: 1, alignItems: 'center' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{delivery.unitName}</Typography>
                <EditSelect label="계약" value={delivery.contracted ? '계약' : '미계약'} options={['계약', '미계약']} onChange={(value) => updateDelivery(index, { contracted: value === '계약' })} />
                <EditTextField label="입고예정" value={delivery.inboundExpected ?? ''} onChange={(value) => updateDelivery(index, { inboundExpected: value })} />
                <EditTextField label="납품계획" value={delivery.deliveryPlan ?? ''} onChange={(value) => updateDelivery(index, { deliveryPlan: value })} />
                <EditTextField label="입고" value={delivery.inboundActual ?? ''} onChange={(value) => updateDelivery(index, { inboundActual: value })} />
                <EditTextField label="납품" value={delivery.deliveredAt ?? ''} onChange={(value) => updateDelivery(index, { deliveredAt: value })} />
                <EditTextField label="수량" value={delivery.quantity} type="number" onChange={(value) => updateDelivery(index, { quantity: Number(value) || 0 })} />
              </Box>
            ))}
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography sx={{ mb: 1.5, fontWeight: 800 }}>정비 / 운영 기준</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 1.25 }}>
            <EditTextField label="납품 우선순위" value={draft.maintenance.priority} type="number" onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, priority: Number(value) || 0 } })} />
            <EditSelect label="운영/서비스성" value={draft.maintenance.serviceable} options={['O', '△', '-']} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, serviceable: value as 'O' | '△' | '-' } })} />
            <EditTextField label="100시간" value={draft.maintenance.hour100} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, hour100: value } })} />
            <EditTextField label="600시간" value={draft.maintenance.hour600} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, hour600: value } })} />
            <EditTextField label="주기검사" value={draft.maintenance.periodicInspection} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, periodicInspection: value } })} />
            <EditSelect label="계획" value={draft.maintenance.planned} options={['O', '-']} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, planned: value as 'O' | '-' } })} />
            <EditSelect label="비계획" value={draft.maintenance.unplanned} options={['O', '-']} onChange={(value) => onChange({ ...draft, maintenance: { ...draft.maintenance, unplanned: value as 'O' | '-' } })} />
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>취소</Button>
        <Button variant="contained" startIcon={<SaveOutlined />} onClick={onSave}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

export function EquipmentMasterPage() {
  const [items, setItems] = useState(() => initialEquipmentMasterItems.map(cloneItem));
  const [mode, setMode] = useState<MasterViewMode>('excel');
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('');
  const [supplier, setSupplier] = useState('');
  const [progress, setProgress] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState('50');
  const [draft, setDraft] = useState<EquipmentMasterItem | null>(null);
  const [page, setPage] = useState(1);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const loadBusinessOptions = useCallback(() => fetchBusinessOptions(), []);
  const businessesQuery = useAsyncQuery({ queryFn: loadBusinessOptions, enabled: realDataMode });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (!realDataMode) return;
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 450);
    return () => window.clearTimeout(timer);
  }, [search]);
  const loadDatabaseMaster = useCallback(() => fetchDatabaseMaster(page, Number(pageSize), debouncedSearch, businessId), [page, pageSize, debouncedSearch, businessId]);
  const dbQuery = useAsyncQuery({ queryFn: loadDatabaseMaster, enabled: realDataMode, keepPreviousData: true });
  const databaseItems = useMemo(() => (dbQuery.data?.items ?? []).map(mapDatabaseItem), [dbQuery.data]);
  const allItems = realDataMode ? databaseItems : items;
  const totalRows = realDataMode ? (dbQuery.data?.totalElements ?? 0) : items.length;
  const unitNames = useMemo(() => realDataMode ? [...new Set(databaseItems.flatMap((item) => item.deliveries.map((d) => d.unitName)))].sort() : masterUnits, [databaseItems]);
  useEffect(() => { setSelectedId(null); }, [page, debouncedSearch, pageSize]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (realDataMode) return true;
      const searchTargets = [item.itemNameKor, item.itemNumber, item.material, item.supplier, item.buyer, item.progress, item.description];
      const matchesQuery = !query || searchTargets.some((value) => value.toLowerCase().includes(query));
      const matchesRisk = !risk || item.risk === risk;
      const matchesSupplier = !supplier || item.supplier === supplier;
      const matchesProgress = !progress || item.progress === progress;
      return matchesQuery && matchesRisk && matchesSupplier && matchesProgress;
    });
  }, [allItems, progress, risk, search, supplier]);

  const visibleItems = realDataMode ? filteredItems : filteredItems.slice((page - 1) * Number(pageSize), page * Number(pageSize));
  const selectedItem = selectedId ? allItems.find((item) => item.id === selectedId) ?? null : null;
  const riskCount = allItems.filter((item) => item.risk === 'Y' || item.risk === 'R').length;
  const manageCount = allItems.filter((item) => item.progressTone === 'warning' || item.progressTone === 'error').length;
  const totalQuantity = allItems.reduce((sum, item) => sum + getTotalQuantity(item), 0);

  const resetFilters = () => { setSearch(''); setRisk(''); setSupplier(''); setProgress(''); setBusinessId(null); setPage(1); };
  const openEditDialog = (item: EquipmentMasterItem) => { if (realDataMode) return; setSelectedId(item.id); setDraft(cloneItem(item)); };
  const saveEditDialog = () => {
    if (!draft) return;
    setItems((current) => current.map((item) => item.id === draft.id ? cloneItem(draft) : item));
    setSelectedId(draft.id);
    setDraft(null);
  };

  return (
    <Box sx={{ display: 'flex', minWidth: 1080, bgcolor: 'background.paper' }}>
      <Box sx={{ flex: 1, minWidth: 0, p: 3, bgcolor: 'background.default' }}>
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
              <MenuItem value="">전체 사업</MenuItem>
              {(businessesQuery.data ?? []).map((business) => <MenuItem key={business.businessId} value={String(business.businessId)}>{business.businessName}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>같은 품번도 사업별로 구분됩니다. 사업 필터는 서버의 전체 목록에 적용돼요.</Typography>
          {businessesQuery.isError && <Button size="small" onClick={businessesQuery.refetch}>사업 목록 다시 조회</Button>}
        </Paper>}
        <FilterBar search={search} setSearch={setSearch} risk={risk} setRisk={setRisk} supplier={supplier} setSupplier={setSupplier} progress={progress} setProgress={setProgress} reset={resetFilters} items={allItems} apiMode={realDataMode} />

        <Paper variant="outlined" sx={{ mb: 1.5, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', gap: 2 }}>
            <Tabs value={mode} onChange={(_, nextMode: MasterViewMode) => setMode(nextMode)} sx={{ minHeight: 38, '& .MuiTab-root': { minHeight: 38 } }}>
              <Tab icon={<TableRowsOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="엑셀 친화형" value="excel" />
              <Tab icon={<ViewModuleOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="업무 최적화형" value="optimized" />
            </Tabs>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>전체 <Box component="span" sx={{ color: 'primary.main' }}>{realDataMode ? totalRows : filteredItems.length}건</Box></Typography>
              <FormControl size="small" sx={{ minWidth: 118 }}><InputLabel>페이지당</InputLabel><Select value={pageSize} label="페이지당" onChange={(event: SelectChangeEvent) => { setPageSize(event.target.value); setPage(1); }}>{['20', '50', '100'].map((value) => <MenuItem key={value} value={value}>{value}개</MenuItem>)}</Select></FormControl>
              <Tooltip title="Mock 프로토타입에서는 컬럼 저장은 동작하지 않습니다."><span><Button variant="outlined" startIcon={<SettingsOutlined />}>컬럼 설정</Button></span></Tooltip>
              <Tooltip title="Mock 프로토타입에서는 실제 파일 다운로드는 후속 범위입니다."><span><Button variant="outlined" startIcon={<DownloadOutlined />}>엑셀 다운로드</Button></span></Tooltip>
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
            {realDataMode && dbQuery.isLoading && !dbQuery.data && <Typography sx={{ p: 2 }}>DB에서 통합현황 조회 중...</Typography>}
            {realDataMode && dbQuery.isError && <Box sx={{ p: 2 }}><Typography color="error">데이터 조회 실패. API 연결과 서버 로그를 확인하세요.</Typography><Button onClick={dbQuery.refetch}>재시도</Button></Box>}
            {(!realDataMode || (!dbQuery.isError && !dbQuery.isLoading)) && (mode === 'excel'
              ? <ExcelFriendlyTable items={visibleItems} unitNames={unitNames} selectedId={selectedId} onSelect={setSelectedId} onEdit={openEditDialog} />
              : <OptimizedTable items={visibleItems} selectedId={selectedId} onSelect={setSelectedId} onEdit={openEditDialog} />)}
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
