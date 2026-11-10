import { Navigate } from 'react-router-dom'
import type { ScreenRoute } from '../routes'
import LogisticsDeliveries from '../pages/logistics/LogisticsDeliveries'
import DeliveryDetail from '../pages/logistics/DeliveryDetail'

/** 물류 화면 (물류 담당자 전용) */
export const logisticsScreens: ScreenRoute[] = [
  {
    path: '/logistics',
    title: '물류 (출고 대기로)',
    auth: 'LOGISTICS',
    group: '물류',
    element: <Navigate to="/logistics/ready" replace />,
  },
  {
    path: '/logistics/ready',
    title: '출고 대기',
    auth: 'LOGISTICS',
    group: '물류',
    element: <LogisticsDeliveries key="ready" tab="ready" />,
  },
  {
    path: '/logistics/shipping',
    title: '배송 중',
    auth: 'LOGISTICS',
    group: '물류',
    element: <LogisticsDeliveries key="shipping" tab="shipping" />,
  },
  {
    path: '/logistics/delivered',
    title: '배송 완료',
    auth: 'LOGISTICS',
    group: '물류',
    element: <LogisticsDeliveries key="delivered" tab="delivered" />,
  },
  {
    path: '/logistics/deliveries/:deliveryId',
    title: '배송 상세',
    auth: 'LOGISTICS',
    group: '물류',
    element: <DeliveryDetail />,
    demo: '/logistics/deliveries/1',
  },
]
