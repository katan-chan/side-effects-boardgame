import { t } from '../../i18n'

export function CardBack({ count, label }: { count: number; label: string }) {
  return (
    <div className="card-back" aria-label={`${label}: ${count}`}>
      <span className="card-back-mark">✦</span>
      <small>{t('title')}</small>
      <strong>{count}</strong>
    </div>
  )
}
