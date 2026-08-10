import { describe, expect, it } from 'vitest'
import type {
  CardInstance,
  DisorderDefinition,
  DrugDefinition,
  TherapyDefinition,
} from '../cards/types'
import { playDisorder } from '../engine/disorderPlay'
import type { RandomSource } from '../engine/random'
import { createGame } from '../engine/setup'
import { playTherapy } from '../engine/therapy'
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
  const game = createGame(['Ada', 'Ben'], { rng: new SeededRandom(70) })
  return drawForTurn(game, game.currentPlayerId, { rng: new SeededRandom(71) })
}

const currentPlayer = (game: ReturnType<typeof drawnGame>) =>
  game.players[game.currentPlayerIndex]

function moveToCurrentHand<T extends CardInstance>(
  game: ReturnType<typeof drawnGame>,
  card: T,
) {
  const replacedCard = currentPlayer(game).hand[0]
  return {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex
        ? { ...player, hand: [card, ...player.hand.slice(1)] }
        : player,
    ),
    drawPile: [
      replacedCard,
      ...game.drawPile.filter(
        (candidate) => candidate.instanceId !== card.instanceId,
      ),
    ],
  }
}

function withTherapyFor(
  disorderDefinitionId: DisorderDefinition['definitionId'],
) {
  const game = drawnGame()
  const disorder = game.drawPile.find(
    (card): card is CardInstance<DisorderDefinition> =>
      card.cardType === 'disorder' &&
      card.definitionId === disorderDefinitionId,
  )!
  const oldSlot = currentPlayer(game).psyche.slots[0]
  const withDisorder = {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex
        ? {
            ...player,
            psyche: {
              slots: player.psyche.slots.map((slot, slotIndex) =>
                slotIndex === 0 ? { disorder } : slot,
              ),
            },
          }
        : player,
    ),
    drawPile: [
      oldSlot.disorder,
      ...game.drawPile.filter(
        (card) => card.instanceId !== disorder.instanceId,
      ),
    ],
  }
  const therapy = withDisorder.drawPile.find(
    (card): card is CardInstance<TherapyDefinition> =>
      card.cardType === 'therapy',
  )!

  return { game: moveToCurrentHand(withDisorder, therapy), therapy, disorder }
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

describe('Therapy', () => {
  it.each(['anorexia', 'depression'] as const)(
    'treats an untreated %s Disorder',
    (definitionId) => {
      const { game, therapy, disorder } = withTherapyFor(definitionId)
      const result = playTherapy(
        game,
        game.currentPlayerId,
        therapy.instanceId,
        disorder.instanceId,
      )

      expect(
        currentPlayer(result).psyche.slots.some(
          (slot) => slot.disorder.instanceId === disorder.instanceId,
        ),
      ).toBe(false)
      expect(result.discardPile.map((card) => card.instanceId)).toEqual([
        therapy.instanceId,
        disorder.instanceId,
      ])
      expect(result.turn.cardsPlayedThisTurn).toBe(1)
    },
  )

  it('rejects Tremors and a Disorder that already has a Drug', () => {
    const tremors = withTherapyFor('tremors')
    expect(() =>
      playTherapy(
        tremors.game,
        tremors.game.currentPlayerId,
        tremors.therapy.instanceId,
        tremors.disorder.instanceId,
      ),
    ).toThrow('cannot be treated with Therapy')

    const depression = withTherapyFor('depression')
    const drug = depression.game.drawPile.find(
      (card): card is CardInstance<DrugDefinition> =>
        card.cardType === 'drug' && card.treats === 'depression',
    )!
    const treated = {
      ...depression.game,
      players: depression.game.players.map((player, index) =>
        index === depression.game.currentPlayerIndex
          ? {
              ...player,
              psyche: {
                slots: player.psyche.slots.map((slot, slotIndex) =>
                  slotIndex === 0 ? { ...slot, drug } : slot,
                ),
              },
            }
          : player,
      ),
      drawPile: depression.game.drawPile.filter(
        (card) => card.instanceId !== drug.instanceId,
      ),
    }
    expect(() =>
      playTherapy(
        treated,
        treated.currentPlayerId,
        depression.therapy.instanceId,
        depression.disorder.instanceId,
      ),
    ).toThrow('already has a Drug')
  })

  it('rejects foreign targets, unheld Therapy, invalid actors/phases, and a third play', () => {
    const { game, therapy, disorder } = withTherapyFor('depression')
    const opponent = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!
    const unheldTherapy = game.drawPile.find(
      (card): card is CardInstance<TherapyDefinition> =>
        card.cardType === 'therapy',
    )!

    expect(() =>
      playTherapy(
        game,
        game.currentPlayerId,
        therapy.instanceId,
        opponent.psyche.slots[0].disorder.instanceId,
      ),
    ).toThrow('not in the current player Psyche')
    expect(() =>
      playTherapy(
        game,
        game.currentPlayerId,
        unheldTherapy.instanceId,
        disorder.instanceId,
      ),
    ).toThrow('not in the current player hand')
    expect(() =>
      playTherapy(game, opponent.id, therapy.instanceId, disorder.instanceId),
    ).toThrow('current player')
    expect(() =>
      playTherapy(
        { ...game, turn: { ...game.turn, phase: 'draw' } },
        game.currentPlayerId,
        therapy.instanceId,
        disorder.instanceId,
      ),
    ).toThrow('play phase')
    expect(() =>
      playTherapy(
        { ...game, turn: { ...game.turn, cardsPlayedThisTurn: 2 } },
        game.currentPlayerId,
        therapy.instanceId,
        disorder.instanceId,
      ),
    ).toThrow('at most two')
  })

  it('preserves all 89 physical cards after Therapy', () => {
    const { game, therapy, disorder } = withTherapyFor('anorexia')
    const result = playTherapy(
      game,
      game.currentPlayerId,
      therapy.instanceId,
      disorder.instanceId,
    )
    const cards = allCards(result)

    expect(cards).toHaveLength(89)
    expect(new Set(cards.map((card) => card.instanceId)).size).toBe(89)
  })

  it('allows the cured Disorder to be received again through a Side Effect', () => {
    const therapyScenario = withTherapyFor('depression')
    const game = therapyScenario.game
    const target = currentPlayer(game)
    const anxiety = game.drawPile.find(
      (card): card is CardInstance<DisorderDefinition> =>
        card.cardType === 'disorder' && card.definitionId === 'anxiety',
    )!
    const lorazepam = game.drawPile.find(
      (card): card is CardInstance<DrugDefinition> =>
        card.cardType === 'drug' && card.displayName === 'Lorazepam',
    )!
    const oldSecondSlot = target.psyche.slots[1]
    const exposed = {
      ...game,
      players: game.players.map((player, index) =>
        index === game.currentPlayerIndex
          ? {
              ...player,
              psyche: {
                slots: player.psyche.slots.map((slot, slotIndex) =>
                  slotIndex === 1
                    ? { disorder: anxiety, drug: lorazepam }
                    : slot,
                ),
              },
            }
          : player,
      ),
      drawPile: [
        oldSecondSlot.disorder,
        ...game.drawPile.filter(
          (card) =>
            card.instanceId !== anxiety.instanceId &&
            card.instanceId !== lorazepam.instanceId,
        ),
      ],
    }
    const afterTherapy = playTherapy(
      exposed,
      exposed.currentPlayerId,
      therapyScenario.therapy.instanceId,
      therapyScenario.disorder.instanceId,
    )
    const actorIndex =
      (afterTherapy.currentPlayerIndex + 1) % afterTherapy.players.length
    const depression = afterTherapy.drawPile.find(
      (card): card is CardInstance<DisorderDefinition> =>
        card.cardType === 'disorder' && card.definitionId === 'depression',
    )!
    const actorReady = moveToCurrentHand(
      {
        ...afterTherapy,
        currentPlayerIndex: actorIndex,
        currentPlayerId: afterTherapy.players[actorIndex].id,
        turn: {
          ...afterTherapy.turn,
          currentPlayerId: afterTherapy.players[actorIndex].id,
          cardsPlayedThisTurn: 0,
        },
      },
      depression,
    )
    const result = playDisorder(
      actorReady,
      actorReady.currentPlayerId,
      depression.instanceId,
      target.id,
    )

    expect(
      result.players
        .find((player) => player.id === target.id)!
        .psyche.slots.some(
          (slot) => slot.disorder.instanceId === depression.instanceId,
        ),
    ).toBe(true)
  })
})
