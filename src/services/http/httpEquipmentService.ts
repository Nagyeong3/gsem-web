import { toEquipmentDetail, toEquipmentFilterOptions, toEquipmentSummary } from '../../mappers/equipmentMapper';
import type {
  ApiResponse,
  ItemDetailDto,
  ItemFilterOptionsDto,
  ItemSearchQueryDto,
  ItemSortFieldDto,
  ItemStatusDto,
  ItemSummaryDto,
  PagedApiResponse,
} from '../../types/api';
import type { EquipmentSearchRequest, EquipmentStatus } from '../../types/domain';
import type { EquipmentService } from '../equipmentService';
import type { ApiClient } from './apiClient';

const sortFieldMap: Record<EquipmentSearchRequest['sortKey'], ItemSortFieldDto> = {
  itemNum: 'itemNumber',
  itemNameKor: 'itemNameKor',
  aircraftType: 'aircraftType',
  business: 'business',
  system: 'subsystem',
  category: 'category',
  manager: 'manager',
  destination: 'destination',
  status: 'status',
  recentChangeDate: 'recentChangeDate',
};

const statusCodeMap: Partial<Record<EquipmentStatus, ItemStatusDto>> = {
  '사용 중': 'IN_USE',
  '대체 검토': 'REPLACEMENT_REVIEW',
  보류: 'ON_HOLD',
};

function findCode(values: Array<{ code: string; name: string }>, name: string) {
  return values.find((value) => value.name === name)?.code;
}

export function createHttpEquipmentService(apiClient: ApiClient): EquipmentService {
  let cachedOptions: ItemFilterOptionsDto | undefined;

  const loadOptions = async () => {
    if (!cachedOptions) {
      cachedOptions = (
        await apiClient.get<ApiResponse<ItemFilterOptionsDto>>('/items/filter-options')
      ).data;
    }
    return cachedOptions;
  };

  return {
    async search(request) {
      const options = await loadOptions();
      const queryDto: ItemSearchQueryDto = {
        query: request.filters.query || undefined,
        aircraftTypeCode: findCode(options.aircraftTypes, request.filters.aircraftType),
        businessId: options.businesses.find((item) => item.name === request.filters.business)?.businessId,
        subsystemCode: findCode(options.subsystems, request.filters.system),
        categoryCode: findCode(options.categories, request.filters.category),
        managerUserId: options.managers.find((item) => item.name === request.filters.manager)?.userId,
        destinationId: options.destinations.find(
          (item) => item.name === request.filters.destination,
        )?.destinationId,
        status: statusCodeMap[request.filters.status as EquipmentStatus],
        sort: `${sortFieldMap[request.sortKey]},${request.sortDirection}`,
        page: request.page,
        size: request.size,
      };
      const params = new URLSearchParams();
      Object.entries(queryDto).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
      const response = await apiClient.get<PagedApiResponse<ItemSummaryDto>>('/items', params);
      return {
        items: response.data.map(toEquipmentSummary),
        ...response.page,
        page: Math.max(1, response.page.page),
        totalPages: Math.max(1, response.page.totalPages),
      };
    },
    async getById(itemId) {
      const response = await apiClient.get<ApiResponse<ItemDetailDto>>(`/items/${itemId}`);
      return toEquipmentDetail(response.data);
    },
    async getFilterOptions() {
      return toEquipmentFilterOptions(await loadOptions());
    },
  };
}
