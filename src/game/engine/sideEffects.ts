import { getCardDefinition } from '../cards/catalog'
import type { DisorderId } from '../cards/types'
import type { PlayerState } from './types'

export interface ExposureSlot {
  disorder: { definitionId: DisorderId }
  drug?: { definitionId: string; sideEffects?: readonly DisorderId[] }
}

/** Public-data-compatible exposure lookup for engine state and player views. */
export function getExposedDisordersFromSlots(
  slots: readonly ExposureSlot[],
): Set<DisorderId> {
  return new Set(
    slots.flatMap((slot) => {
      if (!slot.drug) return []
      if (slot.drug.sideEffects) return slot.drug.sideEffects
      const definition = getCardDefinition(slot.drug.definitionId)
      return definition?.cardType === 'drug' ? definition.sideEffects : []
    }),
  )
}

export function canReceiveDisorderInSlots(
  slots: readonly ExposureSlot[],
  disorderDefinitionId: DisorderId,
): boolean {
  return (
    !slots.some(
      (slot) => slot.disorder.definitionId === disorderDefinitionId,
    ) && getExposedDisordersFromSlots(slots).has(disorderDefinitionId)
  )
}

/** Returns every Disorder definition that the player's active Drugs can expose. */
export function getExposedDisorders(player: PlayerState): Set<DisorderId> {
  return getExposedDisordersFromSlots(player.psyche.slots)
}

export function canReceiveDisorder(
  player: PlayerState,
  disorderDefinitionId: DisorderId,
): boolean {
  return canReceiveDisorderInSlots(
    player.psyche.slots,
    disorderDefinitionId,
  )
}
