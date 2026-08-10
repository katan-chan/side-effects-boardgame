import { describe, expect, it } from 'vitest'
import { createGame } from '../engine/setup'
import type { RandomSource } from '../engine/random'

class SeededRandom implements RandomSource {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0
    return this.state / 2 ** 32
  }
}

const names = (count: number) =>
  Array.from({ length: count }, (_, index) => `Player ${index + 1}`)

const createSeededGame = (playerCount: number) =>
  createGame(names(playerCount), { rng: new SeededRandom(12345) })

const allCards = (game: ReturnType<typeof createGame>) => [
  ...game.players.flatMap((player) => [
    ...player.psyche.slots.flatMap((slot) =>
      slot.drug ? [slot.disorder, slot.drug] : [slot.disorder],
    ),
    ...player.hand,
  ]),
  ...game.drawPile,
  ...game.discardPile,
]

describe('base game setup', () => {
  it.each([
    [2, 4],
    [5, 4],
    [6, 3],
    [8, 3],
  ])(
    'gives %i players %i distinct Disorders each',
    (playerCount, disordersPerPlayer) => {
      const game = createSeededGame(playerCount)

      for (const player of game.players) {
        expect(player.psyche.slots).toHaveLength(disordersPerPlayer)
        expect(
          new Set(player.psyche.slots.map((slot) => slot.disorder.definitionId))
            .size,
        ).toBe(disordersPerPlayer)
      }
    },
  )

  it('deals four hand cards to each player and starts with no discards', () => {
    const game = createSeededGame(4)

    expect(game.players.every((player) => player.hand.length === 4)).toBe(true)
    expect(game.discardPile).toEqual([])
    expect(game.status).toBe('playing')
  })

  it('preserves all 89 card instances without putting one in two places', () => {
    const cards = allCards(createSeededGame(8))

    expect(cards).toHaveLength(89)
    expect(new Set(cards.map((card) => card.instanceId)).size).toBe(89)
  })

  it('is deterministic when supplied the same seeded RNG', () => {
    const first = createSeededGame(4)
    const second = createSeededGame(4)

    expect(first).toEqual(second)
  })

  it('rejects fewer than two players', () => {
    expect(() => createGame(['Only player'])).toThrow('2 to 8 players')
  })

  it('rejects more than eight players', () => {
    expect(() => createGame(names(9))).toThrow('2 to 8 players')
  })
})
