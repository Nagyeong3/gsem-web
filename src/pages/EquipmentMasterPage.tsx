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
  Stack,
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
  type SxProps,
  type Theme,
} from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { initialEquipmentMasterItems, masterUnits, progressOptions } from '../data/equipmentMasterMock';
import type { EquipmentMasterItem, MasterViewMode, ProgressTone, RiskLevel, UnitDelivery } from '../types/equipmentMaster';

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
  return (
    <Chip
      label={style.label}
      size="small"
      sx={{
        minWidth: 28,
        height: 28,
        borderRadius: 999,
        bgcolor: style.color,
        color: '#FFFFFF',
        fontWeight: 800,
        '& .MuiChip-label': { px: 0 },
      }}
    />
  );
}

function ProgressChip({ item }: { item: EquipmentMasterItem }) {
  const style = getProgressStyle(item.progressTone);
  return (
    <Chip
      label={item.progress}
      size="small"
      sx={{
        bgcolor: style.bg,
        color: style.color,
        border: `1px solid ${style.color}33`,
        fontWeight: 700,
        maxWidth: 138,
        '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
      }}
    />
  );
}

function EquipmentThumbnail({ item }: { item: EquipmentMasterItem }) {
  const src = equipmentImageDataUrl(item);
  const largeSrc = equipmentImageDataUrl(item, true);
  const alt = `${item.itemNameKor} 장비형상`;
  return (
    <Box className="equipment-master-thumbnail" sx={{ position: 'relative', width: 58, height: 42 }}>
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          width: 58,
          height: 42,
          objectFit: 'cover',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          display: 'block',
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 360,
          height: 220,
          p: 1,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 10,
          border: '1px solid',
          borderColor: 'divider',
          zIndex: 1600,
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 120ms ease',
          '.equipment-master-thumbnail:hover &': { opacity: 1 },
        }}
      >
        <Box component="img" src={largeSrc} alt={alt} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5 }} />
      </Box>
    </Box>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <FormControl size="small" sx={{ minWidth: 154 }}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(event: SelectChangeEvent) => onChange(event.target.value)}>
        <MenuItem value="">전체</MenuItem>
        {options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function SummaryCard({ label, value, helper, tone = '#0F6BFF' }: { label: string; value: string; helper: string; tone?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minHeight: 92 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, color: tone, fontSize: 27, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</Typography>
      <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 11 }}>{helper}</Typography>
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '104px 1fr', gap: 1.5, py: 0.55 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
      <Typography component="div" sx={{ color: 'text.primary', fontSize: 12, fontWeight: 600 }}>{value || '-'}</Typography>
    </Box>
  );
}

function DetailSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Box sx={{ py: 1.6, borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{title}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
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
          <Box component="img" src={equipmentImageDataUrl(item, true)} alt={`${item.itemNameKor} 장비형상`} sx={{ width: '100%', height: 168, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }} />
          <Stack spacing={1}>{[0, 1, 2].map((index) => <Box key={index} component="img" src={equipmentImageDataUrl(item)} alt={`${item.itemNameKor} 썸네일 ${index + 1}`} sx={{ width: 54, height: 50, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: index === 0 ? 'primary.main' : 'divider' }} />)}</Stack>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.75 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>{item.itemNameKor}</Typography>
          <Chip label={item.risk === 'R' ? 'Risk' : item.risk === 'Y' ? '주의' : '정상'} size="small" color={item.risk === 'R' ? 'error' : item.risk === 'Y' ? 'warning' : 'success'} variant="outlined" />
        </Box>
        <Typography sx={{ mt: 0.2, color: 'text.secondary', fontSize: 13 }}>{item.itemNumber}</Typography>
        <Button fullWidth variant="contained" startIcon={<EditOutlined />} sx={{ mt: 1.5 }} onClick={() => onEdit(item)}>이 품목 수정</Button>

        <DetailSection title="기본정보">
          <DetailRow label="품명" value={item.itemNameKor} />
          <DetailRow label="품번" value={item.itemNumber} />
          <DetailRow label="Material" value={item.material} />
          <DetailRow label="담당 바이어" value={item.buyer} />
          <DetailRow label="조달원" value={item.supplier} />
          <DetailRow label="진행 상태" value={<ProgressChip item={item} />} />
          <DetailRow label="TDT CODE" value={item.tdtCode} />
        </DetailSection>

        <DetailSection title="부대별 납품현황" action={<Button size="small" onClick={() => onEdit(item)}>수정</Button>}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, maxHeight: 212 }}>
            <Table size="small" stickyHeader aria-label="부대별 납품현황">
              <TableHead><TableRow>{['부대명', '계약', '입고예정', '납품계획', '수량'].map((header) => <TableCell key={header} sx={{ fontSize: 11, fontWeight: 800 }}>{header}</TableCell>)}</TableRow></TableHead>
              <TableBody>{item.deliveries.map((delivery) => <TableRow key={delivery.unitName}><TableCell sx={{ fontSize: 11, fontWeight: 700 }}>{delivery.unitName.replace('(파견중대 포함)', '')}</TableCell><TableCell>{delivery.contracted ? '●' : '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{delivery.inboundExpected || '-'}</TableCell><TableCell sx={{ fontSize: 11 }}>{delivery.deliveryPlan || '-'}</TableCell><TableCell align="right" sx={{ fontSize: 11, fontWeight: 800 }}>{delivery.quantity}</TableCell></TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </DetailSection>

        <DetailSection title="정비 / 운영 정보">
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            <InfoTile label="납품 우선순위" value={`${item.maintenance.priority}순위`} />
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

const baseHeaderSx: SxProps<Theme> = { py: 1, px: 1, fontSize: 11, fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap', borderColor: '#D6DEE8' };

function stickySx(left: number, width: number, header = false, selected = false): SxProps<Theme> {
  return { position: 'sticky', left, width, minWidth: width, maxWidth: width, zIndex: header ? 4 : 2, bgcolor: header ? '#DDF5DA' : selected ? '#EEF5FF' : 'background.paper', boxShadow: '1px 0 0 #D6DEE8' };
}

function ExcelFriendlyTable({ items, selectedId, onSelect, onEdit }: { items: EquipmentMasterItem[]; selectedId: string | null; onSelect: (id: string) => void; onEdit: (item: EquipmentMasterItem) => void }) {
  return (
    <TableContainer sx={{ maxHeight: 'calc(100vh - 355px)', overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
      <Table size="small" stickyHeader aria-label="엑셀 친화형 지원장비 통합현황" sx={{ minWidth: 2380, '& th, & td': { borderColor: '#D6DEE8' } }}>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(0, 46, true) }}>번호</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(46, 50, true) }}>RISK</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(96, 140, true), textAlign: 'left' }}>품명(국문)</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(236, 108, true), textAlign: 'left' }}>품번</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, ...stickySx(344, 122, true), textAlign: 'left' }}>Material</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 96, bgcolor: '#DDF5DA' }}>담당<br />바이어</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 112, bgcolor: '#DDF5DA' }}>조달원</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 146, bgcolor: '#DDF5DA' }}>진행 상세현황</TableCell>
            {masterUnits.map((unit, index) => <TableCell key={unit} colSpan={6} sx={{ ...baseHeaderSx, bgcolor: index === 2 ? '#D9ECFF' : index === 3 ? '#FFF6D8' : '#FFE7A3', fontSize: 12 }}>{unit}</TableCell>)}
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 74, bgcolor: '#FFF1B8' }}>납품<br />우선<br />순위<br />(주)</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 98, bgcolor: '#DDF5DA' }}>운영/<br />지상취급/<br />서비스성</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 72, bgcolor: '#D9ECFF' }}>100<br />시간</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 72, bgcolor: '#D9ECFF' }}>600<br />시간</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 96, bgcolor: '#D9ECFF' }}>주기검사<br />(400시간이내)</TableCell>
            <TableCell colSpan={2} sx={{ ...baseHeaderSx, bgcolor: '#D9ECFF' }}>비계획</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 92, bgcolor: '#DDF5DA' }}>장비형상</TableCell>
            <TableCell rowSpan={2} sx={{ ...baseHeaderSx, minWidth: 360, bgcolor: '#DDF5DA' }}>장비설명</TableCell>
          </TableRow>
          <TableRow>{masterUnits.flatMap((unit) => ['계약', '입고예정', '납품계획', '입고', '납품', '수량'].map((label) => <TableCell key={`${unit}-${label}`} sx={{ ...baseHeaderSx, minWidth: label === '수량' ? 52 : 72, bgcolor: '#FFF9E8' }}>{label}</TableCell>))}<TableCell sx={{ ...baseHeaderSx, minWidth: 72, bgcolor: '#EAF3FF' }}>계획</TableCell><TableCell sx={{ ...baseHeaderSx, minWidth: 72, bgcolor: '#EAF3FF' }}>비계획</TableCell></TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => {
            const selected = item.id === selectedId;
            const rowBg = selected ? '#EEF5FF' : index % 2 ? '#FBFCFE' : '#FFFFFF';
            return (
              <TableRow key={item.id} hover selected={selected} onClick={() => onSelect(item.id)} onDoubleClick={() => onEdit(item)} sx={{ cursor: 'pointer', '&.Mui-selected td': { bgcolor: '#EEF5FF' } }}>
                <TableCell align="center" sx={{ ...stickySx(0, 46, false, selected), bgcolor: rowBg }}>{index + 1}</TableCell>
                <TableCell align="center" sx={{ ...stickySx(46, 50, false, selected), bgcolor: rowBg }}><RiskBadge risk={item.risk} /></TableCell>
                <TableCell sx={{ ...stickySx(96, 140, false, selected), bgcolor: rowBg, fontWeight: 700 }}>{item.itemNameKor}</TableCell>
                <TableCell sx={{ ...stickySx(236, 108, false, selected), bgcolor: rowBg }}>{item.itemNumber}</TableCell>
                <TableCell sx={{ ...stickySx(344, 122, false, selected), bgcolor: rowBg }}>{item.material}</TableCell>
                <TableCell sx={{ minWidth: 96 }}>{item.buyer}</TableCell>
                <TableCell sx={{ minWidth: 112 }}>{item.supplier}</TableCell>
                <TableCell sx={{ minWidth: 146 }}><ProgressChip item={item} /></TableCell>
                {masterUnits.flatMap((unit) => {
                  const delivery = getDelivery(item, unit);
                  return [<TableCell key={`${item.id}-${unit}-contract`} align="center">{delivery?.contracted ? '●' : '-'}</TableCell>, <TableCell key={`${item.id}-${unit}-inboundExpected`} align="center">{delivery?.inboundExpected || '-'}</TableCell>, <TableCell key={`${item.id}-${unit}-deliveryPlan`} align="center">{delivery?.deliveryPlan || '-'}</TableCell>, <TableCell key={`${item.id}-${unit}-inboundActual`} align="center">{delivery?.inboundActual || '-'}</TableCell>, <TableCell key={`${item.id}-${unit}-deliveredAt`} align="center">{delivery?.deliveredAt || '-'}</TableCell>, <TableCell key={`${item.id}-${unit}-quantity`} align="right" sx={{ fontWeight: 700 }}>{delivery?.quantity || '-'}</TableCell>];
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
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'auto', maxHeight: 'calc(100vh - 395px)' }}>
      <Table size="small" stickyHeader aria-label="업무 최적화형 지원장비 통합현황" sx={{ minWidth: 1120 }}>
        <TableHead><TableRow>{['', 'RISK', '장비형상', '품명', '품번', 'Material', '담당 바이어', '조달원', '진행상태', '계약부대', '총수량', '정비 기준', '수정'].map((header) => <TableCell key={header} sx={{ fontWeight: 800, bgcolor: '#F6F9FC', whiteSpace: 'nowrap' }}>{header}</TableCell>)}</TableRow></TableHead>
        <TableBody>{items.map((item) => { const selected = item.id === selectedId; const contractedUnits = item.deliveries.filter((delivery) => delivery.contracted).length; return <TableRow key={item.id} hover selected={selected} onClick={() => onSelect(item.id)} onDoubleClick={() => onEdit(item)} sx={{ cursor: 'pointer' }}><TableCell padding="checkbox"><Radio checked={selected} size="small" /></TableCell><TableCell><RiskBadge risk={item.risk} /></TableCell><TableCell><EquipmentThumbnail item={item} /></TableCell><TableCell sx={{ fontWeight: 800 }}>{item.itemNameKor}</TableCell><TableCell>{item.itemNumber}</TableCell><TableCell>{item.material}</TableCell><TableCell>{item.buyer}</TableCell><TableCell>{item.supplier}</TableCell><TableCell><ProgressChip item={item} /></TableCell><TableCell>{contractedUnits}개 부대</TableCell><TableCell sx={{ fontWeight: 800 }}>{getTotalQuantity(item)}</TableCell><TableCell>{item.maintenance.periodicInspection === '-' ? '일반' : `주기검사 ${item.maintenance.periodicInspection}`}</TableCell><TableCell><Button size="small" startIcon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); onEdit(item); }}>수정</Button></TableCell></TableRow>; })}</TableBody>
      </Table>
    </TableContainer>
  );
}

function FilterBar({ search, setSearch, risk, setRisk, supplier, setSupplier, progress, setProgress, reset, items }: { search: string; setSearch: (value: string) => void; risk: string; setRisk: (value: string) => void; supplier: string; setSupplier: (value: string) => void; progress: string; setProgress: (value: string) => void; reset: () => void; items: EquipmentMasterItem[] }) {
  const suppliers = Array.from(new Set(items.map((item) => item.supplier)));
  const progresses = Array.from(new Set(items.map((item) => item.progress)));
  return <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}><Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}><TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="품명, 품번, Material, 조달원 검색" sx={{ minWidth: 360, flex: '1 1 360px' }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> } }} /><FilterSelect label="RISK" value={risk} options={['G', 'Y', 'R']} onChange={setRisk} /><FilterSelect label="조달원" value={supplier} options={suppliers} onChange={setSupplier} /><FilterSelect label="진행상태" value={progress} options={progresses} onChange={setProgress} /><Button variant="outlined" startIcon={<Refresh />} onClick={reset}>초기화</Button></Box></Paper>;
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
          <Stack spacing={1.25} divider={<Divider flexItem />}>
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
          </Stack>
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
  const [pageSize, setPageSize] = useState('10');
  const [draft, setDraft] = useState<EquipmentMasterItem | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const searchTargets = [item.itemNameKor, item.itemNumber, item.material, item.supplier, item.buyer, item.progress, item.description];
      const matchesQuery = !query || searchTargets.some((value) => value.toLowerCase().includes(query));
      const matchesRisk = !risk || item.risk === risk;
      const matchesSupplier = !supplier || item.supplier === supplier;
      const matchesProgress = !progress || item.progress === progress;
      return matchesQuery && matchesRisk && matchesSupplier && matchesProgress;
    });
  }, [items, progress, risk, search, supplier]);

  const visibleItems = filteredItems.slice(0, Number(pageSize));
  const selectedItem = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;
  const riskCount = items.filter((item) => item.risk !== 'G').length;
  const manageCount = items.filter((item) => item.progressTone === 'warning' || item.progressTone === 'error').length;
  const totalQuantity = items.reduce((sum, item) => sum + getTotalQuantity(item), 0);

  const resetFilters = () => { setSearch(''); setRisk(''); setSupplier(''); setProgress(''); };
  const openEditDialog = (item: EquipmentMasterItem) => { setSelectedId(item.id); setDraft(cloneItem(item)); };
  const saveEditDialog = () => { if (!draft) return; setItems((current) => current.map((item) => item.id === draft.id ? cloneItem(draft) : item)); setSelectedId(draft.id); setDraft(null); };

  return (
    <Box sx={{ display: 'flex', minWidth: 1080, bgcolor: 'background.paper' }}>
      <Box sx={{ flex: 1, minWidth: 0, p: 3, bgcolor: 'background.default' }}>
        <PageHeader title="지원장비 통합현황" description="엑셀 마스터 파일의 업무 구조를 기준으로 지원장비 조달·계약·납품 현황을 Mock 데이터로 확인합니다." />

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 1.5, mb: 2 }}>
          <SummaryCard label="전체 품목" value={`${items.length}건`} helper="Mock 마스터 기준" />
          <SummaryCard label="확인 필요" value={`${riskCount}건`} helper="RISK Y/R 품목" tone="#F04438" />
          <SummaryCard label="진행 관리" value={`${manageCount}건`} helper="조립·수급·납품 준비" tone="#F97316" />
          <SummaryCard label="총 납품 수량" value={`${totalQuantity}개`} helper="부대별 수량 합산" tone="#079455" />
        </Box>

        <FilterBar search={search} setSearch={setSearch} risk={risk} setRisk={setRisk} supplier={supplier} setSupplier={setSupplier} progress={progress} setProgress={setProgress} reset={resetFilters} items={items} />

        <Paper variant="outlined" sx={{ mb: 1.5, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', gap: 2 }}>
            <Tabs value={mode} onChange={(_, nextMode: MasterViewMode) => setMode(nextMode)} sx={{ minHeight: 38, '& .MuiTab-root': { minHeight: 38 } }}>
              <Tab icon={<TableRowsOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="엑셀 친화형" value="excel" />
              <Tab icon={<ViewModuleOutlined sx={{ fontSize: 18 }} />} iconPosition="start" label="업무 최적화형" value="optimized" />
            </Tabs>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>전체 <Box component="span" sx={{ color: 'primary.main' }}>{filteredItems.length}건</Box></Typography>
              <FormControl size="small" sx={{ minWidth: 118 }}><InputLabel>페이지당</InputLabel><Select value={pageSize} label="페이지당" onChange={(event: SelectChangeEvent) => setPageSize(event.target.value)}>{['10', '20', '50'].map((value) => <MenuItem key={value} value={value}>{value}개</MenuItem>)}</Select></FormControl>
              <Tooltip title="Mock 프로토타입에서는 컬럼 저장은 동작하지 않습니다."><span><Button variant="outlined" startIcon={<SettingsOutlined />}>컬럼 설정</Button></span></Tooltip>
              <Tooltip title="Mock 프로토타입에서는 실제 파일 다운로드는 후속 범위입니다."><span><Button variant="outlined" startIcon={<DownloadOutlined />}>엑셀 다운로드</Button></span></Tooltip>
            </Stack>
          </Box>
          <Box sx={{ px: 1.5, py: 1, bgcolor: '#FBFCFE', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{mode === 'excel' ? '엑셀 사용자 적응을 위해 부대별 반복 컬럼과 장비형상/정비 컬럼을 최대한 유지한 화면입니다. 행 더블클릭 또는 상세 패널의 수정 버튼으로 편집합니다.' : '같은 데이터를 업무 판단 중심으로 압축하고, 행 선택 시 상세 패널에서 부대별 현황을 확인하는 화면입니다.'}</Typography>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {mode === 'excel' ? <ExcelFriendlyTable items={visibleItems} selectedId={selectedId} onSelect={setSelectedId} onEdit={openEditDialog} /> : <OptimizedTable items={visibleItems} selectedId={selectedId} onSelect={setSelectedId} onEdit={openEditDialog} />}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>1 - {visibleItems.length} / {filteredItems.length}건</Typography>
              <Pagination page={1} count={Math.max(1, Math.ceil(filteredItems.length / Number(pageSize)))} color="primary" shape="rounded" />
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Mock 데이터 · 새로고침 시 편집값 초기화</Typography>
            </Box>
          </Box>
          {selectedItem && <Box sx={{ ml: 2 }}><DetailPanel item={selectedItem} onClose={() => setSelectedId(null)} onEdit={openEditDialog} /></Box>}
        </Box>
      </Box>
      <EditDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={saveEditDialog} />
    </Box>
  );
}
