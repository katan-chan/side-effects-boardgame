import { t } from '../../i18n'

// The card-back artwork bakes its own gold "SIDE EFFECTS" wordmark into the
// centre, so the label/count used to fight it when overlaid on top (see
// deck.css history). They now render as a caption below the artwork instead:
// `.card-back` is purely the art (aria-hidden, no text), and the caption is a
// second, aria-hidden sibling. The accessible name lives once, on the
// outermost wrapper, so screen readers announce it exactly once rather than
// once from the wrapper's aria-label and again from the caption's own text.
export function CardBack({ count, label }: { count: number; label: string }) {
  return (
    <div className="card-back-wrap" aria-label={`${label}: ${count}`}>
      <div className="card-back" aria-hidden="true" />
      <span className="card-back-caption" aria-hidden="true">
        <small>{t('title')}</small>
        <strong>{count}</strong>
      </span>
    </div>
  )
}
