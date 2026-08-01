import type { ApiResponse, DashboardOverviewDto } from '../../types/api';
import { toDashboardData } from '../../mappers/dashboardMapper';
import type { DashboardService } from '../dashboardService';
import type { ApiClient } from './apiClient';

export function createHttpDashboardService(apiClient: ApiClient): DashboardService {
  return {
    async getOverview() {
      const response = await apiClient.get<ApiResponse<DashboardOverviewDto>>('/dashboard/overview');
      return toDashboardData(response.data);
    },
  };
}
