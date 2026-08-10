import { t } from '../i18n'

interface FinishedScreenProps {
  winnerName: string
  onNewGame: () => void
}

export function FinishedScreen({ winnerName, onNewGame }: FinishedScreenProps) {
  return (
    <section className="finished-screen panel">
      <h1>{t('wins', { player: winnerName })}</h1>
      <button type="button" className="primary" onClick={onNewGame}>
        {t('newGame')}
      </button>
    </section>
  )
}
