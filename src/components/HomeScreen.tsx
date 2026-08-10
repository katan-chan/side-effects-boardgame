import { t } from '../i18n'

interface HomeScreenProps {
  onLocal: () => void
  onOnline: () => void
}

export function HomeScreen({ onLocal, onOnline }: HomeScreenProps) {
  return (
    <main className="setup-screen">
      <section className="panel home-screen">
        <div className="logo-mark">💊</div>
        <h1>{t('title')}</h1>
        <p className="tagline">"Trị lành hay điên thêm?"</p>
        <div className="divider" />
        <div className="button-row">
          <button type="button" className="primary" onClick={onLocal}>
            {t('localGame')}
            <span className="btn-sub">Tạo ván local 2–8 người</span>
          </button>
          <button type="button" onClick={onOnline}>
            {t('onlineGame')}
            <span className="btn-sub">Tạo phòng &amp; rủ bạn bè</span>
          </button>
        </div>
      </section>
    </main>
  )
}
