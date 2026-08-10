import { t } from '../i18n'

interface HomeScreenProps {
  onLocal: () => void
  onOnline: () => void
}

export function HomeScreen({ onLocal, onOnline }: HomeScreenProps) {
  return (
    <main className="setup-screen">
      <section className="panel home-screen">
        <h1>{t('title')}</h1>
        <p>{t('chooseMode')}</p>
        <div className="button-row">
          <button type="button" className="primary" onClick={onLocal}>
            {t('localGame')}
          </button>
          <button type="button" onClick={onOnline}>
            {t('onlineGame')}
          </button>
        </div>
      </section>
    </main>
  )
}
