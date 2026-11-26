import type { CalendarEvent } from './calendarEvents';

export type PreviewDateChange = { originalMonth: string; event: CalendarEvent };
export type PreviewChanges = Record<string, PreviewDateChange>;

/** Calendar-only date preview; always overlays the source response without writing to the backend. */
export function overlayCalendarPreview(source: CalendarEvent[], month: string, changes: PreviewChanges): CalendarEvent[] {
  const included = new Set(source.map((event) => event.id));
  const patched = source.map((event) => changes[event.id]?.event ?? event);
  const movedIn = Object.values(changes)
    .map(({ event }) => event)
    .filter((event) => !included.has(event.id) && event.date.slice(0, 7) === month);
  return [...patched, ...movedIn];
}

/** Do not rely on Date.parse normalizing invalid dates such as 2026-02-30. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const verified = new Date(Date.UTC(year, month - 1, day));
  return verified.getUTCFullYear() === year && verified.getUTCMonth() + 1 === month && verified.getUTCDate() === day;
}
