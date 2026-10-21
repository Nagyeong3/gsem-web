import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { Box, Button, FormControl, InputAdornment, InputLabel, MenuItem, Paper, Radio, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, type SelectChangeEvent } from '@mui/material';
import { EditOutlined, Refresh, Search } from '@mui/icons-material';
import type { EquipmentMasterItem } from '../../types/equipmentMaster';
import { getDelivery, getTotalQuantity, realDataMode } from './model';
import { EquipmentThumbnail, ProgressChip, RiskBadge, FilterSelect } from './visuals';

const baseHeaderSx = { py: 1, px: 1, fontSize: 11, fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap', borderColor: '#D6DEE8' } as const;

function stickySx(left: number, width: number, header = false, selected = false) {
  return { position: 'sticky', left, width, minWidth: width, maxWidth: width, zIndex: header ? 4 : 2, bgcolor: header ? '#DDF5DA' : selected ? '#EEF5FF' : 'background.paper', boxShadow: '1px 0 0 #D6DEE8' } as const;
}

export function ExcelFriendlyTable({ items, unitNames, selectedId, onSelect, onEdit }: { items: EquipmentMasterItem[]; unitNames: string[]; selectedId: string | null; onSelect: (id: string) => void; onEdit: (item: EquipmentMasterItem) => void }) {
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
    const rows = Array.from(tableRef.current.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    const labels = [col.title, ...rows.map((row) => row.cells.item(index)?.textContent?.trim() ?? '')];
    // Only the currently loaded page can be measured. Remaining server-side pages are not in the DOM.
    const fit = Math.max(...labels.map((label) => context.measureText(label).width)) + 34;
    updateWidth(index, fit);
  };
  const onHeaderPointerMove = (event: ReactPointerEvent<HTMLTableSectionElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const th = target.closest<HTMLTableCellElement>('th[data-resize-index]');
    const nearEdge = !!th && th.getBoundingClientRect().right - event.clientX <= 12;
    if (th) th.style.cursor = nearEdge ? 'col-resize' : 'default';
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
        <TableHead onPointerMoveCapture={onHeaderPointerMove} onPointerDownCapture={onHeaderPointerDown} onDoubleClickCapture={onHeaderDoubleClick}>
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

export function OptimizedTable({ items, selectedId, onSelect, onEdit }: { items: EquipmentMasterItem[]; selectedId: string | null; onSelect: (id: string) => void; onEdit: (item: EquipmentMasterItem) => void }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'auto', height: 860, minHeight: 860, maxHeight: 'none' }}>
      <Table size="small" stickyHeader aria-label="업무 최적화형 지원장비 통합현황" sx={{ minWidth: 1120 }}>
        <TableHead><TableRow>{['', 'RISK', '장비형상', '품명', '사업명', '품번', 'Material', '담당 바이어', '조달원', '진행상태', '계약부대', '총수량', '정비 기준', '수정'].map((header) => <TableCell key={header} sx={{ fontWeight: 800, bgcolor: '#F6F9FC', whiteSpace: 'nowrap' }}>{header}</TableCell>)}</TableRow></TableHead>
        <TableBody>{items.map((item) => { const selected = item.id === selectedId; const contractedUnits = item.deliveries.filter((delivery) => delivery.contracted).length; return <TableRow key={item.id} hover selected={selected} onClick={() => onSelect(item.id)} onDoubleClick={() => onEdit(item)} sx={{ cursor: 'pointer' }}><TableCell padding="checkbox"><Radio checked={selected} size="small" /></TableCell><TableCell><RiskBadge risk={item.risk} /></TableCell><TableCell><EquipmentThumbnail item={item} /></TableCell><TableCell sx={{ fontWeight: 800 }}>{item.itemNameKor}</TableCell><TableCell sx={{ fontWeight: 700 }}>{item.businessName || '-'}</TableCell><TableCell>{item.itemNumber}</TableCell><TableCell>{item.material}</TableCell><TableCell>{item.buyer}</TableCell><TableCell>{item.supplier}</TableCell><TableCell><ProgressChip item={item} /></TableCell><TableCell>{contractedUnits}개 부대</TableCell><TableCell sx={{ fontWeight: 800 }}>{getTotalQuantity(item)}</TableCell><TableCell>{item.maintenance.periodicInspection === '-' ? '일반' : `주기검사 ${item.maintenance.periodicInspection}`}</TableCell><TableCell><Button size="small" disabled={realDataMode} startIcon={<EditOutlined />} onClick={(event) => { event.stopPropagation(); onEdit(item); }}>수정</Button></TableCell></TableRow>; })}</TableBody>
      </Table>
    </TableContainer>
  );
}

export function FilterBar({ search, setSearch, risk, setRisk, supplier, setSupplier, progress, setProgress, reset, items, apiMode }: { search: string; setSearch: (value: string) => void; risk: string; setRisk: (value: string) => void; supplier: string; setSupplier: (value: string) => void; progress: string; setProgress: (value: string) => void; reset: () => void; items: EquipmentMasterItem[]; apiMode: boolean }) {
  const suppliers = Array.from(new Set(items.map((item) => item.supplier)));
  const progresses = Array.from(new Set(items.map((item) => item.progress)));
  return <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}><Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}><TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="품명, 품번, Material, 조달원 검색" sx={{ minWidth: 360, flex: '1 1 360px' }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> } }} />{!apiMode && <FilterSelect label="RISK" value={risk} options={['G', 'Y', 'R']} onChange={setRisk} />}{!apiMode && <FilterSelect label="조달원" value={supplier} options={suppliers} onChange={setSupplier} />}{!apiMode && <FilterSelect label="진행상태" value={progress} options={progresses} onChange={setProgress} />}<Button variant="outlined" startIcon={<Refresh />} onClick={reset}>초기화</Button></Box></Paper>;
}

