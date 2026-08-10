import { baseDeckEntries } from './definitions'
import type { CardInstance, DeckEntry } from './types'

export function createDeck(
  entries: readonly DeckEntry[] = baseDeckEntries,
): CardInstance[] {
  return entries.flatMap(({ definition, copies }) =>
    Array.from({ length: copies }, (_, index) => ({
      ...definition,
      instanceId: `${definition.definitionId}-${String(index + 1).padStart(2, '0')}`,
    })),
  )
}
