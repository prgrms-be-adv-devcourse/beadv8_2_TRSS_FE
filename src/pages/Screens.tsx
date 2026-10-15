import { Link } from 'react-router-dom'
import { screens } from '../routes'
import styles from './Screens.module.css'

const GROUPS = ['구매자', '판매자', '관리자'] as const

/** 모든 화면 바로가기 (개발용) */
export default function ScreensPage() {
  return (
    <div className={styles.page}>
      <img className={styles.logo} src="/images/logo.png" alt="Palette" />
      <h1>화면 목록</h1>
      <p className={styles.lead}>디자인 캔버스의 모든 화면이에요. 눌러서 바로 확인해요.</p>
      <div className={styles.groups}>
        {GROUPS.map((g) => (
          <section key={g} className={styles.group}>
            <h2>{g}</h2>
            <ul className={styles.list}>
              {screens
                .filter((s) => s.group === g)
                .map((s) => (
                  <li key={s.path}>
                    <Link to={s.demo ?? s.path}>
                      {s.title}
                      <span className={styles.path}>{s.path}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
