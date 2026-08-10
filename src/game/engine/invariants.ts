import type { CardInstance } from '../cards/types'
import type { GameState } from './types'

export function getAllCardInstances(game: GameState): CardInstance[] {
  return [
    ...game.players.flatMap((player) => [
      ...player.psyche.slots.flatMap((slot) =>
        slot.drug ? [slot.disorder, slot.drug] : [slot.disorder],
      ),
      ...player.hand,
    ]),
    ...game.drawPile,
    ...game.discardPile,
  ]
}

export function hasCardConservation(
  game: GameState,
  expectedCount = 89,
): boolean {
  const cards = getAllCardInstances(game)
  return (
    cards.length === expectedCount &&
    new Set(cards.map((card) => card.instanceId)).size === expectedCount
  )
}
