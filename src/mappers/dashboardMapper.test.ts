import { describe, expect, it } from 'vitest';
import type { DashboardOverviewDto } from '../types/api';
import { toDashboardData } from './dashboardMapper';

describe('대시보드 DTO 변환', () => {
  it('API 코드와 필드명을 화면 모델로 변환한다', () => {
    const dto: DashboardOverviewDto = {
      metrics: [
        {
          id: 'ATTENTION',
          label: '확인이 필요한 업무',
          value: 12,
          unit: '건',
          tone: 'BRAND',
          helper: '확인 필요',
        },
      ],
      monthlyDeliveries: [
        {
          month: '1월',
          plannedQuantity: 10,
          deliveredQuantity: 8,
          achievementRate: 80,
        },
      ],
      recentChanges: [],
      upcomingDeliveries: [],
    };

    const result = toDashboardData(dto);
    expect(result.metrics[0]).toMatchObject({ id: 'attention', tone: 'brand', value: 12 });
    expect(result.monthlyDeliveries[0]).toEqual({
      month: '1월',
      plan: 10,
      actual: 8,
      achievement: 80,
    });
  });
});
