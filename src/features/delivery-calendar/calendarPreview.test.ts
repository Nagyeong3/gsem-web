import { describe, expect, it } from 'vitest';
import { buildMockCalendarEvents } from './calendarEvents';
import { isCalendarDate, overlayCalendarPreview } from './calendarPreview';

const source = buildMockCalendarEvents();

describe('달력 일정 모의 날짜 변경', () => {
  it('날짜 입력의 실제 달력 유효성을 검사한다', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2026-11-19')).toBe(true);
  });
  it('원본 DB 조회 결과를 변경하지 않고 달력을 재배치한다', () => {
    const original = source[0];
    const updated = { ...original, date: '2027-01-02' };
    const changes = { [original.id]: { originalMonth: original.date.slice(0, 7), event: updated } };
    const sourceSnapshot = JSON.stringify(source);
    const oldMonth = overlayCalendarPreview(source, original.date.slice(0, 7), changes);
    expect(oldMonth.find((event) => event.id === original.id)?.date).toBe('2027-01-02');
    const nextMonth = overlayCalendarPreview([], '2027-01', changes);
    expect(nextMonth.map((event) => event.id)).toEqual([original.id]);
    expect(JSON.stringify(source)).toBe(sourceSnapshot);
  });
  it('동일 이벤트가 중복 조회되어도 화면에 하나만 표시한다', () => {
    const original = source[0];
    const changes = { [original.id]: { originalMonth: original.date.slice(0, 7), event: { ...original, date: '2026-08-12' } } };
    expect(overlayCalendarPreview([original], '2026-08', changes).filter(e => e.id === original.id)).toHaveLength(1);
  });
});
