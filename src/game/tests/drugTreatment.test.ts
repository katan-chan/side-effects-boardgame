import { describe, expect, it } from 'vitest'
import type { CardInstance, DrugDefinition } from '../cards/types'
import type { RandomSource } from '../engine/random'
import { createGame } from '../engine/setup'
import { playDrug } from '../engine/drugTreatment'
import { drawForTurn } from '../engine/turns'

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

const drawnGame = () => {
  const game = createGame(['Ada', 'Ben'], { rng: new SeededRandom(40) })
  return drawForTurn(game, game.currentPlayerId, { rng: new SeededRandom(41) })
}

const currentPlayer = (game: ReturnType<typeof drawnGame>) =>
  game.players[game.currentPlayerIndex]

const placeInCurrentHand = (
  game: ReturnType<typeof drawnGame>,
  card: CardInstance<DrugDefinition>,
) => {
  const player = currentPlayer(game)
  const replacedCard = player.hand[0]

  return {
    ...game,
    players: game.players.map((candidate, index) =>
      index === game.currentPlayerIndex
        ? { ...candidate, hand: [card, ...candidate.hand.slice(1)] }
        : candidate,
    ),
    drawPile: [
      replacedCard,
      ...game.drawPile.filter(
        (candidate) => candidate.instanceId !== card.instanceId,
      ),
    ],
  }
}

const withMatchingDrug = (game = drawnGame(), slotIndex = 0) => {
  const targetSlot = currentPlayer(game).psyche.slots[slotIndex]
  const drug = game.drawPile.find(
    (card): card is CardInstance<DrugDefinition> =>
      card.cardType === 'drug' &&
      card.treats === targetSlot.disorder.definitionId,
  )
  if (!drug) throw new Error('Test game must contain a matching Drug.')

  return { game: placeInCurrentHand(game, drug), drug, targetSlot }
}

const allCards = (game: ReturnType<typeof drawnGame>) => [
  ...game.players.flatMap((player) => [
    ...player.psyche.slots.flatMap((slot) =>
      slot.drug ? [slot.disorder, slot.drug] : [slot.disorder],
    ),
    ...player.hand,
  ]),
  ...game.drawPile,
  ...game.discardPile,
]

describe('Drug treatment', () => {
  it('plays a matching Drug from hand onto the owner Psyche Disorder', () => {
    const { game, drug, targetSlot } = withMatchingDrug()
    const result = playDrug(
      game,
      game.currentPlayerId,
      drug.instanceId,
      targetSlot.disorder.instanceId,
    )
    const treatedSlot = currentPlayer(result).psyche.slots[0]

    expect(
      currentPlayer(result).hand.some(
        (card) => card.instanceId === drug.instanceId,
      ),
    ).toBe(false)
    expect(treatedSlot.drug?.instanceId).toBe(drug.instanceId)
    expect(
      result.discardPile.some((card) => card.instanceId === drug.instanceId),
    ).toBe(false)
    expect(result.turn.cardsPlayedThisTurn).toBe(1)
  })

  it('rejects a Drug that does not treat the target Disorder', () => {
    const { game, targetSlot } = withMatchingDrug()
    const wrongDrug = game.drawPile.find(
      (card): card is CardInstance<DrugDefinition> =>
        card.cardType === 'drug' &&
        card.treats !== targetSlot.disorder.definitionId,
    )!
    const wrongDrugInHand = placeInCurrentHand(game, wrongDrug)

    expect(() =>
      playDrug(
        wrongDrugInHand,
        wrongDrugInHand.currentPlayerId,
        wrongDrug.instanceId,
        targetSlot.disorder.instanceId,
      ),
    ).toThrow('does not treat')
  })

  it('rejects a Drug outside the player hand and an opponent Disorder target', () => {
    const { game, targetSlot } = withMatchingDrug()
    const unheldDrug = game.drawPile.find(
      (card): card is CardInstance<DrugDefinition> => card.cardType === 'drug',
    )!
    const opponent = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!

    expect(() =>
      playDrug(
        game,
        game.currentPlayerId,
        unheldDrug.instanceId,
        targetSlot.disorder.instanceId,
      ),
    ).toThrow('not in the current player hand')
    expect(() =>
      playDrug(
        game,
        game.currentPlayerId,
        game.players[game.currentPlayerIndex].hand[0].instanceId,
        opponent.psyche.slots[0].disorder.instanceId,
      ),
    ).toThrow('not in the current player Psyche')
  })

  it('rejects a second treatment on the same Disorder', () => {
    const first = withMatchingDrug()
    const treated = playDrug(
      first.game,
      first.game.currentPlayerId,
      first.drug.instanceId,
      first.targetSlot.disorder.instanceId,
    )
    const secondDrug = treated.drawPile.find(
      (card): card is CardInstance<DrugDefinition> =>
        card.cardType === 'drug' &&
        card.treats === first.targetSlot.disorder.definitionId,
    )!
    const secondAttempt = placeInCurrentHand(treated, secondDrug)

    expect(() =>
      playDrug(
        secondAttempt,
        secondAttempt.currentPlayerId,
        secondDrug.instanceId,
        first.targetSlot.disorder.instanceId,
      ),
    ).toThrow('already has a Drug')
  })

  it('rejects non-current players, incorrect phases, and a third card play', () => {
    const { game, drug, targetSlot } = withMatchingDrug()
    const otherPlayerId = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!.id

    expect(() =>
      playDrug(
        game,
        otherPlayerId,
        drug.instanceId,
        targetSlot.disorder.instanceId,
      ),
    ).toThrow('current player')
    expect(() =>
      playDrug(
        { ...game, turn: { ...game.turn, phase: 'draw' } },
        game.currentPlayerId,
        drug.instanceId,
        targetSlot.disorder.instanceId,
      ),
    ).toThrow('play phase')
    expect(() =>
      playDrug(
        { ...game, turn: { ...game.turn, cardsPlayedThisTurn: 2 } },
        game.currentPlayerId,
        drug.instanceId,
        targetSlot.disorder.instanceId,
      ),
    ).toThrow('at most two')
  })

  it('preserves all 89 physical cards after treating a Disorder', () => {
    const { game, drug, targetSlot } = withMatchingDrug()
    const result = playDrug(
      game,
      game.currentPlayerId,
      drug.instanceId,
      targetSlot.disorder.instanceId,
    )
    const cards = allCards(result)

    expect(cards).toHaveLength(89)
    expect(new Set(cards.map((card) => card.instanceId)).size).toBe(89)
  })
})
