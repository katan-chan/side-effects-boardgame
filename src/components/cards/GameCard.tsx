import { getCardDefinition } from '../../game/cards/catalog'
import type { CardType } from '../../game/cards/types'
import { cardName, cardTypeName, disorderName, locale, t } from '../../i18n'

export interface GameCardData {
  definitionId: string
  cardType: CardType
  displayName: string
}

export function GameCard({
  card,
  expanded = false,
}: {
  card: GameCardData
  expanded?: boolean
}) {
  const definition = getCardDefinition(card.definitionId)
  const name = cardName(card.definitionId, card.displayName)
  return (
    <div className={`game-card-content ${expanded ? 'expanded-card' : ''}`}>
      <small className="card-kicker">{cardTypeName(card.cardType)}</small>
      <strong className="card-title">{name}</strong>
      {definition?.cardType === 'disorder' && (
        <>
          <small className="card-label">{t('episodeEffect')}</small>
          <span className="card-summary">
            {locale.episodeDescriptions[definition.definitionId]}
          </span>
        </>
      )}
      {definition?.cardType === 'drug' && (
        <>
          <span className="card-summary">
            {t('treatLabel')}: {disorderName(definition.treats)}
          </span>
          <span className="card-summary">
            {t('mayCause')}: {expanded
              ? definition.sideEffects.map(disorderName).join(', ')
              : definition.sideEffects.length}
          </span>
        </>
      )}
      {definition?.cardType === 'episode' && (
        <span className="card-summary">{t('episodeInstructions')}</span>
      )}
      {definition?.cardType === 'therapy' && (
        <span className="card-summary">{t('therapyInstructions')}</span>
      )}
      {expanded && definition?.cardType === 'therapy' && (
        <small className="card-note">{t('therapyRestriction')}</small>
      )}
    </div>
  )
}
