import { Fragment, lazy, Suspense, memo, useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type ComponentType } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox, FormControlLabel, Select, MenuItem, Snackbar, Popover,
} from '@mui/material';
import type { AutocompleteRenderValueGetItemProps } from '@mui/material/Autocomplete';
import { RefreshOutlined, ImageNotSupportedOutlined, CloseOutlined, ZoomInOutlined, EditOutlined } from '@mui/icons-material';
import { sortTableRows, toggleTableSort, type TableSort } from '../utils/sortTableRows';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { SearchableMultiTextFilter } from '../components/common/SearchableMultiTextFilter';
import { appendTextSearchParams, isTextSearchTerms, matchesTextSearch, migrateTextSearchTerms, type TextSearchTerm } from '../utils/textSearchTerms';
import { ScheduleChangeDialog, type ScheduleChangeDetails } from '../components/receiving/ScheduleChangeDialog';
import { isCalendarDate } from '../features/delivery-calendar/calendarPreview';
import { preferenceKey, usePagePreference } from '../features/preferences/pagePreferences';
import { runtimeConfig } from '../config/runtime';
import { fetchBusinessOptions, type DbBusiness } from '../features/equipment-master/model';
import { aggregateDemoLines, mockBusinesses, mockRoundItems, mockRounds } from '../data/deliveryRoundMock';

import type { EmbeddedEquipmentDetailProps } from './EquipmentDetailPage';

const EmbeddedEquipmentDetail = lazy<ComponentType<EmbeddedEquipmentDetailProps>>(() =>
  import('./EquipmentDetailPage').then(module => ({ default: module.EmbeddedEquipmentDetail })),
);

type Round = {
  subContractId: number; businessId: number; businessName: string;
  destination: string | null; subContractName: string | null; deliveryDate: string | null;
  itemCount: number; pointCount: number; prCount: number; poCount: number;
  receivedCount: number; deliveredCount: number; deliveryCompleted: boolean;
  deliveryAmount: number; deliveredQuantity?: number; latestDeliveredAt?: string | null;
};
type RoundItem = {
  matchId: number; itemId: number; itemNumber: string; itemName: string | null;
  quantity: number | null; receivingExpected: string | null; receivedAt: string | null;
  deliveredAt: string | null; vendorName: string | null; buyerName: string | null;
  contractPrice?: number | null; purchaseRequestNumber?: string | null; purchaseOrderNumber?: string | null;
};
type LoadState<T> = { loading: boolean; data?: T; error?: string };
type FilterOptions = { vendors: string[]; destinations: string[]; itemNames?: string[]; itemNumbers?: string[] };
const date = (value: string | null) => value?.slice(0, 10) || '-';
const number = (value: number | null | undefined) => value == null ? '-' : value.toLocaleString('ko-KR');
function matchesItem(item: RoundItem, itemName: TextSearchTerm[], itemNumber: TextSearchTerm[], vendors: string[]): boolean {
  return matchesTextSearch(item.itemName, itemName)
    && matchesTextSearch(item.itemNumber, itemNumber)
    && (vendors.length === 0 || vendors.includes((item.vendorName ?? '').trim()));
}

type DeliveryIndicator = 'complete' | 'due-soon' | 'incomplete';
type StatusFilter = DeliveryIndicator;
const statusChoices: Array<{ value: StatusFilter; label: string; color: string }> = [
  { value: 'complete', label: '완료', color: '#16A34A' },
  { value: 'incomplete', label: '미완료', color: '#EAB308' },
  { value: 'due-soon', label: '납기 임박/경과', color: '#DC2626' },
];

/**
 * Only an incomplete delivery within 7 calendar days before its contractual due
 * date (or already overdue) is critical. Compare calendar days, not timestamps.
 */
function getDeliveryIndicator(round: Pick<Round, 'deliveryCompleted' | 'deliveryDate'>, today = new Date()): DeliveryIndicator {
  if (round.deliveryCompleted) return 'complete';
  if (!round.deliveryDate) return 'incomplete';
  const datePart = round.deliveryDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return 'incomplete';
  const [year, month, day] = datePart.split('-').map(Number);
  const due = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysRemaining = Math.round((due - todayUtc) / 86_400_000);
  return daysRemaining <= 7 ? 'due-soon' : 'incomplete';
}

const indicatorInfo: Record<DeliveryIndicator, { label: string; color: string }> = {
  complete: { label: '납품완료', color: '#16A34A' },
  incomplete: { label: '납품미완료', color: '#EAB308' },
  'due-soon': { label: '납품미완료 · 납기 7일 이내 또는 경과', color: '#DC2626' },
};

function DeliveryStatusDot({ round }: { round: Round }) {
  const status = indicatorInfo[getDeliveryIndicator(round)];
  return (
    <Box component="span" role="img" aria-label={status.label} title={status.label}
      sx={{ display: 'inline-block', width: 13, height: 13, borderRadius: '50%',
        bgcolor: status.color, verticalAlign: 'middle', boxShadow: '0 0 0 1px rgba(0,0,0,0.12)' }} />
  );
}



function demoImageUrl(itemId: number): string {
  const hue = (itemId * 41 + 160) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="320" viewBox="0 0 400 320">
    <rect width="400" height="320" rx="18" fill="#eef2f6"/>
    <rect x="82" y="75" width="236" height="162" rx="16" fill="hsl(${hue},22%,35%)"/>
    <rect x="103" y="97" width="194" height="92" rx="7" fill="#dce8ed"/>
    <rect x="115" y="109" width="168" height="66" rx="5" fill="#a1bcc8"/>
    <circle cx="132" cy="209" r="9" fill="#8ee0ac"/>
    <circle cx="163" cy="209" r="9" fill="#f4bb75"/>
    <rect x="222" y="201" width="59" height="15" rx="5" fill="#748899"/>
    <path d="M150 74 V53 Q150 43 160 43 H240 Q250 43 250 53 V74" stroke="#647789" stroke-width="13" fill="none"/>
    <rect x="112" y="238" width="30" height="16" rx="4" fill="#3f5365"/>
    <rect x="259" y="238" width="30" height="16" rx="4" fill="#3f5365"/>
    <text x="200" y="289" text-anchor="middle" font-family="Arial" font-size="16" fill="#475569">DEMO-${String(itemId).padStart(3, '0')}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const EquipmentImageThumbnail = memo(function EquipmentImageThumbnail({
  item, onExpand,
}: { item: RoundItem; onExpand: (item: RoundItem, url: string) => void }) {
  const url = runtimeConfig.dataSource === 'api'
    ? `${runtimeConfig.apiBaseUrl}/equipment-master/image/${item.itemId}`
    : demoImageUrl(item.itemId);
  const [failed, setFailed] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  if (failed) {
    return <Box aria-label={`${item.itemNumber} 이미지 없음`} sx={{ width: 52, height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover',
      borderRadius: 1, color: 'text.disabled' }}><ImageNotSupportedOutlined fontSize="small" /></Box>;
  }
  return (
    <Tooltip placement="right" arrow enterDelay={250} enterTouchDelay={0}
      open={hoverOpen} onOpen={() => setHoverOpen(true)} onClose={() => setHoverOpen(false)}
      slotProps={{
        tooltip: { sx: { bgcolor: 'background.paper', color: 'text.primary', p: 1,
          border: '1px solid', borderColor: 'divider', boxShadow: 3, maxWidth: 296 } },
        arrow: { sx: { color: 'background.paper' } },
        transition: { timeout: 0 },
      }}
      title={<Box component="img" src={url} alt={item.itemName || item.itemNumber}
        sx={{ display: 'block', width: 270, maxHeight: 240, objectFit: 'contain', bgcolor: 'background.paper' }} />}>
      <IconButton aria-label={`${item.itemNumber} 이미지 확대`} onClick={() => { setHoverOpen(false); onExpand(item, url); }}
        sx={{ p: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider',
          position: 'relative', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}>
        <Box component="img" src={url} loading="lazy" onError={() => setFailed(true)}
          alt={`${item.itemNumber} 장비 이미지`}
          sx={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 0.5 }} />
        <ZoomInOutlined sx={{ position: 'absolute', right: 1, bottom: 1, fontSize: 16,
          bgcolor: 'background.paper', borderRadius: 0.5 }} />
      </IconButton>
    </Tooltip>
  );
});

/** Keep all selected labels that actually fit; collapse only the remaining labels to +N. */
function AdaptiveTags({ labels, itemKeys = labels, getItemProps }: {
  labels: readonly string[];
  itemKeys?: readonly (string | number)[];
  getItemProps: AutocompleteRenderValueGetItemProps<true>;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(200);
  useEffect(() => {
    const root = anchor.current?.closest('.MuiAutocomplete-root');
    if (!root) return;
    const updateWidth = () => setWidth(Math.max(0, root.getBoundingClientRect().width - 88));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  const tagWidth = (label: string) => 31 + [...label].reduce((total, char) =>
    total + (/[가-힣]/.test(char) ? 12 : /[A-Z0-9]/.test(char) ? 8 : 7), 0);
  const total = labels.reduce((sum, label) => sum + tagWidth(label) + 5, 0);
  let visibleCount = labels.length;
  if (total > width) {
    visibleCount = 0;
    let used = 44; // Reserve space for a +N chip.
    for (const label of labels) {
      const required = tagWidth(label) + 5;
      if (used + required > width) break;
      used += required;
      visibleCount += 1;
    }
  }
  return <Box component="span" ref={anchor} sx={{ display: 'inline-flex', alignItems: 'center',
    gap: 0.5, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
    {labels.slice(0, visibleCount).map((label, index) => {
      const { key, ...itemProps } = getItemProps({ index });
      return <Chip key={itemKeys[index] ?? key} size="small" label={label} {...itemProps} />;
    })}
    {visibleCount < labels.length && <Chip size="small" label={`+${labels.length - visibleCount}`}
      aria-label={`추가 선택 ${labels.length - visibleCount}개`} />}
  </Box>;
}

/** Expanded item tables own their vertical and horizontal scrollbars; the column header sticks to the top. */
function ItemTableScroller({ children }: { children: (width: number) => ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  useLayoutEffect(() => {
    const target = scroller.current;
    if (!target) return;
    const update = () => setViewportWidth(target.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(target);
    update();
    return () => observer.disconnect();
  }, []);
  return <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
    <TableContainer ref={scroller} role="region" tabIndex={0} aria-label="아이템 테이블 가로 및 세로 스크롤"
      sx={{ width: '100%', maxWidth: '100%', maxHeight: 450,
        overflowX: 'auto', overflowY: 'auto', overscrollBehavior: 'contain',
        bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1,
        '& .MuiTableCell-stickyHeader': { position: 'sticky', top: 0, zIndex: 3, bgcolor: 'background.paper',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.16)' },
        '&::-webkit-scrollbar': { height: 10, width: 9 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'text.disabled', borderRadius: 2 } }}>
      {children(viewportWidth)}
    </TableContainer>
  </Box>;
}

/** Resize a single column by dragging its right edge; keyboard arrows also work. */
function ResizeHeader({ label, width, setWidth, align = 'left', children, sticky = false, sortDirection, onSort }: {
  label: string; width: number; setWidth: (next: number) => void; align?: 'left'|'right'|'center';
  children?: ReactNode; sticky?: boolean; sortDirection?: TableSort['direction']; onSort?: () => void;
}) {
  // Each gesture uses the initial rendered width; never accumulate deltas on re-render.
  const drag = useRef<{ x: number; width: number; apply: (next: number) => void } | null>(null);
  const startResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    drag.current = { x: event.clientX, width, apply: setWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveResize = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const start = drag.current;
    if (!start) return;
    const delta = Math.round((event.clientX - start.x) / 4) * 4;
    if (delta === 0 && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    start.apply(Math.min(900, Math.max(58, Math.round(start.width + delta))));
  };
  const stopResize = () => { drag.current = null; };
  const autoFit = (event: ReactMouseEvent<HTMLSpanElement>) => {
    event.preventDefault(); event.stopPropagation();
    const header = event.currentTarget.closest('th');
    const table = header?.closest('table');
    if (!header || !table) return;
    const index = Array.from(header.parentElement?.children ?? []).indexOf(header);
    if (index < 0) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    const cells = Array.from(table.querySelectorAll('tr')).filter(row => row.closest('table') === table).map(row => row.children[index]).filter(cell => cell && cell.getAttribute('colspan') === null);
    const required = Math.max(58, ...cells.map((cell) => {
      const element = cell as HTMLElement;
      const style = window.getComputedStyle(element);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const value = element.textContent?.trim() ?? '';
      return Math.ceil(context.measureText(value).width + 38);
    }));
    setWidth(Math.min(900, required));
  };
  return <TableCell align={align} aria-label={label} sortDirection={sortDirection || false} sx={{ position: sticky ? 'sticky' : 'relative', top: sticky ? 0 : undefined,
    zIndex: sticky ? 3 : undefined, bgcolor: sticky ? 'background.paper' : undefined,
    width, minWidth: width, maxWidth: width,
    fontWeight: 800, boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    borderRight: '1px solid', borderRightColor: 'divider' }}>
    <Box component="span" title={label}>{onSort
      ? <TableSortLabel active={!!sortDirection} direction={sortDirection ?? 'asc'} hideSortIcon={false} onClick={onSort}
          sx={{ flexDirection: 'row', maxWidth: '100%', '& .MuiTableSortLabel-icon': { fontSize: 15, mx: 0.25, opacity: sortDirection ? 1 : 0.35 } }}>
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Box>
        </TableSortLabel>
      : children ?? label}</Box>
    <Box component="span" role="separator" tabIndex={0} aria-label={`${label} 열 너비 조절`}
      aria-orientation="vertical" aria-valuemin={58} aria-valuenow={width} aria-valuemax={900}
      onPointerDown={startResize}
      onPointerMove={moveResize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize}
      onDoubleClick={autoFit}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); event.stopPropagation();
          setWidth(Math.min(900, Math.max(58, width + (event.key === 'ArrowRight' ? 16 : -16))));
        }
      }}
      sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10,
        cursor: 'col-resize', touchAction: 'none', zIndex: 2,
        borderRight: '1px solid', borderRightColor: 'divider',
        '&:hover, &:focus-visible': { bgcolor: 'action.selected', borderRightWidth: 2, borderColor: 'primary.main', outline: 'none' } }} />
  </TableCell>;
}

const isIdList = (value: unknown): value is number[] => Array.isArray(value) && value.every(x => Number.isSafeInteger(x) && x > 0);
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every(x => typeof x === 'string');
const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isWidths = (value: unknown, length: number): value is number[] => Array.isArray(value) && value.length === length && value.every(x => typeof x === 'number' && Number.isFinite(x) && x >= 58 && x <= 900);

const masterColumns = [
  { key: 'businessName', label: '사업명', width: 150 }, { key: 'destination', label: '납품 부대', width: 125 },
  { key: 'subContractName', label: '납품 차수', width: 110 }, { key: 'deliveryDate', label: '납품 예정일', width: 230 },
  { key: 'itemCount', label: '종', width: 70 }, { key: 'pointCount', label: '점', width: 70 }, { key: 'prCount', label: 'PR', width: 75 },
  { key: 'poCount', label: 'PO', width: 75 }, { key: 'receivedCount', label: '입고', width: 85 },
  { key: 'deliveredQuantity', label: '납품수량', width: 112 }, { key: 'latestDeliveredAt', label: '납품일', width: 125 },
  { key: 'deliveryCompleted', label: '납품완료', width: 105 }, { key: 'deliveryAmount', label: '납품금액 (원)', width: 150 },
] as const;

const detailColumns = [
  { key: null, label: '선택', width: 58 }, { key: null, label: '이미지', width: 68 }, { key: 'itemNumber', label: '품번', width: 98 },
  { key: 'itemName', label: '품명', width: 150 }, { key: 'quantity', label: '수량', width: 58 }, { key: 'vendorName', label: '조달원', width: 90 },
  { key: 'purchaseRequestNumber', label: 'PR', width: 68 }, { key: 'purchaseOrderNumber', label: 'PO', width: 68 }, { key: 'buyerName', label: '바이어', width: 76 },
  { key: 'receivingExpected', label: '입고 예정', width: 120 }, { key: 'receivedAt', label: '입고일', width: 100 },
  { key: 'deliveredAt', label: '납품일', width: 100 }, { key: 'contractPrice', label: '계약 가격', width: 100 },
] as const;
const legacyDetailWidths = [62, 78, 138, 180, 80, 135, 130, 130, 110, 177, 125, 177, 140];
const itemGrowWeights = [0, 0, 2, 4, 0, 2, 0, 0, 1, 1, 0, 0, 1];
function layoutItemWidths(widths: number[], available: number): number[] {
  const current = widths.reduce((sum, width) => sum + width, 0);
  const free = Math.max(0, available - current);
  const totalWeight = itemGrowWeights.reduce((sum, weight) => sum + weight, 0);
  return widths.map((width, index) => width + free * itemGrowWeights[index] / totalWeight);
}

function loadString(key: string) {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function loadIds(): number[] {
  try {
    const value: unknown = JSON.parse(loadString('gsem.deliveryRound.businessIds.v1') || '[]');
    return Array.isArray(value) ? value.filter((id): id is number => Number.isSafeInteger(id) && id > 0) : [];
  } catch { return []; }
}
function loadStringList(key: string, legacyKey: string): string[] {
  const raw = loadString(key);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    } catch { /* Ignore an invalid saved value. */ }
  }
  const previous = loadString(legacyKey);
  return previous ? [previous] : [];
}
function loadLegacySearch(name: string): TextSearchTerm[] {
  try { return migrateTextSearchTerms(JSON.parse(loadString(preferenceKey('equipment-overview', name)) || 'null')); }
  catch { return []; }
}
async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${path.split('?')[0]}`);
  return await response.json() as T;
}

export function DeliveryRoundMasterPage() {
  const location = useLocation();
  const focusRoundId = Number(new URLSearchParams(location.search).get('roundId')) || 0;
  const focusBusinessId = Number(new URLSearchParams(location.search).get('businessId')) || 0;
  const [dismissedFocus, setDismissedFocus] = useState('');
  const focusKey = `${location.key}:${focusRoundId}`;
  const focused = focusRoundId > 0 && dismissedFocus !== focusKey;

  const [businesses, setBusinesses] = useState<DbBusiness[]>(() => runtimeConfig.dataSource === 'api' ? [] : mockBusinesses);
  const [selectedIds, setSelectedIds] = usePagePreference<number[]>('equipment-overview', 'businessIds', loadIds, isIdList);
  const [aircraftScope, setAircraftScope] = usePagePreference<'all' | 'rotary' | 'fixed'>('equipment-overview', 'aircraftScope', 'all', (v): v is 'all'|'rotary'|'fixed' => v === 'all' || v === 'rotary' || v === 'fixed');
  const [vendors, setVendors] = usePagePreference<string[]>('equipment-overview', 'vendors', () => loadStringList('gsem.deliveryRound.vendors.v2', 'gsem.deliveryRound.vendor.v1'), isStringList);
  const [destinations, setDestinations] = usePagePreference<string[]>('equipment-overview', 'destinations', () => loadStringList('gsem.deliveryRound.destinations.v2', 'gsem.deliveryRound.destination.v1'), isStringList);
  const [statusFilters, setStatusFilters] = usePagePreference<StatusFilter[]>('equipment-overview', 'statuses', () => {
    const saved = loadStringList('gsem.deliveryRound.statuses.v2', 'gsem.deliveryRound.status.v1');
    return saved.filter((value): value is StatusFilter =>
      value === 'complete' || value === 'incomplete' || value === 'due-soon');
  }, (v): v is StatusFilter[] => Array.isArray(v) && v.every(x => x === 'complete' || x === 'incomplete' || x === 'due-soon'));
  const [itemNameFilter, setItemNameFilter] = usePagePreference<TextSearchTerm[]>('equipment-overview', 'itemNames', () => loadLegacySearch('itemName'), isTextSearchTerms);
  const [itemNumberFilter, setItemNumberFilter] = usePagePreference<TextSearchTerm[]>('equipment-overview', 'itemNumbers', () => loadLegacySearch('itemNumber'), isTextSearchTerms);
  const [hideCompleted, setHideCompleted] = usePagePreference<boolean>('equipment-overview', 'hideCompleted', () => loadString('gsem.deliveryRound.hideCompleted.v1') === 'true', isBoolean);
  const [dateFrom, setDateFrom] = usePagePreference<string>('equipment-overview', 'dateFrom', () => loadString('gsem.deliveryRound.dateFrom.v1'), isString);
  const [dateTo, setDateTo] = usePagePreference<string>('equipment-overview', 'dateTo', () => loadString('gsem.deliveryRound.dateTo.v1'), isString);
  const [options, setOptions] = useState<FilterOptions>({ vendors: [], destinations: [] });
  const [filterOptionsError, setFilterOptionsError] = useState('');
  const [rounds, setRounds] = useState<LoadState<Round[]> & { queryKey?: string }>({ loading: true });
  const [expanded, setExpanded] = useState<number[]>([]);
  const [detail, setDetail] = useState<Record<number, LoadState<RoundItem[]>>>({});
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState<{ url: string; item: RoundItem } | null>(null);
  const showPreview = useCallback((item: RoundItem, url: string) => setPreview({ item, url }), []);
  const [dueChange, setDueChange] = useState<ScheduleChangeDetails | null>(null);
  const [duePreview, setDuePreview] = useState<Record<number, { dueDate: string; warrantyEnd: string }>>({});
  const [dateEditor, setDateEditor] = useState<{ anchor: HTMLElement; item: RoundItem; kind: 'received' | 'delivered' } | null>(null);
  const [dateDraft, setDateDraft] = useState('');
  const [actualDatePreview, setActualDatePreview] = useState<Record<number, { received?: string; delivered?: string }>>({});
  const [selectedMatches, setSelectedMatches] = useState<Record<number, number[]>>({});
  const [receivingChange, setReceivingChange] = useState<ScheduleChangeDetails | null>(null);
  const [receivingPreview, setReceivingPreview] = useState<Record<number, string>>({});
  const [receiptTarget, setReceiptTarget] = useState<RoundItem | null>(null);
  const [notice, setNotice] = useState('');
  const [deliveryTarget, setDeliveryTarget] = useState<{ kind: 'round'; round: Round } | { kind: 'item'; item: RoundItem; round: Round } | null>(null);
  const [deliveryDraft, setDeliveryDraft] = useState('');
  const [detailItemId, setDetailItemId] = useState<number | null>(null);
  const masterContainerRef = useRef<HTMLDivElement>(null);
  const [masterViewportWidth, setMasterViewportWidth] = useState(0);
  const [masterSort, setMasterSort] = useState<TableSort>();
  const [itemSorts, setItemSorts] = useState<Record<number, TableSort>>({});
  const [masterWidths, setMasterWidths] = usePagePreference<number[]>('equipment-overview', 'masterWidthsV2', () => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(preferenceKey('equipment-overview', 'masterWidths')) ?? 'null');
      if (isWidths(saved, masterColumns.length - 1)) return [...saved.slice(0, 10), masterColumns[10].width, ...saved.slice(10)];
    } catch { /* 이전 설정이 없거나 손상되면 기본 폭을 사용한다. */ }
    return masterColumns.map(column => column.width);
  }, (v): v is number[] => isWidths(v, masterColumns.length));
  const [detailWidths, setDetailWidths] = usePagePreference<number[]>('equipment-overview', 'detailWidths', () => detailColumns.map((column) => column.width), (v): v is number[] => isWidths(v, detailColumns.length));
  // Migrate only the old default (not widths personally resized by the user).
  useEffect(() => {
    setDetailWidths((current) => current.every((width, index) => width === legacyDetailWidths[index])
      ? detailColumns.map((column) => column.width) : current);
  }, [setDetailWidths]);
  const baseMasterWidth = masterWidths.reduce((total, width) => total + width, 0);
  // Fill available desktop width when base columns are narrower than the window;
  // preserve horizontal overflow when the user narrows the window or widens columns.
  useEffect(() => {
    const element = masterContainerRef.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth;
      setMasterViewportWidth(width);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [baseMasterWidth]);
  const masterScale = baseMasterWidth > 0 ? Math.max(1, masterViewportWidth / baseMasterWidth) : 1;
  const displayedMasterWidths = masterWidths.map((width) => width * masterScale);
  const actualMasterWidth = Math.max(masterViewportWidth, baseMasterWidth);
  const setMasterColumnWidth = (index: number, width: number) => {
    setMasterWidths(displayedMasterWidths.map((value, position) => Math.min(900, Math.max(58, Math.round(position === index ? width : value)))));
  };


  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api') return;
    // fetchBusinessOptions has its own request; guard against late completion.
    let active = true;
    fetchBusinessOptions()
      .then((values) => { if (active) { setBusinesses(values); if (values.length === 0) setRounds({ loading: false, data: [] }); } })
      .catch((error: unknown) => {
        if (active) setRounds({ loading: false, error: error instanceof Error ? error.message : '사업 목록 조회 실패' });
      });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (businesses.length === 0 || selectedIds.length === 0) return;
    const allowed = new Set(businesses.map(item => item.businessId));
    if (selectedIds.some(id => !allowed.has(id))) {
      setSelectedIds(ids => ids.filter(id => allowed.has(id)));
    }
  }, [businesses, selectedIds, setSelectedIds]);

  const selectedBusinessIds = useMemo(() => {
    if (focused && focusBusinessId > 0 && businesses.some(b => b.businessId === focusBusinessId)) return [focusBusinessId];
    const valid = new Set(businesses.map((item) => item.businessId));
    const ids = selectedIds.filter((id) => valid.has(id));
    return ids.length ? ids : businesses.map((item) => item.businessId);
  }, [businesses, selectedIds, focused, focusBusinessId]);

  useEffect(() => {
    if (businesses.length === 0) return;
    if (runtimeConfig.dataSource !== 'api') return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    selectedBusinessIds.forEach((id) => params.append('businessIds', String(id)));
    readJson<FilterOptions>(`/delivery-rounds/filter-options?${params}`, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setOptions(data); setFilterOptionsError(''); } })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOptions({ vendors: [], destinations: [] });
          setFilterOptionsError(error instanceof Error ? error.message : '필터 옵션 조회 실패');
        }
      });
    return () => controller.abort();
  }, [businesses, selectedBusinessIds, reload]);

  const mockOptions = useMemo<FilterOptions>(() => ({
    vendors: [...new Set(
      mockRounds.filter((round) => selectedBusinessIds.includes(round.businessId))
        .flatMap((round) => (mockRoundItems[round.subContractId] ?? []).map((item) => item.vendorName)),
    )].sort(),
    destinations: [...new Set(
      mockRounds.filter((round) => selectedBusinessIds.includes(round.businessId)).map((round) => round.destination),
    )].sort(),
    itemNames: [...new Set(mockRounds.filter(round => selectedBusinessIds.includes(round.businessId)).flatMap(round => (mockRoundItems[round.subContractId] ?? []).map(item => item.itemName)))].sort(),
    itemNumbers: [...new Set(mockRounds.filter(round => selectedBusinessIds.includes(round.businessId)).flatMap(round => (mockRoundItems[round.subContractId] ?? []).map(item => item.itemNumber)))].sort(),
  }), [selectedBusinessIds]);
  const displayOptions = runtimeConfig.dataSource === 'api' ? options : mockOptions;
  const dateError = !focused && dateFrom && dateTo && dateFrom > dateTo
    ? '납품 예정일 시작일이 종료일보다 늦습니다.' : '';

  const itemMatches = (item: RoundItem) => focused || matchesItem(item, itemNameFilter, itemNumberFilter, vendors);
  const activeItemFilters = !focused && Boolean(itemNameFilter.length || itemNumberFilter.length || vendors.length);

  const mockData = useMemo<Round[]>(() => mockRounds
    .filter((round) => selectedBusinessIds.includes(round.businessId))
    .filter((round) => focused || destinations.length === 0 || destinations.includes(round.destination))
    .filter((round) => focused || !dateFrom || round.deliveryDate >= dateFrom)
    .filter((round) => focused || !dateTo || round.deliveryDate <= dateTo)
    .map((round) => {
      const lines = mockRoundItems[round.subContractId] ?? [];
      const matchingLines = lines.filter((item) => focused || matchesItem(item, itemNameFilter, itemNumberFilter, vendors));
      return { ...round, ...aggregateDemoLines(matchingLines), deliveryCompleted: round.deliveryCompleted,
        hasMatchingItems: matchingLines.length > 0 };
    })
    .filter((round) => focused || !(itemNameFilter.length || itemNumberFilter.length || vendors.length) || round.hasMatchingItems),
  [selectedBusinessIds, destinations, dateFrom, dateTo, itemNameFilter, itemNumberFilter, vendors, focused]);

  // Capture the query actually loaded; client-side status and hide-completed changes
  // must never put the list into a waiting state without issuing a new request.
  const queryKey = useMemo(() => {
    const params = new URLSearchParams();
    selectedBusinessIds.forEach((id) => params.append('businessIds', String(id)));
    if (!focused) {
    destinations.forEach((value) => params.append('destinations', value));
    vendors.forEach((value) => params.append('vendors', value));
    appendTextSearchParams(params, 'itemNames', 'itemNameTerms', itemNameFilter);
    appendTextSearchParams(params, 'itemNumbers', 'itemNumberTerms', itemNumberFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    }
    params.set('refresh', String(reload));
    return params.toString();
  }, [selectedBusinessIds, destinations, vendors, itemNameFilter, itemNumberFilter, dateFrom, dateTo, reload, focused]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== 'api' || businesses.length === 0 || dateError) return;
    const controller = new AbortController();
    const params = new URLSearchParams(queryKey);
    params.delete('refresh');
    // 입력 중에는 옵션만 갱신하고 확정된 검색 조건으로 조회한다.
    const timer = window.setTimeout(() => {
      void readJson<{ items: Round[] }>(`/delivery-rounds?${params}`, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setRounds({ loading: false, data: result.items, queryKey }); })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setRounds({ loading: false,
            error: error instanceof Error ? error.message : '차수 조회 실패', queryKey });
        });
    }, itemNameFilter.length || itemNumberFilter.length ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [businesses, queryKey, dateError, itemNameFilter, itemNumberFilter]);

  const displayedRounds: LoadState<Round[]> = dateError
    ? { loading: false, error: dateError }
    : runtimeConfig.dataSource !== 'api' ? { loading: false, data: mockData }
      : businesses.length === 0 ? rounds
        : rounds.queryKey === queryKey ? rounds : { loading: true };
  const previewRounds: LoadState<Round[]> = displayedRounds.data ? {
    ...displayedRounds, data: displayedRounds.data.map(round => {
      const items = detail[round.subContractId]?.data;
      const due = duePreview[round.subContractId]?.dueDate ?? round.deliveryDate;
      if (!items?.some(item => actualDatePreview[item.matchId])) return { ...round, deliveryDate: due };
      const delivered = (item: RoundItem) => Boolean(actualDatePreview[item.matchId]?.delivered ?? item.deliveredAt);
      const received = (item: RoundItem) => Boolean(actualDatePreview[item.matchId]?.received ?? item.receivedAt);
      const matching = items.filter(itemMatches);
      const deliveredItems = matching.filter(delivered);
      const latestDeliveredAt = deliveredItems.reduce<string | null>((latest, item) => {
        const actual = actualDatePreview[item.matchId]?.delivered ?? item.deliveredAt;
        return actual && (!latest || actual > latest) ? actual : latest;
      }, null);
      return { ...round, deliveryDate: due, deliveredCount: deliveredItems.length, latestDeliveredAt,
        deliveredQuantity: deliveredItems.reduce((total, item) => total + (item.quantity ?? 0), 0),
        receivedCount: matching.filter(received).length, deliveryCompleted: items.length > 0 && items.every(delivered) };
    }),
  } : displayedRounds;
  const statusFilteredRounds: LoadState<Round[]> = previewRounds.data && !focused && statusFilters.length > 0
    ? { ...previewRounds, data: previewRounds.data.filter((round) => statusFilters.includes(getDeliveryIndicator(round))) }
    : previewRounds;
  const visibleRounds: LoadState<Round[]> = statusFilteredRounds.data
    ? { ...statusFilteredRounds, data: statusFilteredRounds.data.filter((round) => focused || !hideCompleted || !round.deliveryCompleted) }
    : statusFilteredRounds;
  const sortedRounds = sortTableRows(visibleRounds.data ?? [], masterSort,
    (round, column) => round[column as typeof masterColumns[number]['key']]);
  const sortedItems = (id: number, items: RoundItem[]) => sortTableRows(items.filter(itemMatches), itemSorts[id], (item, column) => {
    if (column === 'receivingExpected') return receivingPreview[item.matchId] ?? item.receivingExpected;
    if (column === 'receivedAt') return actualDatePreview[item.matchId]?.received ?? item.receivedAt;
    if (column === 'deliveredAt') return actualDatePreview[item.matchId]?.delivered ?? item.deliveredAt;
    return item[column as Exclude<typeof detailColumns[number]['key'], null>];
  });
  const [highlightAcknowledged, setHighlightAcknowledged] = useState('');
  const focusedRowRef = useRef<HTMLTableRowElement>(null);
  const focusAvailable = focused && visibleRounds.data?.some(round => round.subContractId === focusRoundId);
  useEffect(() => {
    if (!focusAvailable || !focusedRowRef.current) return;
    const frame = requestAnimationFrame(() => focusedRowRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [focusAvailable, focusKey]);
  const changeFilters = (apply: () => void) => {
    if (focused) setDismissedFocus(focusKey);
    apply();
    setExpanded([]);
    setSelectedMatches({});
  };

  const pendingDetail = useRef(new Set<number>());
  const detailCache = useRef(new Map<number, RoundItem[]>());
  const fetchRoundDetail = useCallback((round: Round) => {
    const roundId = round.subContractId;
    if (pendingDetail.current.has(roundId) || detailCache.current.has(roundId)) return;
    if (runtimeConfig.dataSource !== 'api') {
      const rows = mockRoundItems[roundId] ?? [];
      detailCache.current.set(roundId, rows);
      setDetail((current) => ({ ...current, [roundId]: { loading: false, data: rows } }));
      return;
    }
    pendingDetail.current.add(roundId);
    setDetail((current) => ({ ...current, [roundId]: { loading: true } }));
    const params = new URLSearchParams({ businessId: String(round.businessId) });
    void readJson<{ items: RoundItem[] }>(`/delivery-rounds/${roundId}/items?${params}`)
      .then((result) => {
        detailCache.current.set(roundId, result.items);
        setDetail((current) => ({ ...current, [roundId]: { loading: false, data: result.items } }));
      })
      .catch((error: unknown) => setDetail((current) => ({ ...current, [roundId]: {
        loading: false, error: error instanceof Error ? error.message : '품목 조회 실패',
      } })))
      .finally(() => pendingDetail.current.delete(roundId));
  }, []);

  const hoverTimer = useRef<number | undefined>(undefined);
  const cancelDetailPrefetch = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = undefined;
  }, []);
  useEffect(() => cancelDetailPrefetch, [cancelDetailPrefetch]);

  const prefetchRoundDetail = (round: Round) => {
    if (runtimeConfig.dataSource !== 'api') return;
    cancelDetailPrefetch();
    // 포인터가 행을 지나가기만 할 때 상세 API 요청이 쌓이지 않게 한다.
    hoverTimer.current = window.setTimeout(() => fetchRoundDetail(round), 150);
  };

  const openRound = useCallback((round: Round) => {
    cancelDetailPrefetch();
    if (round.subContractId === focusRoundId) setHighlightAcknowledged(focusKey);
    setExpanded((current) => current.includes(round.subContractId)
      ? current.filter((id) => id !== round.subContractId)
      : [...current, round.subContractId]);
    fetchRoundDetail(round);
  }, [cancelDetailPrefetch, fetchRoundDetail, focusRoundId, focusKey]);
  const beginDelivery = (target: NonNullable<typeof deliveryTarget>) => {
    setDeliveryDraft('');
    setDeliveryTarget(target);
    fetchRoundDetail(target.round);
  };
  const deliveryRows = deliveryTarget?.kind === 'round'
    ? detail[deliveryTarget.round.subContractId]?.data ?? []
    : deliveryTarget?.kind === 'item' ? [deliveryTarget.item] : [];
  const undeliveredRows = deliveryRows.filter(item => !(actualDatePreview[item.matchId]?.delivered ?? item.deliveredAt));
  const deliveryLoad = deliveryTarget?.kind === 'round' ? detail[deliveryTarget.round.subContractId] : undefined;
  const resetFilters = () => changeFilters(() => {
    setSelectedIds([]); setVendors([]); setDestinations([]); setStatusFilters([]); setDateFrom(''); setDateTo('');
    setItemNameFilter([]); setItemNumberFilter([]); setHideCompleted(false);
  });

  return (
    <Box sx={{ minWidth: 0, width: '100%', maxWidth: '100%', p: { xs: 1.5, md: 3 }, bgcolor: 'background.default' }}>
      <PageHeader title="지원장비 통합현황" />
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, mb: 1.5, display: 'grid', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>사업 분류</Typography>
          <Select size="small" value={aircraftScope} onChange={(event) => setAircraftScope(event.target.value as 'all' | 'rotary' | 'fixed')}
            inputProps={{ 'aria-label': '사업 분류' }} sx={{ minWidth: 160 }}>
            <MenuItem value="all">전체</MenuItem><MenuItem value="rotary">회전익</MenuItem><MenuItem value="fixed">고정익</MenuItem>
          </Select>
        </Box>
        <Box sx={{ display: 'grid', gap: 1.25, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(180px, 1.15fr) minmax(170px, 1fr) minmax(195px, 1fr) minmax(330px, 1.9fr)' } }}>
          <Box sx={{ minWidth: 0 }}>
            <Autocomplete multiple disableCloseOnSelect size="small" options={businesses}
              value={businesses.filter((entry) => selectedIds.includes(entry.businessId))}
              getOptionLabel={(entry) => entry.businessName}
              isOptionEqualToValue={(a, b) => a.businessId === b.businessId}
              onChange={(_, values) => changeFilters(() => {
                setSelectedIds(values.map((entry) => entry.businessId));
                setVendors([]); setDestinations([]);
              })}
              renderInput={(params) => <TextField {...params} label="사업 선택 (복수)" placeholder={selectedIds.length ? '' : '전체 사업'} />}
              renderValue={(values, getItemProps) => <AdaptiveTags labels={values.map((value) => value.businessName)}
                itemKeys={values.map((value) => value.businessId)} getItemProps={getItemProps} />}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Autocomplete multiple disableCloseOnSelect size="small" options={displayOptions.destinations}
              value={destinations}
              renderValue={(values, getItemProps) => <AdaptiveTags labels={values} getItemProps={getItemProps} />}
              onChange={(_, values) => changeFilters(() => setDestinations(values))}
              renderInput={(params) => <TextField {...params} label="납품 부대 (복수)" placeholder={destinations.length ? '' : '전체 부대'} />}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Autocomplete multiple disableCloseOnSelect size="small"
              options={statusChoices} value={statusChoices.filter((choice) => statusFilters.includes(choice.value))}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              getOptionLabel={(choice) => choice.label}
              renderValue={(values, getItemProps) => <AdaptiveTags labels={values.map((value) => value.label)}
                itemKeys={values.map((value) => value.value)} getItemProps={getItemProps} />}
              onChange={(_, values) => setStatusFilters(values.map((value) => value.value))}
              renderOption={({ key, ...props }, choice) => (
                <Box component="li" key={key} {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box component="span" sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: choice.color, flexShrink: 0 }} />
                  {choice.label}
                </Box>
              )}
              renderInput={(params) => <TextField {...params} label="납품완료 (복수)" placeholder={statusFilters.length ? '' : '전체 상태'} />}
            />
          </Box>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', minWidth: 0 }}>
            <TextField type="date" size="small" label="납품 예정일 시작" value={dateFrom}
              onChange={(event) => changeFilters(() => setDateFrom(event.target.value))}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 0 }} />
            <TextField type="date" size="small" label="납품 예정일 종료" value={dateTo}
              onChange={(event) => changeFilters(() => setDateTo(event.target.value))}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 0 }} />
          </Box>
        </Box>
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5, display: 'grid', alignItems: 'center', gap: 1.25, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' } }}>
          <SearchableMultiTextFilter label="품명 검색" value={itemNameFilter} options={displayOptions.itemNames ?? []}
            onChange={value => changeFilters(() => setItemNameFilter(value))} />
          <SearchableMultiTextFilter label="품번 검색" value={itemNumberFilter} options={displayOptions.itemNumbers ?? []}
            onChange={value => changeFilters(() => setItemNumberFilter(value))} />
          <Autocomplete multiple disableCloseOnSelect size="small" options={displayOptions.vendors}
            value={vendors}
            renderValue={(values, getItemProps) => <AdaptiveTags labels={values} getItemProps={getItemProps} />}
            onChange={(_, values) => changeFilters(() => setVendors(values))}
            renderInput={(params) => <TextField {...params} label="조달원 (복수)" placeholder={vendors.length ? '' : '전체 조달원'} />}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 1.5, rowGap: 0.5 }}>
          <FormControlLabel sx={{ m: 0 }} control={<Checkbox size="small" checked={hideCompleted}
            onChange={(_, checked) => setHideCompleted(checked)} />}
            label={<Typography variant="body2">납품완료된 항목 숨김</Typography>} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button size="small" onClick={resetFilters}>필터 초기화</Button>
            <Button size="small" onClick={() => { setMasterWidths(masterColumns.map(column => column.width)); setDetailWidths(detailColumns.map(column => column.width)); }}>열 너비 초기화</Button>
            <Button size="small" startIcon={<RefreshOutlined />} onClick={() => { cancelDetailPrefetch(); detailCache.current.clear(); setDetail({}); setExpanded([]); setSelectedMatches({}); setActualDatePreview({}); setReceivingPreview({}); setDuePreview({}); setReload((value) => value + 1); }}>새로고침</Button>
          </Box>
        </Box>
      </Paper>
      {runtimeConfig.dataSource !== 'api' && <Alert severity="info" sx={{ mb: 2 }}>목데이터 시연 모드입니다. 사업·차수·품목은 가상 예시이며 실제 DB와 무관합니다.</Alert>}
      {filterOptionsError && <Alert severity="warning" sx={{ mb: 2 }}>필터 옵션 조회 실패: {filterOptionsError}</Alert>}
      {visibleRounds.error && <Alert severity="error" sx={{ mb: 2 }}>납품 차수 조회 실패: {visibleRounds.error}</Alert>}
      {focused && <Alert severity={focusAvailable || visibleRounds.loading ? 'info' : 'warning'} sx={{ mb: 1 }} action={<Button color="inherit" size="small" onClick={() => { setDismissedFocus(focusKey); setExpanded([]); }}>기존 필터로 돌아가기</Button>}>
        {focusAvailable ? '달력에서 선택한 차수를 표시했습니다. 기존 필터는 보존됩니다.' : visibleRounds.loading ? '선택한 차수 찾는 중…' : '선택한 차수를 찾을 수 없습니다.'}
      </Alert>}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1, px: 0.5 }}>
        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>조회 결과 {visibleRounds.loading || visibleRounds.error ? '—' : `${number(visibleRounds.data?.length ?? 0)}차수`}</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>납품금액 합계 <Box component="span" sx={{ ml: 1, color: 'primary.main', fontSize: 20, fontWeight: 800 }}>
          {visibleRounds.loading || visibleRounds.error ? '—' : `${number((visibleRounds.data ?? []).reduce((sum, round) => sum + round.deliveryAmount, 0))}원`}
        </Box></Typography>
      </Box>
      <TableContainer ref={masterContainerRef} data-round-scroll-root component={Paper} variant="outlined"
        onScroll={(event) => event.currentTarget.style.setProperty('--gsem-master-scroll-left', `${event.currentTarget.scrollLeft}px`)}
        sx={{ borderRadius: 2, width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
        <Table aria-label="납품 차수별 지원장비 통합현황" size="small" sx={{ minWidth: baseMasterWidth,
          width: actualMasterWidth || '100%', tableLayout: 'fixed', '& th, & td': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, '& td': { textOverflow: 'ellipsis' } }}>
          <colgroup>{displayedMasterWidths.map((width, index) => <col key={masterColumns[index].label} style={{ width }} />)}</colgroup>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: 'action.hover' } }}>
              {masterColumns.map((column, index) => <ResizeHeader key={column.label} label={column.label}
                align={column.key === 'deliveryCompleted' ? 'center' : index >= 4 && column.key !== 'latestDeliveredAt' ? 'right' : 'left'}
                sortDirection={masterSort?.column === column.key ? masterSort.direction : undefined}
                onSort={() => setMasterSort(current => toggleTableSort(current, column.key))}
                width={displayedMasterWidths[index]} setWidth={(value) => setMasterColumnWidth(index, value)} />)}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRounds.loading && <TableRow><TableCell colSpan={masterColumns.length} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>}
            {!visibleRounds.loading && visibleRounds.error && <TableRow><TableCell colSpan={masterColumns.length} align="center" sx={{ py: 4 }}>조회 오류가 발생했습니다.</TableCell></TableRow>}
            {!visibleRounds.loading && !visibleRounds.error && visibleRounds.data?.length === 0 && <TableRow><TableCell colSpan={masterColumns.length} align="center" sx={{ py: 4 }}>조회할 납품 차수가 없습니다.</TableCell></TableRow>}
            {!visibleRounds.loading && !visibleRounds.error && sortedRounds.map((round) => (
              <Fragment key={round.subContractId}>
                <TableRow ref={focused && round.subContractId === focusRoundId ? focusedRowRef : undefined} data-round-id={round.subContractId} hover selected={expanded.includes(round.subContractId)}
                  aria-expanded={expanded.includes(round.subContractId)}
                  aria-label={`${round.businessName} ${round.subContractName || '납품 차수'} 품목 ${expanded.includes(round.subContractId) ? '접기' : '보기'}`}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openRound(round); }
                  }}
                  onMouseEnter={() => prefetchRoundDetail(round)}
                  onMouseLeave={cancelDetailPrefetch}
                  onClick={() => openRound(round)}
                  sx={{ cursor: 'pointer', scrollMarginTop: '76px', transition: 'background-color 220ms ease', ...(focused && round.subContractId === focusRoundId && highlightAcknowledged !== focusKey ? { bgcolor: 'action.selected', boxShadow: 'inset 4px 0 0 #2563eb', '& td': { bgcolor: 'rgba(37,99,235,0.10)' } } : {}), '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } }}>
                  <TableCell title={round.businessName}>{round.businessName}</TableCell>
                  <TableCell title={round.destination || '-'}>{round.destination || '-'}</TableCell>
                  <TableCell title={round.subContractName || '-'} sx={{ fontWeight: 700 }}>{round.subContractName || '-'}</TableCell>
                  <TableCell title={duePreview[round.subContractId]?.dueDate ?? date(round.deliveryDate)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0,
                      '& .date-edit': { opacity: 0 }, '&:hover .date-edit, &:focus-within .date-edit': { opacity: 1 } }}>
                      <Typography variant="body2" noWrap sx={{ minWidth: 0, fontWeight: duePreview[round.subContractId] ? 700 : 400 }}>
                        {duePreview[round.subContractId]?.dueDate ?? date(round.deliveryDate)}
                      </Typography>
                      {duePreview[round.subContractId] && <Tooltip title={`보증 종료 ${duePreview[round.subContractId].warrantyEnd} · DB 미반영`}>
                        <Chip size="small" label="미리보기" sx={{ height: 20, fontSize: 10 }} />
                      </Tooltip>}
                      <IconButton className="date-edit" size="small"
                        aria-label={`${round.businessName} ${round.subContractName || ''} 납품 예정일 변경`}
                        onClick={(event) => { event.stopPropagation(); setDueChange({
                          kind: 'delivery', title: '납품 예정일 변경',
                          roundName: `${round.businessName} · ${round.subContractName || '납품 차수'} · ${round.destination || '납품부대 미지정'}`,
                          fieldLabel: '납품 예정일',
                          items: [{ matchId: round.subContractId, itemNumber: round.subContractName || '납품 차수',
                            itemName: round.businessName, quantity: round.pointCount,
                            previousDate: duePreview[round.subContractId]?.dueDate ?? round.deliveryDate }],
                        }); }}><EditOutlined fontSize="small" /></IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{number(round.itemCount)}</TableCell>
                  <TableCell align="right">{number(round.pointCount)}</TableCell>
                  <TableCell align="right">{number(round.prCount)}</TableCell>
                  <TableCell align="right">{number(round.poCount)}</TableCell>
                  <TableCell align="right">{number(round.receivedCount)}</TableCell>
                  <TableCell align="right">{number(round.deliveredQuantity)}</TableCell>
                  <TableCell title={round.latestDeliveredAt ? '최근 실납품일' : undefined}>
                    <Box className="delivery-date-switch" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%',
                      position: 'relative', minHeight: 28,
                      '& .delivery-action': { position: 'absolute', right: 0, opacity: 0, pointerEvents: 'none' },
                      ...(!round.latestDeliveredAt && round.deliveredCount === 0 && !round.deliveryCompleted ? {
                        '&:hover .delivery-number, &:focus-within .delivery-number': { visibility: 'hidden' },
                        '&:hover .delivery-action, &:focus-within .delivery-action': { opacity: 1, pointerEvents: 'auto' },
                        '@media (hover: none)': { '& .delivery-number': { visibility: 'hidden' }, '& .delivery-action': { opacity: 1, pointerEvents: 'auto' } },
                      } : {}) }}>
                      <Typography className="delivery-number" variant="body2" component="span">{date(round.latestDeliveredAt ?? null)}</Typography>
                      {!round.latestDeliveredAt && round.deliveredCount === 0 && !round.deliveryCompleted && <Button size="small" variant="outlined"
                        className="delivery-action" sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 0.75,
                          minHeight: 26 }}
                        aria-label={`${round.businessName} ${round.subContractName || ''} 납품 처리`}
                        onClick={(event) => { event.stopPropagation(); beginDelivery({ kind: 'round', round }); }}>납품</Button>}
                    </Box>
                  </TableCell>
                  <TableCell align="center"><DeliveryStatusDot round={round} /></TableCell>
                  <TableCell align="right">{number(round.deliveryAmount)}</TableCell>
                </TableRow>
                {expanded.includes(round.subContractId) && (
                  <TableRow>
                    <TableCell colSpan={masterColumns.length} sx={{ p: 0, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                      <Box sx={{ boxSizing: 'border-box', width: masterViewportWidth || '100%',
                        transform: 'translateX(var(--gsem-master-scroll-left, 0px))', p: 1.25, minWidth: 0,
                        bgcolor: 'action.hover' }}>
                        {detail[round.subContractId]?.loading && <CircularProgress size={22} />}
                        {detail[round.subContractId]?.error && <Alert severity="error">{detail[round.subContractId].error}</Alert>}
                        {detail[round.subContractId]?.data && <>
                          {(() => {
                            const visibleItems = detail[round.subContractId].data!.filter(itemMatches);
                            const selected = selectedMatches[round.subContractId] ?? [];
                            const selectedVisible = visibleItems.filter((item) => selected.includes(item.matchId));
                            return <>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedVisible.length}건 선택됨</Typography>
                                <Button size="small" variant="outlined" disabled={!selectedVisible.length}
                                  onClick={() => setReceivingChange({ title: '입고 예정일 변경',
                                    roundName: `${round.businessName} · ${round.subContractName || '납품 차수'} · ${round.destination || '납품부대 미지정'}`,
                                    fieldLabel: '입고 예정일',
                                    items: selectedVisible.map(item => ({ matchId: item.matchId, itemNumber: item.itemNumber,
                                      itemName: item.itemName, quantity: item.quantity, previousDate: receivingPreview[item.matchId] ?? item.receivingExpected }))
                                  })}>입고 예정일 일괄 변경</Button>
                              </Box>
                            </>;
                          })()}
                          <ItemTableScroller>{(itemViewportWidth) => {
                            const detailBaseWidth = detailWidths.reduce((sum, width) => sum + width, 0);
                            const displayedDetailWidths = layoutItemWidths(detailWidths, itemViewportWidth);
                            return <Table stickyHeader size="small" aria-label={`${round.subContractName ?? round.subContractId} 납품 품목`} sx={{ minWidth: detailBaseWidth, width: Math.max(itemViewportWidth, detailBaseWidth), tableLayout: 'fixed', '& th, & td': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                              '& td': { px: 0.85 }, '& thead th': { px: 0.85 } }}>
                              <colgroup>{displayedDetailWidths.map((width, index) => <col key={detailColumns[index].label} style={{ width }} />)}</colgroup>
                              <TableHead><TableRow>
                                <ResizeHeader sticky label="선택" width={displayedDetailWidths[0]}
                                  setWidth={(width) => setDetailWidths(displayedDetailWidths.map((value, index) => Math.min(900, Math.max(58, Math.round(index === 0 ? width : value)))))}>
                                  <Checkbox size="small" slotProps={{ input: { 'aria-label': '아이템 모두 선택' } }}
                                    checked={detail[round.subContractId].data!.filter(itemMatches).length > 0 && detail[round.subContractId].data!.filter(itemMatches).every((item) => (selectedMatches[round.subContractId] ?? []).includes(item.matchId))}
                                    indeterminate={detail[round.subContractId].data!.filter(itemMatches).some((item) => (selectedMatches[round.subContractId] ?? []).includes(item.matchId)) && !detail[round.subContractId].data!.filter(itemMatches).every((item) => (selectedMatches[round.subContractId] ?? []).includes(item.matchId))}
                                    onChange={(_, checked) => setSelectedMatches((current) => ({ ...current, [round.subContractId]: checked ? detail[round.subContractId].data!.filter(itemMatches).map((item) => item.matchId) : [] }))} />
                                </ResizeHeader>
                                {detailColumns.slice(1).map((column, index) => <ResizeHeader sticky key={column.label} label={column.label}
                                  sortDirection={itemSorts[round.subContractId]?.column === column.key ? itemSorts[round.subContractId].direction : undefined}
                                  onSort={column.key === null ? undefined : () => setItemSorts(current => ({
                                    ...current, [round.subContractId]: toggleTableSort(current[round.subContractId], column.key!),
                                  }))}
                                  width={displayedDetailWidths[index + 1]} align={column.label === '계약 가격' ? 'right' : 'left'}
                                  setWidth={(width) => setDetailWidths(displayedDetailWidths.map((value, position) => Math.min(900, Math.max(58, Math.round(position === index + 1 ? width : value)))))} />)}
                              </TableRow></TableHead>
                              <TableBody>
                                {sortedItems(round.subContractId, detail[round.subContractId].data ?? []).map((item) => <TableRow key={item.matchId} hover selected={(selectedMatches[round.subContractId] ?? []).includes(item.matchId)}
                                  aria-selected={(selectedMatches[round.subContractId] ?? []).includes(item.matchId)}
                                  tabIndex={0}
                                  onDoubleClick={(event) => {
                                    if ((event.target as HTMLElement).closest('button,input,[role="button"]')) return;
                                    // The first click toggled selection; restore it before opening the detail.
                                    setSelectedMatches(current => {
                                      const selected = current[round.subContractId] ?? [];
                                      return { ...current, [round.subContractId]: selected.includes(item.matchId)
                                        ? selected.filter(id => id !== item.matchId) : [...selected, item.matchId] };
                                    });
                                    setDetailItemId(item.itemId);
                                  }}
                                  onClick={(event) => { if (event.detail > 1) return; setSelectedMatches((current) => {
                                    const selected = current[round.subContractId] ?? [];
                                    return { ...current, [round.subContractId]: selected.includes(item.matchId)
                                      ? selected.filter((id) => id !== item.matchId) : [...selected, item.matchId] };
                                  }); }}
                                  onKeyDown={(event) => {
                                    if (event.target !== event.currentTarget) return;
                                    if (event.key === 'Enter') { event.preventDefault(); setDetailItemId(item.itemId); }
                                    if (event.key === ' ') {
                                      event.preventDefault(); event.currentTarget.click();
                                    }
                                  }}
                                  sx={{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}>
                                  <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}><Checkbox size="small" slotProps={{ input: { 'aria-label': `${item.itemNumber} 선택` } }}
                                    checked={(selectedMatches[round.subContractId] ?? []).includes(item.matchId)}
                                    onChange={(_, checked) => setSelectedMatches((current) => ({ ...current, [round.subContractId]: checked
                                      ? [...(current[round.subContractId] ?? []), item.matchId]
                                      : (current[round.subContractId] ?? []).filter((id) => id !== item.matchId) }))} /></TableCell>
                                  <TableCell onClick={(event) => event.stopPropagation()}><EquipmentImageThumbnail item={item}
                                    onExpand={showPreview} /></TableCell>
                                  <TableCell title={item.itemNumber || '-'}>{item.itemNumber}</TableCell>
                                  <TableCell title={item.itemName || '-'}>{item.itemName || '-'}</TableCell>
                                  <TableCell>{number(item.quantity)}</TableCell>
                                  <TableCell title={item.vendorName || '-'}>{item.vendorName || '-'}</TableCell>
                                  <TableCell title={item.purchaseRequestNumber || '-'}>{item.purchaseRequestNumber || '-'}</TableCell>
                                  <TableCell title={item.purchaseOrderNumber || '-'}>{item.purchaseOrderNumber || '-'}</TableCell>
                                  <TableCell title={item.buyerName || '-'}>{item.buyerName || '-'}</TableCell>
                                  <TableCell onClick={(event) => event.stopPropagation()}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
                                      <Typography variant="body2" noWrap title={receivingPreview[item.matchId] ?? date(item.receivingExpected)}
                                        sx={{ fontSize: 11, fontWeight: receivingPreview[item.matchId] ? 700 : 400 }}>
                                        {receivingPreview[item.matchId] ?? date(item.receivingExpected)}
                                      </Typography>
                                      <IconButton size="small" aria-label={`${item.itemNumber} 입고 예정일 변경`} onClick={() => setReceivingChange({
                                        title: '입고 예정일 변경', roundName: `${round.businessName} · ${round.subContractName || '납품 차수'}`,
                                        fieldLabel: '입고 예정일', items: [{ matchId: item.matchId, itemNumber: item.itemNumber,
                                          itemName: item.itemName, quantity: item.quantity, previousDate: receivingPreview[item.matchId] ?? item.receivingExpected }],
                                      })}><EditOutlined sx={{ fontSize: 15 }} /></IconButton>
                                    </Box>
                                  </TableCell>
                                  <TableCell onClick={(event) => event.stopPropagation()}>
                                    {(actualDatePreview[item.matchId]?.received ?? item.receivedAt) ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, minWidth: 0 }}>
                                        <Typography variant="body2" noWrap title={actualDatePreview[item.matchId]?.received ?? date(item.receivedAt)}
                                          sx={{ minWidth: 0, fontSize: 11, fontWeight: actualDatePreview[item.matchId]?.received ? 700 : 400 }}>
                                          {actualDatePreview[item.matchId]?.received ?? date(item.receivedAt)}
                                        </Typography>
                                        <IconButton size="small" aria-label={`${item.itemNumber} 입고일 수정`} sx={{ p: 0.25, flexShrink: 0 }}
                                          onClick={(event) => { setDateEditor({ anchor: event.currentTarget, item, kind: 'received' });
                                            setDateDraft(actualDatePreview[item.matchId]?.received ?? item.receivedAt?.slice(0, 10) ?? ''); }}>
                                          <EditOutlined sx={{ fontSize: 15 }} />
                                        </IconButton>
                                      </Box>
                                    ) : <Button size="small" variant="outlined" aria-label={`${item.itemNumber} 입고 처리`}
                                        onClick={() => setReceiptTarget(item)}>입고</Button>}
                                  </TableCell>
                                  <TableCell onClick={(event) => event.stopPropagation()}>
                                    {(actualDatePreview[item.matchId]?.delivered ?? item.deliveredAt) ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, minWidth: 0 }}>
                                        <Typography variant="body2" noWrap title={actualDatePreview[item.matchId]?.delivered ?? date(item.deliveredAt)}
                                          sx={{ minWidth: 0, fontSize: 11, fontWeight: actualDatePreview[item.matchId]?.delivered ? 700 : 400 }}>
                                          {actualDatePreview[item.matchId]?.delivered ?? date(item.deliveredAt)}
                                        </Typography>
                                        <IconButton size="small" aria-label={`${item.itemNumber} 납품일 수정`} sx={{ p: 0.25, flexShrink: 0 }}
                                          onClick={(event) => { setDateEditor({ anchor: event.currentTarget, item, kind: 'delivered' });
                                            setDateDraft(actualDatePreview[item.matchId]?.delivered ?? item.deliveredAt?.slice(0, 10) ?? ''); }}>
                                          <EditOutlined sx={{ fontSize: 15 }} />
                                        </IconButton>
                                      </Box>
                                    ) : <Button size="small" variant="outlined" aria-label={`${item.itemNumber} 납품 처리`}
                                      onClick={() => beginDelivery({ kind: 'item', item, round })}>납품</Button>}
                                  </TableCell>
                                  <TableCell align="right">{number(item.contractPrice)}</TableCell>
                                </TableRow>)}
                                {detail[round.subContractId].data?.filter(itemMatches).length === 0 && <TableRow><TableCell colSpan={13} align="center">{activeItemFilters ? '아이템 필터에 맞는 품목이 없습니다.' : '등록된 품목이 없습니다.'}</TableCell></TableRow>}
                              </TableBody>
                            </Table>;
                            }}</ItemTableScroller>
                        </> }
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ScheduleChangeDialog open={dueChange !== null} details={dueChange}
        onClose={() => setDueChange(null)} onPreview={({ itemIds, nextDate, warrantyEnd }) => {
          if (!warrantyEnd) return;
          setDuePreview(current => ({ ...current, ...Object.fromEntries(itemIds.map(id => [id, { dueDate: nextDate, warrantyEnd }])) }));
          setNotice(`납품 예정일 ${nextDate}, 보증 종료 ${warrantyEnd}로 화면에서만 변경했습니다. DB 미반영`);
        }} />
      <Popover open={dateEditor !== null} anchorEl={dateEditor?.anchor ?? null}
        onClose={() => setDateEditor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, width: 305, maxWidth: 'calc(100vw - 24px)', mt: 0.5, overflow: 'visible' } } }}>
        <Box sx={{ display: 'grid', gap: 1.5 }} onClick={(event) => event.stopPropagation()}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {dateEditor?.kind === 'received' ? '입고일' : '납품일'} 수정
          </Typography>
          <Typography variant="caption" noWrap title={dateEditor?.item.itemNumber} sx={{ color: 'text.secondary' }}>
            {dateEditor?.item.itemNumber} · 현재 {dateEditor?.kind === 'received'
              ? date(actualDatePreview[dateEditor?.item.matchId ?? -1]?.received ?? dateEditor?.item.receivedAt ?? null)
              : date(actualDatePreview[dateEditor?.item.matchId ?? -1]?.delivered ?? dateEditor?.item.deliveredAt ?? null)}
          </Typography>
          <TextField autoFocus size="small" fullWidth type="date" label="변경할 날짜"
            value={dateDraft} onChange={(event) => setDateDraft(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>화면 미리보기 전용 · DB에 저장되지 않습니다.</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" onClick={() => setDateEditor(null)}>취소</Button>
            <Button size="small" variant="contained" disabled={!isCalendarDate(dateDraft)}
              onClick={() => {
                if (!dateEditor || !isCalendarDate(dateDraft)) return;
                const { item, kind } = dateEditor;
                setActualDatePreview(current => ({ ...current, [item.matchId]: { ...current[item.matchId], [kind]: dateDraft } }));
                setDateEditor(null);
                setNotice(`${item.itemNumber} ${kind === 'received' ? '입고일' : '납품일'} ${dateDraft}로 미리보기 적용 · DB 미반영`);
              }}>적용</Button>
          </Box>
        </Box>
      </Popover>
      <ScheduleChangeDialog open={receivingChange !== null} details={receivingChange}
        onClose={() => setReceivingChange(null)} onPreview={({ itemIds, nextDate }) => {
          setReceivingPreview(current => ({ ...current, ...Object.fromEntries(itemIds.map(id => [id, nextDate])) }));
          setNotice(`${itemIds.length}건 입고 예정일이 화면에서만 ${nextDate}로 변경되었습니다. DB 미반영`);
        }} />
      <Dialog open={receiptTarget !== null} onClose={() => setReceiptTarget(null)} aria-labelledby="receipt-confirm-title">
        <DialogTitle id="receipt-confirm-title">입고 처리 동의</DialogTitle>
        <DialogContent>
          <Typography>선택한 품목({receiptTarget?.itemNumber})을 입고 처리하시겠습니까?</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>현재는 UI 시안으로, 확인해도 DB에 기록되지 않습니다.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptTarget(null)}>취소</Button>
          <Button variant="contained" onClick={() => { setReceiptTarget(null); setNotice('입고 처리 기능은 API 연결 전입니다.'); }}>확인</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deliveryTarget !== null} onClose={() => setDeliveryTarget(null)} fullWidth maxWidth="md" aria-labelledby="delivery-confirm-title">
        <DialogTitle id="delivery-confirm-title">납품 처리 확인</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{deliveryTarget?.round.businessName} · {deliveryTarget?.round.subContractName || '납품 차수'} · {deliveryTarget?.round.destination || '-'}</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>미리보기 전용입니다. 이미 납품된 품목은 유지하고 미완료 품목만 변경합니다. DB에는 저장되지 않습니다.</Alert>
          {deliveryTarget?.kind === 'round' && (!deliveryLoad || deliveryLoad.loading) && <CircularProgress size={24} />}
          {deliveryLoad?.error && <Alert severity="error" action={<Button onClick={() => deliveryTarget && fetchRoundDetail(deliveryTarget.round)}>재시도</Button>}>{deliveryLoad.error}</Alert>}
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <TextField type="date" size="small" label="납품일" value={deliveryDraft} onChange={event => setDeliveryDraft(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <Typography variant="body2">전체 {deliveryRows.length}건 · 처리 대상 {undeliveredRows.length}건 / {number(undeliveredRows.reduce((sum, item) => sum + (item.quantity ?? 0), 0))}점</Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader aria-label="납품 처리 대상 품목">
              <TableHead><TableRow>{['품번', '품명', '수량', '현재 납품일', '처리 후'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
              <TableBody>{deliveryRows.map(item => {
                const current = actualDatePreview[item.matchId]?.delivered ?? item.deliveredAt;
                return <TableRow key={item.matchId}><TableCell>{item.itemNumber}</TableCell><TableCell>{item.itemName || '-'}</TableCell><TableCell>{number(item.quantity)}</TableCell><TableCell>{date(current)}</TableCell><TableCell>{current ? <Chip size="small" label="완료 · 유지" /> : deliveryDraft || '처리 예정'}</TableCell></TableRow>;
              })}{!deliveryRows.length && !deliveryLoad?.loading && !deliveryLoad?.error && <TableRow><TableCell colSpan={5}>처리할 품목이 없습니다.</TableCell></TableRow>}</TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setDeliveryTarget(null)}>취소</Button>
          <Button variant="contained" disabled={!isCalendarDate(deliveryDraft) || !undeliveredRows.length || deliveryLoad?.loading || Boolean(deliveryLoad?.error)} onClick={() => {
            if (!isCalendarDate(deliveryDraft) || !undeliveredRows.length) return;
            setActualDatePreview(current => ({ ...current, ...Object.fromEntries(undeliveredRows.map(item => [item.matchId, { ...current[item.matchId], delivered: deliveryDraft }])) }));
            setDeliveryTarget(null); setNotice(`${undeliveredRows.length}건 납품 처리 미리보기 · DB 미반영`);
          }}>납품 처리 ({undeliveredRows.length}건)</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={detailItemId !== null} onClose={() => setDetailItemId(null)} fullWidth maxWidth="xl" aria-labelledby="round-equipment-detail-title">
        <DialogTitle id="round-equipment-detail-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>장비 통합 상세<IconButton aria-label="장비 상세 닫기" onClick={() => setDetailItemId(null)}><CloseOutlined /></IconButton></DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>{detailItemId !== null && <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}><EmbeddedEquipmentDetail key={detailItemId} itemId={detailItemId} /></Suspense>}</DialogContent>
      </Dialog>
      <Snackbar open={Boolean(notice)} autoHideDuration={3500} onClose={() => setNotice('')} message={notice} />
      <Dialog open={preview !== null} onClose={() => setPreview(null)} maxWidth="md" fullWidth
        aria-labelledby="equipment-image-title">
        <DialogTitle id="equipment-image-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {preview?.item.itemNumber} — {preview?.item.itemName || '장비 이미지'}
          </Box>
          <IconButton aria-label="이미지 미리보기 닫기" onClick={() => setPreview(null)}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
          {preview && <Box component="img" src={preview.url} alt={preview.item.itemName || preview.item.itemNumber}
            sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
