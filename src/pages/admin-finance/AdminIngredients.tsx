import { useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, Tabs, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import f from '../../components/ui/form.module.css'
import { useIsDesktop } from '../../lib/useMedia'
import {
  MOCK_INGREDIENTS,
  MOCK_INGREDIENT_QUEUE,
  type Ingredient,
  type IngredientGroup,
  type IngredientQueueItem,
} from './mock'
import { Notice } from './parts'
import s from './AdminFinance.module.css'

const COLS = '1.1fr 2fr 1fr .9fr .6fr'
const GROUP: Record<IngredientGroup, [Tone, string]> = {
  PREFER: ['green', '선호 성분'],
  AVOID: ['amber', '피하는 성분'],
  BASE: ['neutral', '기본 성분'],
}
type GroupFilter = 'ALL' | IngredientGroup
type MobileView = 'queue' | 'all'
type QueueAction = 'alias' | 'new' | 'base'
const QUEUE_DONE: Record<QueueAction, string> = {
  alias: '별칭으로 연결했어요',
  new: '새 성분으로 등록했어요',
  base: '기본 성분으로 정했어요',
}

/**
 * 관리자 · 성분 사전
 * TODO(API 미구현): 성분 사전 목록·추가·수정, 확인 필요 목록·처리 API — 지금은 화면 안 목업 상태만 바꿔요
 */
export default function AdminIngredients() {
  const desktop = useIsDesktop()
  const [items, setItems] = useState<Ingredient[]>(MOCK_INGREDIENTS)
  const [queue, setQueue] = useState<IngredientQueueItem[]>(MOCK_INGREDIENT_QUEUE)
  const [keyword, setKeyword] = useState('')
  const [group, setGroup] = useState<GroupFilter>('ALL')
  const [view, setView] = useState<MobileView>('queue')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    const q = keyword.trim()
    return items.filter(
      (i) =>
        (group === 'ALL' || i.group === group) && (!q || i.name.includes(q) || i.aliases.some((a) => a.includes(q))),
    )
  }, [items, keyword, group])

  function resolve(q: IngredientQueueItem, how: QueueAction) {
    setQueue((list) => list.filter((x) => x.id !== q.id))
    setNotice(`${q.name} · ${QUEUE_DONE[how]}. (예시 동작)`)
  }

  const queueList = (
    <>
      {queue.length === 0 && <p className={s.meta}>확인할 성분이 없어요.</p>}
      <ul className={s.queue}>
        {queue.map((q) => (
          <li key={q.id}>
            <div className={s.cardHead}>
              <b>{q.name}</b>
              <span className={s.meta}>상품 {q.count}개</span>
            </div>
            <p className={s.meta}>{q.where}</p>
            <p className={s.hint}>{q.hint}</p>
            <div className={s.cardActions}>
              <Button size="sm" onClick={() => resolve(q, 'alias')}>
                별칭으로 연결
              </Button>
              <Button variant="outline" size="sm" onClick={() => resolve(q, 'new')}>
                {desktop ? '새 성분 등록' : '새 성분'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => resolve(q, 'base')}>
                기본 성분
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )

  const addModal = adding && (
    <AddIngredientModal
      onClose={() => setAdding(false)}
      onAdd={(it) => {
        setItems((list) => [it, ...list])
        setNotice(`${it.name}을 성분 사전에 추가했어요. (예시 동작)`)
        setAdding(false)
      }}
    />
  )

  if (!desktop)
    return (
      <ConsoleShell variant="admin" active="ingredients" title="성분 사전">
        <Tabs
          label="성분 사전 보기"
          items={[
            { value: 'queue' as MobileView, label: `확인 필요 ${queue.length}` },
            { value: 'all' as MobileView, label: '전체 성분' },
          ]}
          value={view}
          onChange={setView}
        />
        <div className={s.page}>
          <Notice>{notice}</Notice>
          {view === 'queue' ? (
            <>
              <p className={s.meta}>판매자 입력 중 사전과 맞지 않은 이름이에요</p>
              {queueList}
            </>
          ) : (
            <>
              <div className={s.mobileTools}>
                <label className={`${c.mobileSearch} ${s.grow}`}>
                  <Icon name="search" size={18} />
                  <input
                    aria-label="성분명 또는 별칭"
                    placeholder="성분명 또는 별칭"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </label>
                <Button size="sm" onClick={() => setAdding(true)}>
                  + 추가
                </Button>
              </div>
              {rows.length === 0 && <Empty title="검색 결과가 없어요." />}
              <ul className={s.plainList}>
                {rows.map((i) => (
                  <li key={i.id}>
                    <span className={s.grow}>
                      <b>{i.name}</b>
                      <span className={s.meta}>별칭 · {i.aliases.join(', ')}</span>
                    </span>
                    <Badge tone={GROUP[i.group][0]}>{GROUP[i.group][1]}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {addModal}
      </ConsoleShell>
    )

  return (
    <ConsoleShell
      variant="admin"
      active="ingredients"
      title="성분 사전"
      description="판매자가 입력한 전성분을 추천용 표준 성분으로 바꾸는 기준이에요"
      actions={<Button onClick={() => setAdding(true)}>+ 성분 추가</Button>}
    >
      <div className={s.page}>
        <Notice>{notice}</Notice>
        <div className={`${c.split} ${s.split400}`}>
          <div>
            <div className={c.toolbar}>
              <div className={c.toolGroup}>
                <label className={c.search}>
                  <Icon name="search" size={16} />
                  <input
                    aria-label="성분명 또는 별칭"
                    placeholder="성분명 또는 별칭"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </label>
                <select
                  className={c.select}
                  aria-label="그룹"
                  value={group}
                  onChange={(e) => setGroup(e.target.value as GroupFilter)}
                >
                  <option value="ALL">모든 그룹</option>
                  <option value="PREFER">선호 성분</option>
                  <option value="AVOID">피하는 성분</option>
                  <option value="BASE">기본 성분</option>
                </select>
              </div>
            </div>
            <div className={c.table} role="table" aria-label="성분 목록">
              <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
                <span role="columnheader">표준 성분</span>
                <span role="columnheader">별칭 (판매자 입력이 이걸로 바뀌어요)</span>
                <span role="columnheader">설문 연결</span>
                <span role="columnheader">그룹</span>
                <span role="columnheader">상품</span>
              </div>
              {rows.length === 0 && <Empty title="검색 결과가 없어요." />}
              {rows.map((i) => (
                <div key={i.id} role="row" className={c.tr} style={{ gridTemplateColumns: COLS }}>
                  <b>{i.name}</b>
                  <span className={s.wrapText}>{i.aliases.join(', ')}</span>
                  <span>{i.survey ?? '—'}</span>
                  <span>
                    <Badge tone={GROUP[i.group][0]}>{GROUP[i.group][1]}</Badge>
                  </span>
                  <span className={c.num}>{i.productCount}</span>
                </div>
              ))}
            </div>
            <p className={s.foot}>
              별칭을 추가하거나 그룹을 바꾸면 이미 등록된 상품에도 다시 반영돼요. 기본 성분은 추천에 쓰지 않아요.
            </p>
          </div>
          <section className={c.card} aria-labelledby="ing-q">
            <h2 id="ing-q" className={s.blockTitle}>
              확인 필요 {queue.length}
            </h2>
            <p className={s.meta}>판매자 입력 중 사전과 맞지 않은 이름이에요</p>
            {queueList}
          </section>
        </div>
      </div>
      {addModal}
    </ConsoleShell>
  )
}

function AddIngredientModal({ onClose, onAdd }: { onClose: () => void; onAdd: (it: Ingredient) => void }) {
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [group, setGroup] = useState<IngredientGroup>('PREFER')
  return (
    <Modal
      title="성분 추가"
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onAdd({
                id: Date.now(),
                name: name.trim(),
                aliases: aliases
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean),
                survey: null,
                group,
                productCount: 0,
              })
            }
          >
            추가하기
          </Button>
        </>
      }
    >
      <div className={s.modalForm}>
        <label className={f.field}>
          <span className={f.label}>표준 성분</span>
          <input className={f.input} placeholder="예: 판테놀" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={f.field}>
          <span className={f.label}>별칭 (쉼표로 구분)</span>
          <input
            className={f.input}
            placeholder="예: 덱스판테놀, 프로비타민B5"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
          />
        </label>
        <label className={f.field}>
          <span className={f.label}>그룹</span>
          <select className={f.select} value={group} onChange={(e) => setGroup(e.target.value as IngredientGroup)}>
            <option value="PREFER">선호 성분</option>
            <option value="AVOID">피하는 성분</option>
            <option value="BASE">기본 성분</option>
          </select>
        </label>
      </div>
    </Modal>
  )
}
