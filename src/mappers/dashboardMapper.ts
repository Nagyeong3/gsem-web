import type { DashboardOverviewDto } from '../types/api';
import type { DashboardData, DashboardMetric } from '../types/domain';

const metricIdMap: Record<DashboardOverviewDto['metrics'][number]['id'], DashboardMetric['id']> = {
  ATTENTION: 'attention',
  REGISTERED: 'registered',
  DELIVERY: 'delivery',
  DELAY: 'delay',
  REPLACEMENT: 'replacement',
  APPROVAL: 'approval',
};

const toneMap: Record<DashboardOverviewDto['metrics'][number]['tone'], DashboardMetric['tone']> = {
  BRAND: 'brand',
  NEUTRAL: 'neutral',
  INFO: 'info',
  ERROR: 'error',
  WARNING: 'warning',
};

export function toDashboardData(dto: DashboardOverviewDto): DashboardData {
  return {
    metrics: dto.metrics.map((metric) => ({
      ...metric,
      id: metricIdMap[metric.id],
      tone: toneMap[metric.tone],
    })),
    monthlyDeliveries: dto.monthlyDeliveries.map((delivery) => ({
      month: delivery.month,
      plan: delivery.plannedQuantity,
      actual: delivery.deliveredQuantity,
      achievement: delivery.achievementRate,
    })),
    changes: dto.recentChanges.map((change) => ({
      id: change.changeId,
      equipmentName: change.itemName,
      content: change.content,
      category: change.category,
      requester: change.requesterName,
      changedAt: change.changedAt,
      status: change.status === '완료' ? '완료' : '검토 중',
    })),
    upcomingDeliveries: dto.upcomingDeliveries.map((delivery) => ({
      equipmentName: delivery.itemName,
      itemNum: delivery.itemNumber,
      deliveryDate: delivery.deliveryDate,
      daysLeft: delivery.daysLeft,
      status: '임박',
    })),
  };
}
