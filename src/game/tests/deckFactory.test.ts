import { describe, expect, it } from 'vitest'
import { baseDeckEntries } from '../cards/definitions'
import { createDeck } from '../cards/deckFactory'

const deck = createDeck()
const count = (definitionId: string) =>
  deck.filter((card) => card.definitionId === definitionId).length

describe('base deck', () => {
  it('contains exactly 89 cards with the expected type totals', () => {
    expect(deck).toHaveLength(89)
    expect(deck.filter((card) => card.cardType === 'disorder')).toHaveLength(38)
    expect(deck.filter((card) => card.cardType === 'drug')).toHaveLength(36)
    expect(deck.filter((card) => card.cardType === 'episode')).toHaveLength(10)
    expect(deck.filter((card) => card.cardType === 'therapy')).toHaveLength(5)
  })

  it('uses the official copy count for every definition', () => {
    for (const entry of baseDeckEntries) {
      expect(count(entry.definition.definitionId)).toBe(entry.copies)
    }
  })

  it('assigns a unique ID to every physical card', () => {
    expect(new Set(deck.map((card) => card.instanceId)).size).toBe(deck.length)
  })

  it('has no Anorexia Drug and includes six Tremors treatments', () => {
    expect(
      deck.some(
        (card) => (card.definitionId as string) === 'anorexia-treatment',
      ),
    ).toBe(false)
    expect(count('tremors-treatment')).toBe(6)
  })

  it('encodes Therapy restrictions for Anorexia and Tremors', () => {
    const anorexia = deck.find((card) => card.definitionId === 'anorexia')
    const tremors = deck.find((card) => card.definitionId === 'tremors')

    expect(anorexia?.cardType).toBe('disorder')
    expect(tremors?.cardType).toBe('disorder')
    if (anorexia?.cardType === 'disorder' && tremors?.cardType === 'disorder') {
      expect(anorexia.therapyAllowed).toBe(true)
      expect(tremors.therapyAllowed).toBe(false)
    }
  })
})
