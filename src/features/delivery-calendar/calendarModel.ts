export type DeliveryCalendarRound = {
  subContractId: number;
  businessId: number;
  businessName: string;
  destination: string | null;
  subContractName: string | null;
  deliveryDate: string | null;
  itemCount: number;
  pointCount: number;
  deliveredCount: number;
  deliveryCompleted: boolean;
};
export type DeliveryCalendarStatus = 'complete' | 'critical' | 'scheduled';

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${monthKey(year, month)}-01`;
  const endDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { start, end: `${monthKey(year, month)}-${String(endDay).padStart(2, '0')}` };
}

export function monthDays(year: number, month: number): Array<{ date: string; day: number; inMonth: boolean }> {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(year, month, 1 + i - firstWeekday));
    const day = date.getUTCDate();
    return {
      date: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      day,
      inMonth: date.getUTCFullYear() === year && date.getUTCMonth() === month,
    };
  });
}

export function deliveryCalendarStatus(round: DeliveryCalendarRound, today: Date): DeliveryCalendarStatus {
  if (round.deliveryCompleted) return 'complete';
  if (!round.deliveryDate) return 'scheduled';
  const [year, month, day] = round.deliveryDate.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return 'scheduled';
  const due = Date.UTC(year, month - 1, day);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (due - now) / 86400000 <= 7 ? 'critical' : 'scheduled';
}
