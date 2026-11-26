import { toDeliverySchedule } from '../../mappers/deliveryScheduleMapper';
import type {
  DeliveryScheduleDto,
  DeliveryStatusDto,
  ItemFilterOptionsDto,
  PagedApiResponse,
  ApiResponse,
} from '../../types/api';
import type { DeliveryStatus } from '../../types/domain';
import type { DeliveryScheduleService } from '../deliveryScheduleService';
import type { ApiClient } from './apiClient';

const statusCodeMap: Record<DeliveryStatus, DeliveryStatusDto> = {
  예정: 'PLANNED',
  진행: 'IN_PROGRESS',
  완료: 'COMPLETED',
};

export function createHttpDeliveryScheduleService(
  apiClient: ApiClient,
): DeliveryScheduleService {
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
    async list(filters) {
      const options = await loadOptions();
      const params = new URLSearchParams({ page: '1', size: '100' });
      if (filters.query) params.set('query', filters.query);
      const businessId = options.businesses.find(
        (item) => item.name === filters.business,
      )?.businessId;
      const aircraftTypeCode = options.aircraftTypes.find(
        (item) => item.name === filters.aircraftType,
      )?.code;
      const destinationId = options.destinations.find(
        (item) => item.name === filters.destination,
      )?.destinationId;
      if (businessId) params.set('businessId', String(businessId));
      if (aircraftTypeCode) params.set('aircraftTypeCode', aircraftTypeCode);
      if (destinationId) params.set('destinationId', String(destinationId));
      if (filters.status) {
        params.set('status', statusCodeMap[filters.status as DeliveryStatus]);
      }

      const response = await apiClient.get<PagedApiResponse<DeliveryScheduleDto>>(
        '/deliveries',
        params,
      );
      return response.data.map(toDeliverySchedule);
    },
  };
}
