import { baseDeckEntries } from './definitions'
import type { CardDefinition } from './types'

/** Read-only lookup derived from deck definitions; presentation never owns gameplay mappings. */
export function getCardDefinition(
  definitionId: string,
): CardDefinition | undefined {
  return baseDeckEntries.find(
    (entry) => entry.definition.definitionId === definitionId,
  )?.definition
}
