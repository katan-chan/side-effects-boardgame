import { describe, expect, it } from 'vitest'
import type { CardInstance } from '../cards/types'
import type { RandomSource } from '../engine/random'
import { createGame } from '../engine/setup'
import {
  discardCard,
  drawForTurn,
  endTurn,
  registerCardPlayed,
  startTurn,
} from '../engine/turns'

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

const createTurnGame = () =>
  createGame(['Ada', 'Ben'], { rng: new SeededRandom(10) })

const currentPlayer = <T extends ReturnType<typeof createTurnGame>>(game: T) =>
  game.players[game.currentPlayerIndex]

const draw = (game: ReturnType<typeof createTurnGame>) =>
  drawForTurn(game, game.currentPlayerId, { rng: new SeededRandom(20) })

const allCards = (game: ReturnType<typeof createTurnGame>) => [
  ...game.players.flatMap((player) => [
    ...player.psyche.slots.flatMap((slot) =>
      slot.drug ? [slot.disorder, slot.drug] : [slot.disorder],
    ),
    ...player.hand,
  ]),
  ...game.drawPile,
  ...game.discardPile,
]

const placeholderCard = (game: ReturnType<typeof createTurnGame>) => {
  const card = currentPlayer(game).hand.find(
    (candidate) => candidate.cardType !== 'drug',
  )
  if (!card) throw new Error('Test game must include a non-Drug card.')
  return card
}

describe('turn lifecycle', () => {
  it('starts the current player in the draw phase', () => {
    const game = startTurn(createTurnGame())

    expect(game.turn.phase).toBe('draw')
    expect(game.turn.cardsDrawnThisTurn).toBe(0)
    expect(game.turn.cardsPlayedThisTurn).toBe(0)
  })

  it('draws exactly two cards and then enters play', () => {
    const game = createTurnGame()
    const afterDraw = draw(game)

    expect(currentPlayer(afterDraw).hand).toHaveLength(6)
    expect(afterDraw.turn.cardsDrawnThisTurn).toBe(2)
    expect(afterDraw.turn.phase).toBe('play')
    expect(() => draw(afterDraw)).toThrow('draw phase')
    expect(game.turn.phase).toBe('draw')
  })

  it('allows zero, one, or two played cards but rejects a third', () => {
    const zeroPlayed = draw(createTurnGame())
    expect(endTurn(zeroPlayed, zeroPlayed.currentPlayerId).turn.phase).toBe(
      'draw',
    )

    const onePlayedStart = draw(createTurnGame())
    const onePlayed = registerCardPlayed(
      onePlayedStart,
      onePlayedStart.currentPlayerId,
      placeholderCard(onePlayedStart).instanceId,
    )
    expect(onePlayed.turn.cardsPlayedThisTurn).toBe(1)

    const twoPlayed = registerCardPlayed(
      onePlayed,
      onePlayed.currentPlayerId,
      placeholderCard(onePlayed).instanceId,
    )
    expect(twoPlayed.turn.cardsPlayedThisTurn).toBe(2)
    expect(() =>
      registerCardPlayed(
        twoPlayed,
        twoPlayed.currentPlayerId,
        currentPlayer(twoPlayed).hand[0].instanceId,
      ),
    ).toThrow('at most two')
  })

  it('moves to the next player and wraps after the last player', () => {
    const first = draw(createTurnGame())
    const secondTurn = endTurn(first, first.currentPlayerId)
    const thirdTurn = endTurn(draw(secondTurn), secondTurn.currentPlayerId)

    expect(secondTurn.currentPlayerIndex).toBe(
      (first.currentPlayerIndex + 1) % 2,
    )
    expect(thirdTurn.currentPlayerIndex).toBe(first.currentPlayerIndex)
    expect(thirdTurn.turnNumber).toBe(3)
  })

  it('requires discarding to six cards before advancing the turn', () => {
    const afterDraw = draw(createTurnGame())
    const overflowCard = afterDraw.drawPile[0]
    const overflowHand = {
      ...afterDraw,
      players: afterDraw.players.map((player, index) =>
        index === afterDraw.currentPlayerIndex
          ? { ...player, hand: [...player.hand, overflowCard] }
          : player,
      ),
      drawPile: afterDraw.drawPile.slice(1),
    }
    const discardPhase = endTurn(overflowHand, overflowHand.currentPlayerId)

    expect(discardPhase.turn.phase).toBe('discard')
    expect(() => endTurn(discardPhase, discardPhase.currentPlayerId)).toThrow(
      'play phase',
    )
    expect(() =>
      discardCard(discardPhase, discardPhase.currentPlayerId, 'missing'),
    ).toThrow('not in the current player hand')

    const nextTurn = discardCard(
      discardPhase,
      discardPhase.currentPlayerId,
      currentPlayer(discardPhase).hand[0].instanceId,
    )
    expect(nextTurn.turn.phase).toBe('draw')
    expect(currentPlayer(nextTurn).id).not.toBe(discardPhase.currentPlayerId)
  })

  it('rejects invalid actor, phase, and card ownership commands', () => {
    const game = createTurnGame()
    const otherPlayer = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!

    expect(() => drawForTurn(game, otherPlayer.id)).toThrow('current player')
    expect(() =>
      registerCardPlayed(game, game.currentPlayerId, 'missing'),
    ).toThrow('play phase')
    expect(() => discardCard(game, game.currentPlayerId, 'missing')).toThrow(
      'discard phase',
    )

    const afterDraw = draw(game)
    expect(() =>
      registerCardPlayed(afterDraw, afterDraw.currentPlayerId, 'missing'),
    ).toThrow('not in the current player hand')
  })

  it('recycles discard cards deterministically when the draw pile is empty', () => {
    const game = createTurnGame()
    const emptiedDrawPile = {
      ...game,
      drawPile: [],
      discardPile: [...game.drawPile],
    }
    const first = drawForTurn(
      emptiedDrawPile,
      emptiedDrawPile.currentPlayerId,
      {
        rng: new SeededRandom(88),
      },
    )
    const second = drawForTurn(
      {
        ...createTurnGame(),
        drawPile: [],
        discardPile: [...createTurnGame().drawPile],
      },
      createTurnGame().currentPlayerId,
      { rng: new SeededRandom(88) },
    )

    expect(first.players[first.currentPlayerIndex].hand).toHaveLength(6)
    expect(first.discardPile).toEqual([])
    expect(first).toEqual(second)
  })

  it('conserves all 89 cards throughout a turn', () => {
    const afterDraw = draw(createTurnGame())
    const afterPlay = registerCardPlayed(
      afterDraw,
      afterDraw.currentPlayerId,
      placeholderCard(afterDraw).instanceId,
    )
    const cards = allCards(afterPlay)

    expect(cards).toHaveLength(89)
    expect(
      new Set(cards.map((card: CardInstance) => card.instanceId)).size,
    ).toBe(89)
  })
})
