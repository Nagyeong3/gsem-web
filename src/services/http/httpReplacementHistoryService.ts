import { toReplacementGraph } from '../../mappers/replacementGraphMapper';
import type { ApiResponse, ReplacementGraphDto } from '../../types/api';
import type { ReplacementHistoryService } from '../replacementHistoryService';
import type { ApiClient } from './apiClient';

export function createHttpReplacementHistoryService(
  apiClient: ApiClient,
): ReplacementHistoryService {
  return {
    async getGraph(itemId = 1) {
      const response = await apiClient.get<ApiResponse<ReplacementGraphDto>>(
        `/items/${itemId}/replacement-graph`,
      );
      return toReplacementGraph(response.data);
    },
  };
}
