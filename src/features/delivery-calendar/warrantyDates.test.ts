import { describe, expect, it } from 'vitest';
import { addCalendarMonths } from './warrantyDates';

describe('warranty date UI preview', () => {
  it('adds 12 or 24 months without mutating the source date', () => {
    expect(addCalendarMonths('2026-11-19', 12)).toBe('2027-11-19');
    expect(addCalendarMonths('2026-11-19', 24)).toBe('2028-11-19');
  });
  it('clamps end-of-month and leap-day dates', () => {
    expect(addCalendarMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
  it('rejects malformed and invalid dates', () => {
    expect(addCalendarMonths('2026-02-30', 12)).toBe('');
    expect(addCalendarMonths('2026-11-19', -1)).toBe('');
  });
});
