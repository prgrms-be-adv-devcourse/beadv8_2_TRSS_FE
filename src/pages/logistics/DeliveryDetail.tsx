import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { getLogisticsDelivery } from '../../lib/api/logistics'
import { useApi } from '../../lib/useApi'
import { Notice } from '../admin-finance/parts'
import DeliveryPanel from './DeliveryPanel'
import { useLogisticsCounts } from './shared'
import s from './Logistics.module.css'

const BACK = { READY: '/logistics/ready', SHIPPED: '/logistics/shipping', DELIVERED: '/logistics/delivered' } as const
const ACTIVE = { READY: 'ready', SHIPPED: 'shipping', DELIVERED: 'delivered' } as const

/** 물류 · 배송 상세 (모바일에서 배송 중·완료 카드를 누르면 와요. PC는 목록 오른쪽 패널과 같은 내용) */
export default function DeliveryDetail() {
  const { deliveryId } = useParams()
  const id = Number(deliveryId)
  const valid = Number.isInteger(id) && id > 0
  const detail = useApi(() => (valid ? getLogisticsDelivery(id) : Promise.resolve(null)), [id])
  const counts = useLogisticsCounts([])
  const [notice, setNotice] = useState('')
  const d = detail.data
  const k = counts.data

  return (
    <ConsoleShell
      variant="logistics"
      active={d ? ACTIVE[d.status] : 'shipping'}
      title="배송 상세"
      back={d ? BACK[d.status] : '/logistics/shipping'}
      hideMobileNav
      counts={k ? { ready: k.ready, shipping: k.shipping } : undefined}
    >
      <div className={s.page}>
        <Notice>{notice}</Notice>
        {!valid ? (
          <Empty title="배송을 찾을 수 없어요." />
        ) : detail.loading && !d ? (
          <Loading />
        ) : detail.error ? (
          <ErrorView message={detail.error} onRetry={detail.reload} />
        ) : d ? (
          <div className={`${c.card} ${s.detailCard}`}>
            <DeliveryPanel delivery={d} onChanged={(next) => detail.setData(next)} onNotice={setNotice} />
          </div>
        ) : null}
      </div>
    </ConsoleShell>
  )
}
