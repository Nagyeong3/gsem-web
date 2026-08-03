import {
  changeEvents,
  dashboardOverview,
  deliverySchedules,
  filterOptions,
  itemDetails,
  replacementGraph,
  toItemSummary,
} from '../../tools/stub-api-data.mjs';

/**
 * 프로토타입 전용 인메모리 저장소입니다.
 * 실제 DB 연결 시 동일한 메서드를 구현하는 MS Access 어댑터로 교체합니다.
 */
export class InMemoryGsemRepository {
  getDashboardOverview() {
    return dashboardOverview;
  }

  getFilterOptions() {
    return filterOptions;
  }

  getItems() {
    return itemDetails;
  }

  getItemById(itemId) {
    return itemDetails.find((item) => item.itemId === itemId) ?? null;
  }

  getDeliverySchedules() {
    return deliverySchedules;
  }

  getChangeEvents() {
    return changeEvents;
  }

  getReplacementGraph(rootItemId) {
    return replacementGraph.rootItemId === rootItemId ? replacementGraph : null;
  }

  toItemSummary(item) {
    return toItemSummary(item);
  }
}
