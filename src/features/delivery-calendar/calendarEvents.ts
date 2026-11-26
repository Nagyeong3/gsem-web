import { mockRoundItems, mockRounds } from '../../data/deliveryRoundMock';

export type CalendarEventType = 'contract' | 'receiving' | 'delivered' | 'received';
export const calendarEventOptions: ReadonlyArray<{ value: CalendarEventType; label: string; color: string; background: string }> = [
  { value: 'contract', label: '납품 예정일', color: '#235FA8', background: '#EAF2FF' },
  { value: 'receiving', label: '입고 예정일', color: '#9A6318', background: '#FFF3DB' },
  { value: 'received', label: '실제 입고일', color: '#7C3AED', background: '#F0E8FF' },
  { value: 'delivered', label: '실제 납품일', color: '#16804B', background: '#E7F6EE' },
];
export const allCalendarEventTypes: CalendarEventType[] = ['contract', 'receiving', 'delivered', 'received'];
export const defaultCalendarEventTypes: CalendarEventType[] = ['contract', 'receiving', 'delivered'];

export type CalendarLine = {
  matchId: number; itemId: number | null; itemNumber: string | null; itemName: string | null;
  quantity: number | null; vendorName: string | null; buyerName: string | null;
  receivingExpected: string | null; receivedAt: string | null; deliveredAt: string | null;
  contractPrice: number | null; purchaseRequestNumber: string | null; purchaseOrderNumber: string | null;
};
export type RoundContext = { deliveryDate: string | null; items: CalendarLine[] };
export type CalendarFilters = { rounds: number[]; destinations: string[]; vendors: string[]; buyers: string[]; itemName: string; itemNumber: string; statuses: string[] };
export const defaultCalendarFilters: CalendarFilters = { rounds: [], destinations: [], vendors: [], buyers: [], itemName: '', itemNumber: '', statuses: [] };
export function validCalendarFilters(value: unknown): value is CalendarFilters {
  if (!value || typeof value !== 'object') return false;
  const f = value as CalendarFilters;
  return Array.isArray(f.rounds) && f.rounds.every(id => Number.isSafeInteger(id) && id > 0)
    && [f.destinations, f.vendors, f.buyers, f.statuses].every(v => Array.isArray(v) && v.every(x => typeof x === 'string'))
    && typeof f.itemName === 'string' && typeof f.itemNumber === 'string';
}
export function roundHue(id: number): number { return ((id * 137.508) % 360 + 360) % 360; }
export function matchingCalendarLines(lines: CalendarLine[], f: CalendarFilters): CalendarLine[] {
  const contains = (text: string | null, term: string) => (text ?? '').toLocaleLowerCase().includes(term.trim().toLocaleLowerCase());
  return lines.filter(line => contains(line.itemName, f.itemName) && contains(line.itemNumber, f.itemNumber)
    && (!f.vendors.length || f.vendors.includes(line.vendorName?.trim() ?? ''))
    && (!f.buyers.length || f.buyers.includes(line.buyerName?.trim() ?? '')));
}
export function filterCalendarDetails(events: CalendarEvent[], f: CalendarFilters): CalendarEvent[] {
  const itemFilter = Boolean(f.itemName.trim() || f.itemNumber.trim() || f.vendors.length || f.buyers.length);
  return events.filter(event => {
    if (f.rounds.length && !f.rounds.includes(event.subContractId)) return false;
    if (f.destinations.length && !f.destinations.includes(event.destination?.trim() ?? '')) return false;
    if (f.statuses.length && !f.statuses.includes(event.deliveryCompleted ? '완료' : '미완료')) return false;
    if (!itemFilter) return true;
    const lines = matchingCalendarLines(event.roundContext?.items ?? [], f);
    return event.type === 'contract' ? lines.length > 0 : lines.some(line => line.matchId === event.matchId);
  });
}
export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  date: string;
  businessId: number;
  businessName: string;
  subContractId: number;
  subContractName: string | null;
  destination: string | null;
  matchId: number | null;
  itemId: number | null;
  itemNumber: string | null;
  itemName: string | null;
  quantity: number | null;
  deliveryCompleted: boolean;
  roundContext?: RoundContext;
};

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
export function normalizeCalendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = value.slice(0, 10);
  return dayPattern.test(date) ? date : null;
}

export function filterCalendarEvents(events: CalendarEvent[], month: string,
  businessIds: number[], visibleTypes: CalendarEventType[], hideComplete: boolean): CalendarEvent[] {
  return events.filter((event) => event.date.slice(0, 7) === month)
    .filter((event) => businessIds.includes(event.businessId))
    .filter((event) => visibleTypes.includes(event.type))
    .filter((event) => !hideComplete || !event.deliveryCompleted);
}

export function buildMockCalendarEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const round of mockRounds) {
    const common = {
      businessId: round.businessId, businessName: round.businessName,
      subContractId: round.subContractId, subContractName: round.subContractName,
      destination: round.destination, deliveryCompleted: round.deliveryCompleted,
      roundContext: { deliveryDate: round.deliveryDate, items: mockRoundItems[round.subContractId] ?? [] },
    };
    const due = normalizeCalendarDate(round.deliveryDate);
    if (due) events.push({ ...common, id: `contract-${round.subContractId}`, type: 'contract',
      date: due, matchId: null, itemId: null, itemNumber: null, itemName: null, quantity: null });
    for (const item of mockRoundItems[round.subContractId] ?? []) {
      for (const { type, day } of [
        { type: 'receiving' as const, day: item.receivingExpected },
        { type: 'received' as const, day: item.receivedAt },
        { type: 'delivered' as const, day: item.deliveredAt },
      ]) {
        const date = normalizeCalendarDate(day);
        if (date) events.push({ ...common, id: `${type}-${item.matchId}`, type, date,
          matchId: item.matchId, itemId: item.itemId, itemNumber: item.itemNumber,
          itemName: item.itemName, quantity: item.quantity });
      }
    }
  }
  return events;
}

const storageKey = 'gsem.calendar.visibleEventTypes.v1';
export function readVisibleEventTypes(): CalendarEventType[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (Array.isArray(value)) {
      return allCalendarEventTypes.filter((type) => value.includes(type));
    }
  } catch { /* localStorage may be unavailable or malformed */ }
  return [...defaultCalendarEventTypes];
}
export function saveVisibleEventTypes(types: CalendarEventType[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(types)); } catch { /* optional preference */ }
}
