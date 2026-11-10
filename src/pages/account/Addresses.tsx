import { useState, type ChangeEvent } from 'react'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Empty } from '../../components/ui/Misc'
import { Sheet } from '../../components/ui/Overlay'
import f from '../../components/ui/form.module.css'
import s from './account.module.css'

type Address = {
  id: number
  label: string
  recipient: string
  phone: string
  zipCode: string
  address1: string
  address2: string
  isDefault: boolean
}

// TODO(API 미구현): GET/POST /api/v1/users/me/addresses, PATCH·DELETE /api/v1/users/me/addresses/{id},
//   POST /api/v1/users/me/addresses/{id}/default — 배송지 관리. 지금은 화면 안 상태만 바뀌어요.
const MOCK: Address[] = [
  {
    id: 1,
    label: '집',
    recipient: '김팔레',
    phone: '010-1234-5678',
    zipCode: '06236',
    address1: '서울 강남구 테헤란로 123',
    address2: '4층 401호',
    isDefault: true,
  },
  {
    id: 2,
    label: '회사',
    recipient: '김팔레',
    phone: '010-1234-5678',
    zipCode: '04524',
    address1: '서울 중구 세종대로 110',
    address2: '12층',
    isDefault: false,
  },
]

const EMPTY: Omit<Address, 'id' | 'isDefault'> = {
  label: '',
  recipient: '',
  phone: '',
  zipCode: '',
  address1: '',
  address2: '',
}

function AddressSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: Omit<Address, 'id' | 'isDefault'>
  onClose: () => void
  onSave: (v: Omit<Address, 'id' | 'isDefault'>) => void
}) {
  const [v, setV] = useState(initial)
  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  const valid = v.recipient.trim() && v.phone.trim() && v.zipCode.trim() && v.address1.trim()
  const fields: [keyof typeof v, string, string][] = [
    ['label', '배송지 이름', '집, 회사'],
    ['recipient', '받는 사람', ''],
    ['phone', '연락처', '010-0000-0000'],
    ['zipCode', '우편번호', ''],
    ['address1', '주소', ''],
    ['address2', '상세 주소', '동·호수'],
  ]
  return (
    <Sheet
      title={initial.recipient ? '배송지 수정' : '배송지 추가'}
      onClose={onClose}
      footer={
        <Button size="lg" block disabled={!valid} onClick={() => onSave(v)}>
          저장하기
        </Button>
      }
    >
      {fields.map(([k, label, ph]) => (
        <div key={k} className={f.field}>
          <label htmlFor={`addr-${k}`} className={f.label}>
            {label}
          </label>
          <input id={`addr-${k}`} className={f.input} placeholder={ph} value={v[k]} onChange={set(k)} />
        </div>
      ))}
    </Sheet>
  )
}

/** 배송지 관리 (시안 보드 없음 — 계정 화면과 같은 톤으로) */
export default function AddressesPage() {
  const [list, setList] = useState<Address[]>(MOCK)
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [msg, setMsg] = useState('')

  function save(v: Omit<Address, 'id' | 'isDefault'>) {
    if (editing === 'new') {
      setList((l) => [...l, { ...v, id: Date.now(), isDefault: l.length === 0 }])
      setMsg('배송지를 추가했어요.')
    } else if (editing) {
      setList((l) => l.map((a) => (a.id === editing.id ? { ...a, ...v } : a)))
      setMsg('배송지를 고쳤어요.')
    }
    setEditing(null)
  }

  function makeDefault(id: number) {
    setList((l) => l.map((a) => ({ ...a, isDefault: a.id === id })))
    setMsg('기본 배송지를 바꿨어요.')
  }

  function remove(id: number) {
    setList((l) => {
      const next = l.filter((a) => a.id !== id)
      if (next.length && !next.some((a) => a.isDefault)) next[0] = { ...next[0], isDefault: true }
      return next
    })
    setMsg('배송지를 지웠어요.')
  }

  return (
    <AppFrame
      bottom={
        <BottomBar>
          <Button size="lg" onClick={() => setEditing('new')}>
            배송지 추가
          </Button>
        </BottomBar>
      }
    >
      <PageHeader title="배송지 관리" back="/mypage" />
      <p className={s.note}>주문할 때 기본 배송지가 먼저 선택돼요. (목업: 아직 서버에 저장되지 않아요)</p>
      {msg && (
        <p role="status" className={`${s.success} ${s.card}`}>
          {msg}
        </p>
      )}
      {list.length === 0 && <Empty title="등록한 배송지가 없어요">배송지를 추가해 주세요.</Empty>}
      {list.map((a) => (
        <article key={a.id} className={`${s.addr} ${a.isDefault ? s.addrOn : ''}`}>
          <div className={s.cardHead}>
            <h2>
              {a.label || a.recipient}
              {a.isDefault && <Badge tone="dark">기본</Badge>}
            </h2>
          </div>
          <p>
            {a.recipient} · {a.phone}
          </p>
          <p>
            ({a.zipCode}) {a.address1} {a.address2}
          </p>
          <div className={`${s.actions} ${s.cardFoot}`}>
            {!a.isDefault && (
              <Button variant="outline" size="sm" onClick={() => makeDefault(a.id)}>
                기본으로
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(a)}>
              수정
            </Button>
            <Button variant="dangerOutline" size="sm" onClick={() => remove(a.id)}>
              삭제
            </Button>
          </div>
        </article>
      ))}
      {editing && (
        <AddressSheet initial={editing === 'new' ? EMPTY : editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </AppFrame>
  )
}
