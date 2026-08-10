import { describe, expect, it } from 'vitest'
import type {
  CardInstance,
  DisorderDefinition,
  DrugDefinition,
  TherapyDefinition,
} from '../cards/types'
import { playDisorder } from '../engine/disorderPlay'
import { playDrug } from '../engine/drugTreatment'
import { playEpisode } from '../engine/episode'
import { getWinner, isPlayerFullyTreated } from '../engine/gameStatus'
import { hasCardConservation } from '../engine/invariants'
import type { RandomSource } from '../engine/random'
import { createGame } from '../engine/setup'
import { playTherapy } from '../engine/therapy'
import { discardCard, drawForTurn, endTurn } from '../engine/turns'

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
  const game = createGame(['Ada', 'Ben'], { rng: new SeededRandom(90) })
  return drawForTurn(game, game.currentPlayerId, { rng: new SeededRandom(91) })
}

const currentPlayer = (game: ReturnType<typeof drawnGame>) =>
  game.players[game.currentPlayerIndex]

function moveToCurrentHand<T extends CardInstance>(
  game: ReturnType<typeof drawnGame>,
  card: T,
) {
  const replaced = currentPlayer(game).hand[0]
  return {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex
        ? { ...player, hand: [card, ...player.hand.slice(1)] }
        : player,
    ),
    drawPile: [
      replaced,
      ...game.drawPile.filter(
        (candidate) => candidate.instanceId !== card.instanceId,
      ),
    ],
  }
}

function twoSlotGame() {
  const game = drawnGame()
  const player = currentPlayer(game)
  const depression = game.drawPile.find(
    (card): card is CardInstance<DisorderDefinition> =>
      card.cardType === 'disorder' && card.definitionId === 'depression',
  )!
  const anxiety = game.drawPile.find(
    (card): card is CardInstance<DisorderDefinition> =>
      card.cardType === 'disorder' && card.definitionId === 'anxiety',
  )!
  const returnedDisorders = player.psyche.slots.map((slot) => slot.disorder)
  return {
    ...game,
    players: game.players.map((candidate, index) =>
      index === game.currentPlayerIndex
        ? {
            ...candidate,
            psyche: {
              slots: [{ disorder: depression }, { disorder: anxiety }],
            },
          }
        : candidate,
    ),
    drawPile: [
      ...game.drawPile.filter(
        (card) =>
          card.instanceId !== depression.instanceId &&
          card.instanceId !== anxiety.instanceId,
      ),
      ...returnedDisorders,
    ],
  }
}

function gameReadyToWinWithDrug() {
  const game = twoSlotGame()
  const player = currentPlayer(game)
  const treatedSlot = player.psyche.slots[0]
  const untreatedSlot = player.psyche.slots[1]
  const firstDrug = game.drawPile.find(
    (card): card is CardInstance<DrugDefinition> =>
      card.cardType === 'drug' &&
      card.treats === treatedSlot.disorder.definitionId,
  )!
  const withFirstTreatment = {
    ...game,
    players: game.players.map((candidate, index) =>
      index === game.currentPlayerIndex
        ? {
            ...candidate,
            psyche: {
              slots: candidate.psyche.slots.map((slot, slotIndex) =>
                slotIndex === 0 ? { ...slot, drug: firstDrug } : slot,
              ),
            },
          }
        : candidate,
    ),
    drawPile: game.drawPile.filter(
      (card) => card.instanceId !== firstDrug.instanceId,
    ),
  }
  const finalDrug = withFirstTreatment.drawPile.find(
    (card): card is CardInstance<DrugDefinition> =>
      card.cardType === 'drug' &&
      card.treats === untreatedSlot.disorder.definitionId,
  )!

  return {
    game: moveToCurrentHand(withFirstTreatment, finalDrug),
    finalDrug,
    finalDisorder: untreatedSlot.disorder,
  }
}

describe('win condition', () => {
  it('wins immediately when the final Disorder receives a Drug', () => {
    const { game, finalDrug, finalDisorder } = gameReadyToWinWithDrug()

    expect(isPlayerFullyTreated(currentPlayer(game))).toBe(false)
    const result = playDrug(
      game,
      game.currentPlayerId,
      finalDrug.instanceId,
      finalDisorder.instanceId,
    )

    expect(isPlayerFullyTreated(currentPlayer(result))).toBe(true)
    expect(getWinner(result)?.id).toBe(result.currentPlayerId)
    expect(result.status).toBe('finished')
    expect(result.winnerPlayerId).toBe(result.currentPlayerId)
    expect(hasCardConservation(result)).toBe(true)
  })

  it('wins immediately with a mixture of Drug treatment and Therapy removal', () => {
    const prepared = gameReadyToWinWithDrug()
    const therapy = prepared.game.drawPile.find(
      (card): card is CardInstance<TherapyDefinition> =>
        card.cardType === 'therapy',
    )!
    const withTherapy = moveToCurrentHand(prepared.game, therapy)
    const result = playTherapy(
      withTherapy,
      withTherapy.currentPlayerId,
      therapy.instanceId,
      prepared.finalDisorder.instanceId,
    )

    expect(result.status).toBe('finished')
    expect(result.winnerPlayerId).toBe(result.currentPlayerId)
    expect(currentPlayer(result).psyche.slots).toHaveLength(1)
  })

  it('does not select a winner while one untreated Disorder remains', () => {
    const { game } = gameReadyToWinWithDrug()

    expect(getWinner(game)).toBeUndefined()
    expect(game.status).toBe('playing')
  })

  it('rejects every gameplay command after the game is finished', () => {
    const { game, finalDrug, finalDisorder } = gameReadyToWinWithDrug()
    const finished = playDrug(
      game,
      game.currentPlayerId,
      finalDrug.instanceId,
      finalDisorder.instanceId,
    )
    const opponent = finished.players.find(
      (player) => player.id !== finished.currentPlayerId,
    )!

    const calls = [
      () => drawForTurn(finished, finished.currentPlayerId),
      () => playDrug(finished, finished.currentPlayerId, 'x', 'y'),
      () => playDisorder(finished, finished.currentPlayerId, 'x', opponent.id),
      () =>
        playEpisode(finished, finished.currentPlayerId, 'x', opponent.id, 'y'),
      () => playTherapy(finished, finished.currentPlayerId, 'x', 'y'),
      () => discardCard(finished, finished.currentPlayerId, 'x'),
      () => endTurn(finished, finished.currentPlayerId),
    ]

    for (const command of calls) {
      expect(command).toThrow('game has finished')
    }
  })

  it('keeps the original game immutable when rejecting finished commands', () => {
    const { game, finalDrug, finalDisorder } = gameReadyToWinWithDrug()
    const finished = playDrug(
      game,
      game.currentPlayerId,
      finalDrug.instanceId,
      finalDisorder.instanceId,
    )
    const snapshot = structuredClone(finished)

    expect(() => endTurn(finished, finished.currentPlayerId)).toThrow()
    expect(finished).toEqual(snapshot)
  })
})
