import { describe, expect, it } from 'vitest';
import { buildMockCalendarEvents, filterCalendarEvents, normalizeCalendarDate } from './calendarEvents';

describe('세 종류 월간 일정 및 사용자 선택', () => {
  const events = buildMockCalendarEvents();
  it('계약상 납기 1건과 입고 예정·실제 납품 품목별 날짜를 각각 유지한다', () => {
    expect(events.filter((e) => e.type === 'contract')).toHaveLength(5);
    expect(events.filter((e) => e.type === 'receiving')).toHaveLength(10);
    expect(events.filter((e) => e.type === 'delivered')).toHaveLength(5);
    expect(events.filter((e) => e.type === 'delivered' && e.date === '2026-08-12')).toHaveLength(3);
  });
  it('납기 월과 다른 입고·납품 이벤트도 별도 월에 표시한다', () => {
    const august = filterCalendarEvents(events, '2026-08', [101], ['receiving', 'delivered'], false);
    expect(august.some((event) => event.subContractId === 1001 && event.type === 'delivered')).toBe(true);
    expect(august.some((event) => event.subContractId === 1002 && event.type === 'contract')).toBe(false);
  });
  it('복수선택, 선택 없음, 완료 숨김이 각각 동작한다', () => {
    expect(filterCalendarEvents(events, '2026-08', [101], [], false)).toHaveLength(0);
    expect(filterCalendarEvents(events, '2026-08', [101], ['contract'], false)).toHaveLength(1);
    expect(filterCalendarEvents(events, '2026-08', [101], ['contract', 'receiving'], false).length).toBeGreaterThan(1);
    const incomplete = filterCalendarEvents(events, '2026-08', [101], ['contract', 'receiving'], true);
    expect(incomplete.map((event) => event.id)).toEqual(['receiving-4', 'receiving-5']);
  });
  it('DATETIME 날짜를 일자로 정규화한다', () => {
    expect(normalizeCalendarDate('2026-11-17T15:01:00')).toBe('2026-11-17');
    expect(normalizeCalendarDate(null)).toBe(null);
  });
});
