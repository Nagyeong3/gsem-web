import { toChangeRequest } from '../../mappers/changeRequestMapper';
import type {
  ApiResponse,
  ChangeEventDto,
  ChangeEventStatusDto,
  ItemFilterOptionsDto,
  PagedApiResponse,
} from '../../types/api';
import type { ChangeRequestStatus } from '../../types/domain';
import type { ChangeRequestService } from '../changeRequestService';
import type { ApiClient } from './apiClient';

const statusCodeMap: Record<ChangeRequestStatus, ChangeEventStatusDto> = {
  접수: 'RECEIVED',
  '검토 중': 'IN_REVIEW',
  '처리 완료': 'PROCESSED',
};

export function createHttpChangeRequestService(apiClient: ApiClient): ChangeRequestService {
  let cachedOptions: ItemFilterOptionsDto | undefined;

  const loadOptions = async () => {
    if (!cachedOptions) {
      cachedOptions = (
        await apiClient.get<ApiResponse<ItemFilterOptionsDto>>('/items/filter-options')
      ).data;
    }
    return cachedOptions;
  };

  const list: ChangeRequestService['list'] = async (filters) => {
    const options = await loadOptions();
    const params = new URLSearchParams({ page: '1', size: '100' });
    if (filters.query) params.set('query', filters.query);
    if (filters.changeType) params.set('changeType', filters.changeType);
    if (filters.status) {
      params.set('status', statusCodeMap[filters.status as ChangeRequestStatus]);
    }
    const requesterUserId = options.managers.find(
      (manager) => manager.name === filters.requester,
    )?.userId;
    if (requesterUserId) params.set('requesterUserId', String(requesterUserId));

    const response = await apiClient.get<PagedApiResponse<ChangeEventDto>>(
      '/change-events',
      params,
    );
    return response.data.map(toChangeRequest);
  };

  return {
    list,
    async getById(changeId) {
      const items = await list({
        query: changeId,
        changeType: '',
        status: '',
        requester: '',
      });
      return items.find((item) => item.changeId === changeId);
    },
  };
}
