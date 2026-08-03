/**
 * HTTP와 데이터 저장 방식을 분리하는 조회 서비스입니다.
 */
export class GsemService {
  constructor(repository) {
    this.repository = repository;
  }

  getDashboardOverview() {
    return this.repository.getDashboardOverview();
  }

  getFilterOptions() {
    return this.repository.getFilterOptions();
  }

  getItems() {
    return this.repository.getItems();
  }

  getItemById(itemId) {
    return this.repository.getItemById(itemId);
  }

  getDeliverySchedules() {
    return this.repository.getDeliverySchedules();
  }

  getChangeEvents() {
    return this.repository.getChangeEvents();
  }

  getReplacementGraph(rootItemId) {
    return this.repository.getReplacementGraph(rootItemId);
  }

  toItemSummary(item) {
    return this.repository.toItemSummary(item);
  }
}
