import { dashboardFixture } from '../mocks/dashboard';
import type { DashboardData } from '../types/domain';

export interface DashboardService {
  getOverview(): Promise<DashboardData>;
}

export const mockDashboardService: DashboardService = {
  async getOverview() {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 160);
    });
    return structuredClone(dashboardFixture);
  },
};
