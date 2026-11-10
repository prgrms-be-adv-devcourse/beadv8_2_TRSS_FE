import { useRef, useState, type DragEvent } from 'react'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import { useIsDesktop } from '../../lib/useMedia'
import { mmdd } from './format'
import { MOCK_DOCS, type AiDoc, type DocStatus } from './mock'
import { Notice } from './parts'
import s from './AdminFinance.module.css'

const COLS = '2fr .8fr .7fr .7fr .8fr .8fr'
const ACCEPT = '.pdf,.md,.markdown,.txt'
const STATUS: Record<DocStatus, [Tone, string]> = {
  DONE: ['green', '반영 완료'],
  PROCESSING: ['blue', '반영 중'],
  FAILED: ['red', '실패'],
}
const formatOf = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'pdf' ? 'PDF' : ext === 'md' || ext === 'markdown' ? 'Markdown' : ext === 'txt' ? 'TXT' : null
}

/**
 * 관리자 · AI 문서 (A12)
 * TODO(API 미구현): AI 문서 목록·업로드·삭제·다시 올리기 API — 지금은 화면 안 목업 상태만 바꿔요
 */
export default function AdminDocs() {
  const desktop = useIsDesktop()
  const [docs, setDocs] = useState<AiDoc[]>(MOCK_DOCS)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AiDoc | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const ok: AiDoc[] = []
    const rejected: string[] = []
    Array.from(files).forEach((file, i) => {
      const format = formatOf(file.name)
      if (!format) rejected.push(file.name)
      else
        ok.push({
          id: Date.now() + i,
          name: file.name,
          format,
          uploadedAt: new Date().toISOString(),
          chunks: null,
          status: 'PROCESSING',
        })
    })
    setError(rejected.length ? `PDF · Markdown · TXT만 올릴 수 있어요: ${rejected.join(', ')}` : '')
    if (ok.length) {
      setDocs((d) => [...ok, ...d])
      setNotice(`문서 ${ok.length}개를 올렸어요. 반영이 끝나면 챗봇 답변에 쓰여요. (예시 동작)`)
    }
  }

  function retry(doc: AiDoc) {
    setDocs((d) =>
      d.map((x) => (x.id === doc.id ? { ...x, status: 'PROCESSING', uploadedAt: new Date().toISOString() } : x)),
    )
    setNotice(`${doc.name}을 다시 올렸어요. (예시 동작)`)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const action = (d: AiDoc) =>
    d.status === 'FAILED' ? (
      <Button variant="outline" size="sm" onClick={() => retry(d)}>
        다시 올리기
      </Button>
    ) : d.status === 'DONE' || !desktop ? (
      <Button variant="dangerOutline" size="sm" onClick={() => setDeleteTarget(d)}>
        삭제
      </Button>
    ) : null

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept={ACCEPT}
      multiple
      hidden
      onChange={(e) => {
        addFiles(e.target.files)
        e.target.value = ''
      }}
    />
  )

  return (
    <ConsoleShell variant="admin" active="docs" title="AI 문서">
      <div className={s.page}>
        <Notice>{notice}</Notice>
        <Notice tone="error">{error}</Notice>
        {fileInput}
        {desktop ? (
          <>
            <button
              type="button"
              className={`${s.drop} ${dragOver ? s.dropOn : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <Icon name="plus" size={22} />
              <b>문서를 끌어다 놓거나 눌러서 올리기</b>
              <span>PDF · Markdown · TXT · 챗봇 답변에 참고 문서로 쓰여요</span>
            </button>
            <div className={c.table} role="table" aria-label="AI 문서 목록">
              <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
                <span>문서</span>
                <span>형식</span>
                <span>올린 날</span>
                <span>나뉜 조각</span>
                <span>상태</span>
                <span></span>
              </div>
              {docs.length === 0 && <Empty title="올린 문서가 없어요." />}
              {docs.map((d) => (
                <div key={d.id} role="row" className={`${c.tr} ${c.num}`} style={{ gridTemplateColumns: COLS }}>
                  <span className={`${c.ellipsis} ${c.strong}`}>{d.name}</span>
                  <span>{d.format}</span>
                  <span>{mmdd(d.uploadedAt)}</span>
                  <span>{d.chunks ?? '—'}</span>
                  <span>
                    <Badge tone={STATUS[d.status][0]}>{STATUS[d.status][1]}</Badge>
                  </span>
                  <span>{action(d)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <section className={s.mobileSection}>
              <h2 className={s.blockTitle}>챗봇이 참고할 문서</h2>
              <p className={s.meta}>
                배송·반품·쿠폰·충전 정책과 FAQ를 올리면 챗봇 답변에 쓰여요. 답변에는 참고한 문서 이름이 함께 보여요.
              </p>
              <button type="button" className={s.uploadBtn} onClick={() => fileRef.current?.click()}>
                + 문서 올리기 <span>PDF · Markdown · TXT</span>
              </button>
            </section>
            <section className={s.mobileSection}>
              {docs.length === 0 && <Empty title="올린 문서가 없어요." />}
              <ul className={s.plainList}>
                {docs.map((d) => (
                  <li key={d.id}>
                    <span className={s.docIcon} aria-hidden="true">
                      <Icon name="receipt" size={18} />
                    </span>
                    <span className={s.grow}>
                      <b className={c.ellipsis}>{d.name}</b>
                      <span className={s.meta}>{mmdd(d.uploadedAt)} 올림</span>
                    </span>
                    <Badge tone={STATUS[d.status][0]}>{STATUS[d.status][1]}</Badge>
                    {action(d)}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      {deleteTarget && (
        <Modal
          title="문서를 삭제할까요?"
          onClose={() => setDeleteTarget(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDocs((d) => d.filter((x) => x.id !== deleteTarget.id))
                  setNotice(`${deleteTarget.name}을 삭제했어요. (예시 동작)`)
                  setDeleteTarget(null)
                }}
              >
                삭제
              </Button>
            </>
          }
        >
          {deleteTarget.name}을 지우면 챗봇이 더 이상 이 문서를 참고하지 않아요.
        </Modal>
      )}
    </ConsoleShell>
  )
}
