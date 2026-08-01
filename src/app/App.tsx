import { CircularProgress, Box } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';

const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const EquipmentSearchPage = lazy(() =>
  import('../pages/EquipmentSearchPage').then((module) => ({
    default: module.EquipmentSearchPage,
  })),
);
const EquipmentDetailPage = lazy(() =>
  import('../pages/EquipmentDetailPage').then((module) => ({
    default: module.EquipmentDetailPage,
  })),
);
const DeliverySchedulePage = lazy(() =>
  import('../pages/DeliverySchedulePage').then((module) => ({
    default: module.DeliverySchedulePage,
  })),
);

export function App() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <Box sx={{ height: 'calc(100vh - 58px)', display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        }
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/equipment" element={<EquipmentSearchPage />} />
          <Route path="/equipment/:itemId" element={<EquipmentDetailPage />} />
          <Route path="/deliveries" element={<DeliverySchedulePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
