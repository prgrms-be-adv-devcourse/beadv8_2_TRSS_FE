import AppFrame from '../../components/ui/AppFrame'
import PageHeader from '../../components/ui/PageHeader'
import s from './info.module.css'

export type PolicyArticle = { title: string; items: string[] }

/**
 * 이용약관 · 개인정보처리방침 공통 화면 (목차 + 조항)
 * 회사 정보가 아직 예시 값이에요. 실제 운영 전에 법무 검토를 거쳐 본문을 바꿔요.
 */
export default function PolicyDoc({
  title,
  updated,
  articles,
}: {
  title: string
  updated: string
  articles: PolicyArticle[]
}) {
  return (
    <AppFrame>
      <PageHeader title={title} back />
      <div className={s.doc}>
        <p className={s.updated}>시행일 {updated}</p>
        <ol className={s.toc} aria-label="목차">
          {articles.map((a, i) => (
            <li key={a.title}>
              <a href={`#article-${i + 1}`}>
                제{i + 1}조 {a.title}
              </a>
            </li>
          ))}
        </ol>
        {articles.map((a, i) => (
          <section key={a.title} id={`article-${i + 1}`} className={s.article}>
            <h2>
              제{i + 1}조 {a.title}
            </h2>
            <ol>
              {a.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </AppFrame>
  )
}
