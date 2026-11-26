import { lazy } from 'react';

export const deliveryRoundPath = '/equipment-master-rounds';
export type DeliveryRoundPageComponent = typeof import('../pages/DeliveryRoundMasterPage').DeliveryRoundMasterPage;

export async function loadDeliveryRoundPage() {
  const { DeliveryRoundMasterPage } = await import('../pages/DeliveryRoundMasterPage');
  return { default: DeliveryRoundMasterPage };
}

export const LazyDeliveryRoundPage = lazy(loadDeliveryRoundPage);
