import { describe, expect, it } from 'vitest';
import { monthDays, monthRange, deliveryCalendarStatus, type DeliveryCalendarRound } from './calendarModel';
const base: DeliveryCalendarRound = {
  subContractId: 1, businessId: 1, businessName: '가 사업', destination: '가 부대',
  subContractName: '1차', deliveryDate: '2026-11-24', itemCount: 3, pointCount: 5,
  deliveredCount: 0, deliveryCompleted: false,
};
describe('월간 납품 달력', () => {
  it('윤년과 연말 달력 날짜를 정확히 만든다', () => {
    expect(monthRange(2028, 1)).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    const dates = monthDays(2026, 10);
    expect(dates).toHaveLength(42);
    expect(dates[0].date).toBe('2026-11-01');
    expect(dates[41].date).toBe('2026-12-12');
    expect(monthDays(2026, 11)[0].date).toBe('2026-11-29');
  });
  it('완료가 최우선이고 7일 이내 및 경과는 임박 상태다', () => {
    const today = new Date('2026-11-17T12:00:00+09:00');
    expect(deliveryCalendarStatus(base, today)).toBe('critical');
    expect(deliveryCalendarStatus({ ...base, deliveryDate: '2026-12-01' }, today)).toBe('scheduled');
    expect(deliveryCalendarStatus({ ...base, deliveryDate: '2026-11-01' }, today)).toBe('critical');
    expect(deliveryCalendarStatus({ ...base, deliveryCompleted: true }, today)).toBe('complete');
  });
});
