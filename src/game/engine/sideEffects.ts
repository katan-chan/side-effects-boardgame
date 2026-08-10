import type { DisorderId } from '../cards/types'
import type { PlayerState } from './types'

/** Returns every Disorder definition that the player's active Drugs can expose. */
export function getExposedDisorders(player: PlayerState): Set<DisorderId> {
  return new Set(
    player.psyche.slots.flatMap((slot) => slot.drug?.sideEffects ?? []),
  )
}

export function canReceiveDisorder(
  player: PlayerState,
  disorderDefinitionId: DisorderId,
): boolean {
  const alreadyHasDisorder = player.psyche.slots.some(
    (slot) => slot.disorder.definitionId === disorderDefinitionId,
  )

  return (
    !alreadyHasDisorder && getExposedDisorders(player).has(disorderDefinitionId)
  )
}
