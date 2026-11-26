import { describe, expect, it } from 'vitest';
import { dashboardFixture } from './dashboard';

const dayInMilliseconds = 24 * 60 * 60 * 1_000;

describe('대시보드 목업 일정', () => {
  it('납품 예정일과 D-day가 한국 날짜 기준으로 일치한다', () => {
    const koreaToday = new Date(Date.now() + 9 * 60 * 60 * 1_000).toISOString().slice(0, 10);
    const todayTimestamp = Date.parse(`${koreaToday}T00:00:00Z`);

    dashboardFixture.upcomingDeliveries.forEach((delivery) => {
      const deliveryTimestamp = Date.parse(`${delivery.deliveryDate}T00:00:00Z`);
      expect((deliveryTimestamp - todayTimestamp) / dayInMilliseconds).toBe(delivery.daysLeft);
    });
  });
});
