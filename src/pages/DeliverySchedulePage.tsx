import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Paper,
  Stack, Typography, TextField, Tooltip, Snackbar, Collapse,
} from '@mui/material';
import { CalendarMonthOutlined, ChevronLeft, ChevronRight, RefreshOutlined, TuneOutlined, ExpandMore, OpenInNew, CheckBoxOutlined, CheckBoxOutlineBlankOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AdaptiveFilterTags } from '../components/common/AdaptiveFilterTags';
import { PageHeader } from '../components/common/PageHeader';
import { preferenceKey, usePagePreference } from '../features/preferences/pagePreferences';
import { runtimeConfig } from '../config/runtime';
import { fetchBusinessOptions, type DbBusiness } from '../features/equipment-master/model';
import { mockBusinesses } from '../data/deliveryRoundMock';
import { monthDays, monthKey, monthRange } from '../features/delivery-calendar/calendarModel';
import { calendarVisibleCount, roundDestinationOptions, roundFilterView, replaceSelectionInScope, selectedOptions, selectionFromValues, type RoundFilters, type Selection } from '../features/delivery-calendar/roundSelection';
import { isCalendarDate, overlayCalendarPreview, type PreviewChanges, type PreviewDateChange } from '../features/delivery-calendar/calendarPreview';
import {
  buildMockCalendarEvents, calendarEventOptions, filterCalendarEvents,
  roundHue,
  type CalendarEvent, type CalendarEventType,
} from '../features/delivery-calendar/calendarEvents';

type MoveDraft = { event: CalendarEvent; targetDate: string };
type MoveHistory = { eventId: string; fromDate: string; toDate: string; label: string; before: PreviewDateChange | undefined };
const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
const demoEvents = buildMockCalendarEvents().filter(event => event.type === 'contract');
const defaultRoundFilters: RoundFilters = { rounds: null, destinations: null, statuses: null };
function validRoundFilters(value: unknown): value is RoundFilters {
  if (!value || typeof value !== 'object') return false;
  const f = value as RoundFilters;
  return (f.rounds === null || Array.isArray(f.rounds) && f.rounds.every(id => Number.isSafeInteger(id) && id > 0)) && [f.destinations, f.statuses].every(v => v === null || Array.isArray(v) && v.every(x => typeof x === 'string'));
}
function migrateRoundFilters(): RoundFilters {
  try {
    for (const key of ['roundDetails', 'details']) {
      const old: unknown = JSON.parse(localStorage.getItem(preferenceKey('delivery-calendar', key)) ?? 'null');
      if (validRoundFilters(old)) return { rounds: old.rounds?.length ? old.rounds : null, destinations: old.destinations?.length ? old.destinations : null, statuses: old.statuses?.length ? old.statuses : null };
    }
  } catch { /* 이전 설정이 손상된 경우 기본값 사용 */ }
  return defaultRoundFilters;
}
function validBusinessSelection(value: unknown): value is Selection<number> {
  return value === null || Array.isArray(value) && value.every(x => Number.isSafeInteger(x) && x > 0);
}
function migrateBusinessSelection(): Selection<number> {
  try {
    const old: unknown = JSON.parse(localStorage.getItem(preferenceKey('delivery-calendar', 'businessIds')) ?? 'null');
    if (validBusinessSelection(old) && old?.length) return old;
  } catch { /* 기본 전체 선택 */ }
  return null;
}
const apiMode = runtimeConfig.dataSource === 'api';

type BusinessResult =
  | { reload: number; data: DbBusiness[] }
  | { reload: number; error: string };
type CalendarResult =
  | { query: string; items: CalendarEvent[] }
  | { query: string; error: string };
const eventInfo = Object.fromEntries(calendarEventOptions.map((option) => [option.value, option])) as
  Record<CalendarEventType, (typeof calendarEventOptions)[number]>;

function currentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

async function fetchCalendarEvents(params: URLSearchParams, signal: AbortSignal): Promise<CalendarEvent[]> {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/delivery-calendar/events?${params}`, { signal });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('월간 일정 API가 서버에 없습니다 (HTTP 404). 현재 실행 중인 FastAPI가 이전 버전일 수 있습니다. 최신 backend 폴더를 반입한 후 FastAPI를 재시작하고 /openapi.json에서 /api/v1/delivery-calendar/events 등록 여부를 확인하세요.');
    }
    throw new Error(`월간 일정 조회 실패 (HTTP ${response.status})`);
  }
  const data = await response.json() as { items: CalendarEvent[] };
  return data.items.filter(event => event.type === 'contract');
}

export function DeliverySchedulePage() {
  const navigate = useNavigate();
  const [view, setView] = useState(currentMonth);
  const [businessResult, setBusinessResult] = useState<BusinessResult>();
  const [selectedIds, setSelectedIds] = usePagePreference<Selection<number>>('delivery-calendar', 'businessSelection', migrateBusinessSelection, validBusinessSelection);
  const [hideComplete, setHideComplete] = usePagePreference<boolean>('delivery-calendar', 'hideCompleted', false, (v): v is boolean => typeof v === 'boolean');
  const [filters, setFilters] = usePagePreference<RoundFilters>('delivery-calendar', 'roundSelection', migrateRoundFilters, validRoundFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState(420);
  const updateDetailFilter = <K extends keyof RoundFilters>(key: K, value: RoundFilters[K]) => setFilters(old => ({ ...old, [key]: value }));
  const [reload, setReload] = useState(0);
  const [calendarResult, setCalendarResult] = useState<CalendarResult>();
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  // Mock UI changes live only in this page session: never send write requests to SQL Server.
  const [mockEdits, setMockEdits] = useState<PreviewChanges>({});
  const [editDate, setEditDate] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<MoveDraft | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [history, setHistory] = useState<MoveHistory[]>([]);
  const [undoNotice, setUndoNotice] = useState(false);
  const dragRef = useRef<{ event: CalendarEvent; x: number; y: number; started: boolean; target: string | null } | null>(null);
  const suppressClick = useRef(false);
  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [today] = useState(() => new Date());

  const range = useMemo(() => monthRange(view.year, view.month), [view.year, view.month]);
  const days = useMemo(() => {
    const cells = monthDays(view.year, view.month);
    // Keep complete weeks, but avoid a redundant empty sixth week.
    return cells.slice(0, Math.ceil((cells.reduce((last, cell, index) => cell.inMonth ? index : last, 0) + 1) / 7) * 7);
  }, [view.year, view.month]);
  useEffect(() => {
    const element = calendarGridRef.current;
    if (!element) return;
    const update = () => setGridHeight(element.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const month = monthKey(view.year, view.month);
  const businesses = useMemo(() => apiMode
    ? (businessResult && 'data' in businessResult ? businessResult.data : [])
    : mockBusinesses, [businessResult]);
  const businessesLoading = apiMode && businessResult?.reload !== reload;
  const businessError = !businessesLoading && businessResult && 'error' in businessResult
    ? businessResult.error : '';

  const businessIds = useMemo(() => businesses.map(business => business.businessId), [businesses]);
  const selectedBusinessIds = useMemo(() => selectedOptions(selectedIds, businessIds), [businessIds, selectedIds]);

  useEffect(() => {
    if (!apiMode) return;
    let active = true;
    fetchBusinessOptions().then((data) => {
      if (active) setBusinessResult({ reload, data });
    }).catch((failure: unknown) => {
      if (active) setBusinessResult({ reload, error: failure instanceof Error ? failure.message : '사업 목록 조회 실패' });
    });
    return () => { active = false; };
  }, [reload]);

  const calendarParams = useMemo(() => {
    const params = new URLSearchParams({ dateFrom: range.start, dateTo: range.end, roundOnly: 'true' });
    selectedBusinessIds.forEach((id) => params.append('businessIds', String(id)));
    return params.toString();
  }, [range.start, range.end, selectedBusinessIds]);
  const shouldFetch = apiMode && !businessesLoading && !businessError && selectedBusinessIds.length > 0;
  const calendarQuery = shouldFetch ? `${reload}:${calendarParams}` : null;

  useEffect(() => {
    if (calendarQuery === null) return;
    const controller = new AbortController();
    fetchCalendarEvents(new URLSearchParams(calendarParams), controller.signal).then((items) => {
      if (!controller.signal.aborted) setCalendarResult({ query: calendarQuery, items });
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) {
        setCalendarResult({ query: calendarQuery, error: failure instanceof Error ? failure.message : '월간 일정 조회 실패' });
      }
    });
    return () => controller.abort();
  }, [calendarParams, calendarQuery]);

  const currentResult = calendarResult?.query === calendarQuery ? calendarResult : undefined;
  const loading = businessesLoading || (calendarQuery !== null && !currentResult);
  const error = businessError || (currentResult && 'error' in currentResult ? currentResult.error : '');
  const monthEvents = useMemo(() => {
    const source = apiMode ? (currentResult && 'items' in currentResult ? currentResult.items : []) : demoEvents;
    return filterCalendarEvents(overlayCalendarPreview(source, month, mockEdits), month,
      selectedBusinessIds, ['contract'], false);
  }, [currentResult, month, selectedBusinessIds, mockEdits]);
  const { events, roundIds, availableRoundIds, visibleRoundIds } = useMemo(() => roundFilterView(monthEvents, filters, hideComplete), [monthEvents, filters, hideComplete]);
  const roundOptions = useMemo(() => [...new Map(monthEvents.map(event => [event.subContractId, {
    id: event.subContractId, label: event.subContractName || '차수',
  }])).values()], [monthEvents]);
  const filterOptions = useMemo(() => roundDestinationOptions(monthEvents, filters.rounds), [monthEvents, filters.rounds]);
  const chipColor = (roundId?: number) => ({
    bgcolor: (theme: import('@mui/material').Theme) => {
      const hue = roundHue(roundId ?? 0);
      return theme.palette.mode === 'dark' ? `hsla(${hue}, 55%, 50%, .23)` : `hsl(${hue}, 60%, 92%)`;
    },
    borderLeft: `3px solid hsl(${roundHue(roundId ?? 0)}, 55%, 45%)`,
  });
  const activeFilterCount = Object.values(filters).filter(value => value !== null).length;
  const filterTextOptions = (key: 'destinations' | 'statuses', label: string, options: string[]) => {
    const scope = new Set(options.filter(option => key !== 'statuses' || !hideComplete || option !== '완료'));
    const value = selectedOptions(filters[key], options).filter(option => scope.has(option));
    return <Autocomplete multiple size="small" disableCloseOnSelect options={options}
      getOptionDisabled={option => !scope.has(option)}
      value={value} renderValue={(values, getItemProps) => <AdaptiveFilterTags labels={values} getItemProps={getItemProps}
        chipSx={index => chipColor(monthEvents.find(event => key === 'destinations'
          ? (event.destination?.trim() || '부대 미지정') === values[index]
          : (event.deliveryCompleted ? '완료' : '미완료') === values[index])?.subContractId)} />}
      onChange={(_, values, reason) => updateDetailFilter(key, reason === 'clear' ? [] : replaceSelectionInScope(filters[key], scope, values, options))}
      renderOption={(props, option, { selected }) => { const { key: optionKey, ...rest } = props; return <li key={optionKey} {...rest}>{selected ? <CheckBoxOutlined sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} /> : <CheckBoxOutlineBlankOutlined sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />}{option}</li>; }}
      renderInput={params => <TextField {...params} label={label} placeholder={value.length === 0 ? '선택 없음' : ''} />} />;
  };
  const applyPreviewMove = (event: CalendarEvent, nextDate: string) => {
    if (!isCalendarDate(nextDate) || event.date === nextDate) return;
    const previous = mockEdits[event.id];
    const updated = { ...event, date: nextDate };
    setHistory(items => [...items, { eventId: event.id, fromDate: event.date, toDate: nextDate,
      label: `${eventInfo[event.type].label} · ${event.businessName}`, before: previous }]);
    setMockEdits(current => ({ ...current, [event.id]: {
      originalMonth: current[event.id]?.originalMonth ?? event.date.slice(0, 7), event: updated,
    } }));
    setActiveEvent(null);
    setActiveDate(null);
    setEditDate(null);
    setPendingMove(null);
    setUndoNotice(true);
    const [year, targetMonth] = nextDate.split('-').map(Number);
    setView({ year, month: targetMonth - 1 });
  };
  const requestMove = (event: CalendarEvent, nextDate: string) => {
    if (!isCalendarDate(nextDate) || event.date === nextDate) return;
    setPendingMove({ event, targetDate: nextDate });
  };
  const undoLastMove = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setMockEdits(current => {
      const next = { ...current };
      if (last.before) next[last.eventId] = last.before;
      else delete next[last.eventId];
      return next;
    });
    setHistory(current => current.slice(0, -1));
    setUndoNotice(false);
    const [year, month] = last.fromDate.split('-').map(Number);
    setView({ year, month: month - 1 });
    setActiveEvent(null);
    setActiveDate(null);
  };
  const beginDrag = (event: ReactPointerEvent<HTMLElement>, item: CalendarEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragRef.current = { event: item, x: event.clientX, y: event.clientY, started: false, target: null };
  };
  useEffect(() => {
    const pointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (!drag.started && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
      if (!drag.started) setDragStartPosition({ x: event.clientX + 14, y: event.clientY + 14 });
      drag.started = true;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-calendar-day]');
      const day = target?.getAttribute('data-calendar-day') ?? null;
      drag.target = day && isCalendarDate(day) ? day : null;
      if (dragOverlayRef.current) {
        dragOverlayRef.current.style.left = `${event.clientX + 14}px`;
        dragOverlayRef.current.style.top = `${event.clientY + 14}px`;
      }
      setDraggingId(current => current === drag.event.id ? current : drag.event.id);
      setDropDate(current => current === drag.target ? current : drag.target);
    };
    const endDrag = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (drag.started) {
        suppressClick.current = true;
        if (drag.target) requestMove(drag.event, drag.target);
        window.setTimeout(() => { suppressClick.current = false; }, 0);
      }
      setDraggingId(null);
      setDropDate(null);
    };
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', endDrag);
    const cancelDrag = () => { dragRef.current = null; setDraggingId(null); setDropDate(null); };
    window.addEventListener('pointercancel', cancelDrag);
    return () => {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', cancelDrag);
    };
  });
  const byDate = useMemo(() => {
    const index = new Map<string, CalendarEvent[]>();
    events.forEach((event) => index.set(event.date, [...(index.get(event.date) ?? []), event]));
    return index;
  }, [events]);
  const draggedEvent = monthEvents.find(event => event.id === draggingId);
  const dailyEvents = activeDate ? byDate.get(activeDate) ?? [] : [];
  const moveMonth = (delta: number) => setView((old) => {
    const date = new Date(Date.UTC(old.year, old.month + delta, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  });
  const openDate = (date: string) => { setActiveEvent(null); setEditDate(null); setActiveDate(date); };

  return <Box sx={{ minWidth: 0, boxSizing: 'border-box', p: { xs: 1, md: 1.5 }, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', height: { xs: 'auto', md: 'calc(100dvh - 58px)' }, minHeight: { xs: 0, md: 620 } }}>
    <PageHeader title="납품 일정 관리" />
    <Paper variant="outlined" sx={{ mb: 1, p: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', flexShrink: 0 }}>
      <Autocomplete multiple size="small" disableCloseOnSelect sx={{ minWidth: 180, maxWidth: 320, flex: '1 1 200px' }}
        options={businesses} getOptionLabel={(business) => business.businessName}
        isOptionEqualToValue={(left, right) => left.businessId === right.businessId}
        value={businesses.filter((business) => selectedBusinessIds.includes(business.businessId))}
        renderValue={(values, getItemProps) => <AdaptiveFilterTags labels={values.map(business => business.businessName)} getItemProps={getItemProps}
          chipSx={index => chipColor(monthEvents.find(event => event.businessId === values[index].businessId)?.subContractId)} />}
        onChange={(_, values) => setSelectedIds(selectionFromValues(values.map((business) => business.businessId), businessIds))}
        renderOption={(props, option, { selected }) => { const { key, ...rest } = props; return <li key={key} {...rest}>{selected ? <CheckBoxOutlined sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} /> : <CheckBoxOutlineBlankOutlined sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />}{option.businessName}</li>; }}
        renderInput={(params) => <TextField {...params} label="사업 선택 (복수)" placeholder={selectedIds === null ? '전체 사업' : '선택 없음'} size="small" />} />
      <FormControlLabel control={<Checkbox checked={hideComplete} onChange={(_, checked) => setHideComplete(checked)} />}
        label="납품완료된 차수 숨김" sx={{ m: 0 }} />
      <Button size="small" variant={filterOpen || activeFilterCount ? 'outlined' : 'text'} startIcon={<TuneOutlined />} endIcon={<ExpandMore sx={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />} aria-expanded={filterOpen} onClick={() => setFilterOpen(value => !value)}>상세 필터{activeFilterCount ? ` (${activeFilterCount})` : ''}</Button>
      <Button size="small" onClick={() => { setSelectedIds(null); setHideComplete(false); setFilters(defaultRoundFilters); }}>필터 초기화</Button>
      <Button variant="text" size="small" startIcon={<RefreshOutlined />} onClick={() => setReload((value) => value + 1)}>새로고침</Button>
      {Object.keys(mockEdits).length > 0 && <Button size="small" color="warning" variant="outlined"
        onClick={() => { setMockEdits({}); setHistory([]); setActiveEvent(null); setEditDate(null); setUndoNotice(false); }}>
        임시 변경 초기화 ({Object.keys(mockEdits).length})</Button>}

      {history.length > 0 && <Button size="small" onClick={undoLastMove}>마지막 이동 취소</Button>}
      {history.length > 0 && <Tooltip title={history.map(h => `${h.label}: ${h.fromDate} → ${h.toDate}`).join('\n')}><Chip size="small" color="info" variant="outlined" label={`미리보기 변경 이력 ${history.length}건`} /></Tooltip>}
      {Object.keys(mockEdits).length > 0 && <Chip size="small" variant="outlined" color="warning" label="DB 미반영" />}
      <Collapse in={filterOpen} sx={{ width: '100%' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))' }, gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {filterTextOptions('destinations', '납품 부대', filterOptions)}
          <Autocomplete multiple size="small" disableCloseOnSelect options={roundIds}
            getOptionDisabled={id => !availableRoundIds.has(id)}
            getOptionLabel={id => roundOptions.find(r => r.id === id)?.label ?? `차수 ${id} (다른 월)`}
            value={visibleRoundIds} renderValue={(values, getItemProps) => <AdaptiveFilterTags labels={values.map(id => roundOptions.find(round => round.id === id)?.label ?? `차수 ${id}`)} getItemProps={getItemProps}
              chipSx={index => chipColor(values[index])} />}
            onChange={(_, values, reason) => updateDetailFilter('rounds', reason === 'clear' ? [] : replaceSelectionInScope(filters.rounds, availableRoundIds, values, roundIds))}
            renderOption={(props, option, { selected }) => { const { key, ...rest } = props; return <li key={key} {...rest}>{selected ? <CheckBoxOutlined sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} /> : <CheckBoxOutlineBlankOutlined sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />}{roundOptions.find(r => r.id === option)?.label ?? `차수 ${option}`}</li>; }}
            renderInput={params => <TextField {...params} label="사업 차수" placeholder={visibleRoundIds.length === 0 ? '선택 없음' : ''} />} />
          {filterTextOptions('statuses', '납품완료 상태', ['완료','미완료'])}
        </Box>
      </Collapse>
    </Paper>
    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <CalendarMonthOutlined color="primary" />
          <IconButton aria-label="이전 달" size="small" onClick={() => moveMonth(-1)}><ChevronLeft /></IconButton>
          <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, minWidth: 136, textAlign: 'center' }}>{view.year}년 {view.month + 1}월</Typography>
          <IconButton aria-label="다음 달" size="small" onClick={() => moveMonth(1)}><ChevronRight /></IconButton>
          <Button size="small" variant="outlined" onClick={() => setView(currentMonth())}>오늘</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip size="small" label={`전체 ${events.length}차수`} variant="outlined" />
          <Chip size="small" label={`완료 ${events.filter(event => event.deliveryCompleted).length}건`} color="success" variant="outlined" />
          <Chip size="small" label={`미완료 ${events.filter(event => !event.deliveryCompleted).length}건`} variant="outlined" />
        </Stack>
      </Box>
      {error && <Alert severity="error" action={<Button size="small" onClick={() => setReload((n) => n + 1)}>다시 시도</Button>}>{error}</Alert>}
      {loading && <Box aria-label="납품 일정 조회 중" sx={{ display: 'flex', justifyContent: 'center', py: 1 }}><CircularProgress size={20} /></Box>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
        {daysOfWeek.map((day, index) => <Box key={day} sx={{ textAlign: 'center', py: 0.5, borderRight: '1px solid', borderColor: 'divider',
          fontWeight: 700, fontSize: 12, color: index === 0 ? 'error.main' : 'text.secondary' }}>{day}</Box>)}
      </Box>
      {draggingId && <Box ref={dragOverlayRef} aria-hidden="true" sx={{ position: 'fixed', left: dragStartPosition.x, top: dragStartPosition.y, zIndex: 1600, pointerEvents: 'none',
        bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'primary.main',
        boxShadow: 5, borderRadius: 1, px: 1.5, py: 1, fontSize: 13, fontWeight: 700 }}>
        {draggedEvent && `${eventInfo[draggedEvent.type].label} · ${draggedEvent.businessName}`}
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{dropDate ? `${dropDate}로 이동` : '날짜 칸으로 이동'}</Typography>
      </Box>}
      <Box ref={calendarGridRef} role="grid" aria-label={`${view.year}년 ${view.month + 1}월 납품 달력`}
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: `repeat(${days.length / 7}, minmax(70px, 1fr))`, flex: 1, minHeight: `${days.length / 7 * 70}px`, overflowY: 'auto' }}>
        {days.map((cell) => {
          const isToday = cell.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const entries = byDate.get(cell.date) ?? [];
          const cardLimit = calendarVisibleCount(gridHeight, days.length / 7, entries.length);
          return <Box key={cell.date} role="gridcell" data-calendar-day={cell.date} aria-label={`${cell.date} 일정 ${entries.length}건`}
            sx={{ outline: dropDate === cell.date ? '2px solid #2563EB' : undefined,
              outlineOffset: -2, transition: 'background-color 100ms ease', minWidth: 0, minHeight: 0, p: 0.4, bgcolor: dropDate === cell.date ? '#DCEAFE' : (cell.inMonth ? 'background.paper' : 'action.hover'),
              borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Button size="small" variant={isToday ? 'contained' : 'text'} color={isToday ? 'primary' : 'inherit'}
              aria-label={`${cell.date} 선택`} disabled={!cell.inMonth} onClick={() => openDate(cell.date)}
              sx={{ minWidth: 25, p: 0.25, fontSize: 13, fontWeight: isToday ? 800 : 600,
                color: cell.inMonth ? undefined : 'text.disabled' }}>{cell.day}</Button>
            {entries.slice(0, cardLimit).map((event) => {
              const info = eventInfo[event.type];
              const subject = event.subContractName || '납품 차수';
              const hue = roundHue(event.subContractId);
              return <Tooltip key={event.id} title={`${info.label} · ${event.businessName} · ${subject}`} placement="top" arrow>
                <Box component="button" type="button"
                  aria-label={`${cell.date} ${info.label} ${event.businessName} ${subject} 상세`}
                  onPointerDown={(pointer) => beginDrag(pointer, event)}
                  onClick={() => { if (suppressClick.current) return; setActiveDate(cell.date); setActiveEvent(event); setEditDate(null); }}
                  sx={{ touchAction: 'none', userSelect: 'none', opacity: draggingId === event.id ? 0.45 : 1,
                    display: 'block', border: 0, borderLeft: `3px solid hsl(${hue}, 55%, 45%)`, borderRadius: 0.5,
                    textAlign: 'left', bgcolor: theme => theme.palette.mode === 'dark' ? `hsla(${hue}, 55%, 50%, .23)` : `hsl(${hue}, 60%, 92%)`, color: 'text.primary', cursor: 'grab', py: 0.25, px: 0.5,
                    mt: 0.25, width: '100%', overflow: 'hidden', height: 26, transition: 'filter 100ms ease', '&:hover': { filter: 'brightness(.94)' }, '&:focus-visible': { outline: '2px solid #2563EB' } }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: '20px' }} noWrap><Box component="span" sx={{ fontWeight: 800, mr: 0.5 }}>{event.deliveryCompleted ? '완료' : '예정'}</Box>{event.businessName} · {event.subContractName || '차수'}</Typography>
                </Box>
              </Tooltip>;
            })}
            {entries.length > cardLimit && <Tooltip placement="right" arrow enterDelay={250} title={
              <Box sx={{ maxHeight: 280, overflowY: 'auto', p: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>{cell.date} · 숨겨진 일정 {entries.length - cardLimit}건</Typography>
                {entries.slice(cardLimit).map(event => <Box key={event.id} sx={{ borderLeft: `3px solid hsl(${roundHue(event.subContractId)}, 60%, 65%)`, pl: 1, py: 0.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{event.businessName} · {event.subContractName || '차수'}</Typography>
                  <Typography sx={{ fontSize: 13 }}>{event.destination || '부대 미지정'} · {event.deliveryCompleted ? '완료' : '미완료'}</Typography>
                </Box>)}
              </Box>}>
              <Button size="small" onClick={() => openDate(cell.date)} aria-label={`${cell.date} +${entries.length - cardLimit}건 더보기`} sx={{ px: 0.5, py: 0, minHeight: 24, fontSize: 13, fontWeight: 600, maxWidth: '100%', whiteSpace: 'nowrap' }}>+{entries.length - cardLimit}건 더보기</Button>
            </Tooltip>}
          </Box>;
        })}
      </Box>
    </Paper>
    {!loading && !error && events.length === 0 && <Box sx={{ flexShrink: 0, py: 0.5 }}><Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
      선택한 조건에 해당하는 월간 일정이 없습니다.
      {!apiMode && <Button size="small" onClick={() => setView({ year: 2026, month: 7 })}>시연 일정 보기 (2026년 8월)</Button>}
    </Typography></Box>}
    <Dialog open={activeDate !== null} onClose={() => { setActiveDate(null); setActiveEvent(null); setEditDate(null); }} maxWidth="sm" fullWidth>
      <DialogTitle>{activeDate} 일정 {activeEvent ? '상세' : `(${dailyEvents.length}건)`}</DialogTitle>
      <DialogContent dividers>
        {(activeEvent ? [activeEvent] : dailyEvents).map((event) => {
          return <Paper key={event.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700 }}>{event.businessName} · {event.subContractName || '납품 차수'}</Typography>
              <Chip size="small" label={event.deliveryCompleted ? '납품완료' : '미완료'} color={event.deliveryCompleted ? 'success' : 'default'} />
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.75 }}>
              납품 부대: {event.destination || '-'}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button size="small" variant="outlined" onClick={() => { setActiveEvent(event); setEditDate(event.date); }}>
                일정 날짜 변경</Button>
              <Button size="small" endIcon={<OpenInNew fontSize="small" />} onClick={() => navigate(`/equipment-master-rounds?roundId=${event.subContractId}&businessId=${event.businessId}`)}>통합현황에서 보기</Button>
            </Stack>
            {activeEvent?.id === event.id && editDate !== null && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1.5 }}>
              <TextField size="small" type="date" label="변경할 날짜" value={editDate}
                onChange={(change) => setEditDate(change.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
              <Button variant="contained" size="small" disabled={!editDate || editDate === event.date}
                onClick={() => requestMove(event, editDate)}>미리보기 적용</Button>
              <Button size="small" onClick={() => setEditDate(null)}>취소</Button>
              <Typography variant="caption" sx={{ color: 'warning.main', width: '100%' }}>
                화면에서만 날짜가 이동합니다. DB는 변경되지 않으며 페이지를 다시 열면 원래 일정으로 돌아갑니다.
              </Typography>
            </Box>}
          </Paper>;
        })}
        {!activeEvent && dailyEvents.length === 0 && <Typography sx={{ color: 'text.secondary' }}>해당 날짜에 등록된 일정이 없습니다.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={() => { setActiveDate(null); setActiveEvent(null); setEditDate(null); }}>닫기</Button></DialogActions>
    </Dialog>
    <Dialog open={pendingMove !== null} onClose={() => setPendingMove(null)} maxWidth="xs" fullWidth>
      <DialogTitle>{pendingMove ? `${eventInfo[pendingMove.event.type].label} 변경 확인` : '일정 변경 확인'}</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontWeight: 700 }}>{pendingMove?.event.businessName} · {pendingMove?.event.subContractName || '납품 차수'}</Typography>
        <Typography sx={{ mt: 1 }}>{pendingMove?.event.date} → {pendingMove?.targetDate}</Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>UI 미리보기만 변경됩니다. 납품 예정일은 DB에 반영되지 않습니다.</Alert>
      </DialogContent>
      <DialogActions><Button onClick={() => setPendingMove(null)}>취소</Button>
        <Button variant="contained" onClick={() => { if (pendingMove) applyPreviewMove(pendingMove.event, pendingMove.targetDate); }}>미리보기 적용</Button>
      </DialogActions>
    </Dialog>
    <Snackbar open={undoNotice} autoHideDuration={6500} onClose={() => setUndoNotice(false)}
      message="일정을 화면에서만 이동했습니다. DB 미반영"
      action={<Button color="inherit" size="small" onClick={undoLastMove}>실행 취소</Button>} />
  </Box>;
}
