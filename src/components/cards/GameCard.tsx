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
          <small className="card-label">{t('treatLabel')}</small>
          <span className="card-summary">{disorderName(definition.treats)}</span>
          <small className="card-label">{t('sideEffects')}</small>
          <div className="side-effect-list">
            {definition.sideEffects.map((effect) => (
              <span className="side-effect-chip" key={effect}>
                {disorderName(effect)}
              </span>
            ))}
          </div>
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
