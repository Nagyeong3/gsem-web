import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { emptyEquipmentFilters } from '../../features/equipment-search/equipmentSearch';
// @ts-expect-error 개발용 Stub API는 Node.js ESM JavaScript 모듈로 관리한다.
import { createStubApiServer } from '../../../tools/stub-api.mjs';
import { ApiClient } from './apiClient';
import { createHttpDashboardService } from './httpDashboardService';
import { createHttpEquipmentService } from './httpEquipmentService';
import { createHttpDeliveryScheduleService } from './httpDeliveryScheduleService';
import { createHttpChangeRequestService } from './httpChangeRequestService';
import { createHttpReplacementHistoryService } from './httpReplacementHistoryService';

describe('Stub API와 프론트 HTTP Service 통합', () => {
  let server: {
    once(event: 'error', listener: (error: Error) => void): void;
    listen(port: number, host: string, listener: () => void): void;
    address(): { port: number } | string | null;
    close(callback: (error?: Error) => void): void;
  };
  let apiClient: ApiClient;

  beforeAll(async () => {
    server = createStubApiServer();
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Stub API 주소를 확인하지 못했습니다.');
    apiClient = new ApiClient({
      baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
      timeoutMs: 2_000,
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('대시보드 응답을 화면 모델로 변환하고 핵심 수치를 유지한다', async () => {
    const dashboard = await createHttpDashboardService(apiClient).getOverview();
    const metrics = new Map(dashboard.metrics.map((metric) => [metric.id, metric.value]));

    expect(metrics.get('attention')).toBe(12);
    expect(metrics.get('attention')).toBe(
      metrics.get('delay')! + metrics.get('replacement')! + metrics.get('approval')!,
    );
    expect(dashboard.monthlyDeliveries).toHaveLength(12);
  });

  it('필터 코드 변환부터 서버 검색·정렬·페이징까지 연결한다', async () => {
    const service = createHttpEquipmentService(apiClient);
    const result = await service.search({
      filters: { ...emptyEquipmentFilters, business: '나 사업' },
      sortKey: 'itemNum',
      sortDirection: 'asc',
      page: 1,
      size: 2,
    });

    expect(result.totalElements).toBe(4);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.itemNum.localeCompare(result.items[1]!.itemNum)).toBeLessThan(0);
    expect(result.items.every((item) => item.applications.some((entry) => entry.business === '나 사업'))).toBe(true);
  });

  it('상세 조회에서 복수 사업과 담당자 배열을 보존한다', async () => {
    const equipment = await createHttpEquipmentService(apiClient).getById(1);

    expect(equipment).toBeDefined();
    if (!equipment) throw new Error('상세 품목을 찾지 못했습니다.');
    expect(equipment.itemNum).toBe('XXXXXX-01');
    expect(equipment.applications.map((application) => application.business)).toEqual([
      '가 사업',
      '나 사업',
    ]);
    expect(equipment.managers.map((manager) => manager.name)).toEqual(['김책임', '이선임']);
  });

  it('빈 검색 결과와 404 오류를 화면 계약에 맞게 처리한다', async () => {
    const service = createHttpEquipmentService(apiClient);
    const emptyResult = await service.search({
      filters: { ...emptyEquipmentFilters, query: '존재하지 않는 품목' },
      sortKey: 'recentChangeDate',
      sortDirection: 'desc',
      page: 1,
      size: 10,
    });

    expect(emptyResult).toMatchObject({
      items: [],
      page: 1,
      totalElements: 0,
      totalPages: 1,
    });

    await expect(service.getById(999)).rejects.toMatchObject({
      status: 404,
      code: 'ITEM_NOT_FOUND',
    });
  });

  it('납품 일정 필터와 수량 정보를 HTTP 경계에서 유지한다', async () => {
    const items = await createHttpDeliveryScheduleService(apiClient).list({
      query: '',
      business: '가 사업',
      aircraftType: '',
      destination: '',
      status: '진행',
    });

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.business === '가 사업' && item.status === '진행')).toBe(true);
    expect(items.every((item) => item.plannedQuantity > 0)).toBe(true);
  });

  it('변경 신청의 상태·담당자·상세 비교 정보를 변환한다', async () => {
    const service = createHttpChangeRequestService(apiClient);
    const items = await service.list({
      query: '',
      changeType: '',
      status: '처리 완료',
      requester: '김책임',
    });

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.status === '처리 완료')).toBe(true);
    expect((await service.getById('CHG-XXXXX-01'))?.differences).toHaveLength(1);
  });

  it('대체 이력 그래프를 5단계 화면 모델로 변환한다', async () => {
    const graph = await createHttpReplacementHistoryService(apiClient).getGraph(1);

    expect(graph.items).toHaveLength(12);
    expect(graph.relations).toHaveLength(12);
    expect(Math.max(...graph.items.map((item) => item.depth))).toBe(5);
    expect(graph.items.some((item) => item.businesses.length > 1)).toBe(true);
  });
});
