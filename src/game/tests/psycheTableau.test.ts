import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Psyche } from '../../components/GameBoard'
import { createGame } from '../../game/engine/setup'
import { getCardDefinition } from '../../game/cards/catalog'
import { disorderName } from '../../i18n'
import type { CardInstance, DrugDefinition } from '../../game/cards/types'

describe('physical Psyche tableau cards', () => {
  it('renders an untreated Episode effect directly without inspect state', () => {
    const player = createGame(['Ada', 'Ben']).players[0]
    const html = renderToStaticMarkup(
      createElement(Psyche, { player, playerId: player.id }),
    )
    expect(html).toContain('Cơn phát bệnh')
    expect(html).toContain('Chưa điều trị')
  })

  it('renders treated Drug and all Side Effects directly on the tableau card', () => {
    const game = createGame(['Ada', 'Ben'])
    const player = game.players[0]
    const slot = player.psyche.slots.find(
      (candidate) => candidate.disorder.definitionId !== 'anorexia',
    )!
    const drug = game.drawPile.find(
      (card): card is CardInstance<DrugDefinition> =>
        card.cardType === 'drug' &&
        card.definitionId === `${slot.disorder.definitionId}-treatment`,
    )
    if (!drug) throw new Error('Expected matching Drug in deck')
    const treatedPlayer = {
      ...player,
      psyche: { slots: [{ ...slot, drug }] },
    }
    const html = renderToStaticMarkup(
      createElement(Psyche, { player: treatedPlayer, playerId: player.id }),
    )
    expect(html).toContain('Đã điều trị')
    expect(html).toContain(drug.displayName)
    const definition = getCardDefinition(drug.definitionId)
    if (definition?.cardType !== 'drug') throw new Error('Expected Drug')
    definition.sideEffects.forEach((effect) =>
      expect(html).toContain(disorderName(effect)),
    )
    expect(html).not.toMatch(/\+\d/)
  })
})
