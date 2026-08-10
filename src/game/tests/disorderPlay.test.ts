import { describe, expect, it } from 'vitest'
import { baseDeckEntries } from '../cards/definitions'
import type {
  CardInstance,
  DisorderDefinition,
  DrugDefinition,
} from '../cards/types'
import { playDisorder } from '../engine/disorderPlay'
import type { RandomSource } from '../engine/random'
import {
  canReceiveDisorderInSlots,
  getExposedDisorders,
} from '../engine/sideEffects'
import { createGame } from '../engine/setup'
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
  const game = createGame(['Ada', 'Ben'], { rng: new SeededRandom(60) })
  return drawForTurn(game, game.currentPlayerId, { rng: new SeededRandom(61) })
}

const currentPlayer = (game: ReturnType<typeof drawnGame>) =>
  game.players[game.currentPlayerIndex]

const opponent = (game: ReturnType<typeof drawnGame>) =>
  game.players.find((player) => player.id !== game.currentPlayerId)!

function moveToCurrentHand<T extends CardInstance>(
  game: ReturnType<typeof drawnGame>,
  card: T,
) {
  const replacement = currentPlayer(game).hand[0]

  return {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex
        ? { ...player, hand: [card, ...player.hand.slice(1)] }
        : player,
    ),
    drawPile: [
      replacement,
      ...game.drawPile.filter(
        (candidate) => candidate.instanceId !== card.instanceId,
      ),
    ],
  }
}

function exposedScenario() {
  const game = drawnGame()
  const target = opponent(game)
  const activeTreatment = target.psyche.slots
    .flatMap((slot, slotIndex) =>
      game.drawPile
        .filter(
          (card): card is CardInstance<DrugDefinition> =>
            card.cardType === 'drug' &&
            card.treats === slot.disorder.definitionId,
        )
        .map((drug) => ({ slotIndex, drug })),
    )
    .find(({ drug }) =>
      drug.sideEffects.some(
        (disorderId) =>
          !target.psyche.slots.some(
            (slot) => slot.disorder.definitionId === disorderId,
          ),
      ),
    )
  if (!activeTreatment)
    throw new Error('Test game must provide an exposed Disorder.')

  const exposedDisorderId = activeTreatment.drug.sideEffects.find(
    (disorderId) =>
      !target.psyche.slots.some(
        (slot) => slot.disorder.definitionId === disorderId,
      ),
  )!
  const disorder = game.drawPile.find(
    (card): card is CardInstance<DisorderDefinition> =>
      card.cardType === 'disorder' && card.definitionId === exposedDisorderId,
  )!
  const withDrug = {
    ...game,
    players: game.players.map((player) =>
      player.id === target.id
        ? {
            ...player,
            psyche: {
              slots: player.psyche.slots.map((slot, index) =>
                index === activeTreatment.slotIndex
                  ? { ...slot, drug: activeTreatment.drug }
                  : slot,
              ),
            },
          }
        : player,
    ),
    drawPile: game.drawPile.filter(
      (card) => card.instanceId !== activeTreatment.drug.instanceId,
    ),
  }
  const playableGame = moveToCurrentHand(withDrug, disorder)

  return {
    game: playableGame,
    disorder,
    targetId: target.id,
    activeTreatment,
    exposedDisorderId,
  }
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

describe('Drug side effect metadata', () => {
  it('matches the official player-aid mapping', () => {
    const drugs = baseDeckEntries
      .map((entry) => entry.definition)
      .filter(
        (definition): definition is DrugDefinition =>
          definition.cardType === 'drug',
      )
    const metadata = Object.fromEntries(
      drugs.map((drug) => [
        drug.displayName,
        { treats: drug.treats, sideEffects: drug.sideEffects },
      ]),
    )

    expect(metadata).toEqual({
      Chlorpromazine: { treats: 'madness', sideEffects: ['tremors'] },
      Clozapine: { treats: 'suicidal-thoughts', sideEffects: ['madness'] },
      Fluoxetine: {
        treats: 'depression',
        sideEffects: ['impotence', 'suicidal-thoughts', 'anorexia'],
      },
      Pramipexole: {
        treats: 'tremors',
        sideEffects: ['gambling-addiction', 'depression', 'madness'],
      },
      Lithium: { treats: 'gambling-addiction', sideEffects: ['impotence'] },
      Lorazepam: {
        treats: 'anxiety',
        sideEffects: ['suicidal-thoughts', 'depression', 'madness'],
      },
      Sildenafil: { treats: 'impotence', sideEffects: ['anxiety'] },
    })
  })

  it('exposes Side Effects from active Drugs', () => {
    const { game, activeTreatment, exposedDisorderId } = exposedScenario()
    const target = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!

    expect(getExposedDisorders(target)).toEqual(
      new Set(activeTreatment.drug.sideEffects),
    )
    const chlorpromazine = baseDeckEntries.find(
      (entry) => entry.definition.displayName === 'Chlorpromazine',
    )!.definition as DrugDefinition
    const fluoxetine = baseDeckEntries.find(
      (entry) => entry.definition.displayName === 'Fluoxetine',
    )!.definition as DrugDefinition
    expect(chlorpromazine.sideEffects).toEqual(['tremors'])
    expect(fluoxetine.sideEffects).toEqual([
      'impotence',
      'suicidal-thoughts',
      'anorexia',
    ])
    expect(
      canReceiveDisorderInSlots(
        target.psyche.slots.map((slot) => ({
          disorder: { definitionId: slot.disorder.definitionId },
          ...(slot.drug
            ? { drug: { definitionId: slot.drug.definitionId } }
            : {}),
        })),
        exposedDisorderId,
      ),
    ).toBe(true)
  })
})

describe('playing a Disorder through Side Effects', () => {
  it('moves the exposed Disorder from hand into the target Psyche', () => {
    const { game, disorder, targetId } = exposedScenario()
    const result = playDisorder(
      game,
      game.currentPlayerId,
      disorder.instanceId,
      targetId,
    )
    const target = result.players.find((player) => player.id === targetId)!

    expect(
      currentPlayer(result).hand.some(
        (card) => card.instanceId === disorder.instanceId,
      ),
    ).toBe(false)
    expect(target.psyche.slots.at(-1)?.disorder.instanceId).toBe(
      disorder.instanceId,
    )
    expect(result.turn.cardsPlayedThisTurn).toBe(1)
  })

  it('rejects targets without exposure and self-targeting', () => {
    const { game, disorder, targetId } = exposedScenario()
    const noExposure = {
      ...game,
      players: game.players.map((player) =>
        player.id === targetId
          ? {
              ...player,
              psyche: {
                slots: player.psyche.slots.map((slot) => ({
                  ...slot,
                  drug: undefined,
                })),
              },
            }
          : player,
      ),
    }
    expect(() =>
      playDisorder(
        noExposure,
        noExposure.currentPlayerId,
        disorder.instanceId,
        targetId,
      ),
    ).toThrow('not exposed')
    expect(() =>
      playDisorder(
        game,
        game.currentPlayerId,
        disorder.instanceId,
        game.currentPlayerId,
      ),
    ).toThrow('cannot target themself')
  })

  it('rejects duplicate Disorders even when the existing Disorder is treated', () => {
    const { game, targetId, activeTreatment } = exposedScenario()
    const target = game.players.find((player) => player.id === targetId)!
    const treatedDisorderId =
      target.psyche.slots[activeTreatment.slotIndex].disorder.definitionId
    const duplicateDisorder = game.drawPile.find(
      (card): card is CardInstance<DisorderDefinition> =>
        card.cardType === 'disorder' && card.definitionId === treatedDisorderId,
    )!
    const duplicateInHand = moveToCurrentHand(game, duplicateDisorder)

    expect(target.psyche.slots[activeTreatment.slotIndex].drug).toBeDefined()
    expect(() =>
      playDisorder(
        duplicateInHand,
        duplicateInHand.currentPlayerId,
        duplicateDisorder.instanceId,
        targetId,
      ),
    ).toThrow('already has this Disorder')
  })

  it('rejects invalid actor, phase, unheld card, and a third card play', () => {
    const { game, disorder, targetId } = exposedScenario()
    const otherId = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!.id

    expect(() =>
      playDisorder(game, otherId, disorder.instanceId, targetId),
    ).toThrow('current player')
    expect(() =>
      playDisorder(
        { ...game, turn: { ...game.turn, phase: 'draw' } },
        game.currentPlayerId,
        disorder.instanceId,
        targetId,
      ),
    ).toThrow('play phase')
    expect(() =>
      playDisorder(game, game.currentPlayerId, 'missing', targetId),
    ).toThrow('not in the current player hand')
    expect(() =>
      playDisorder(
        { ...game, turn: { ...game.turn, cardsPlayedThisTurn: 2 } },
        game.currentPlayerId,
        disorder.instanceId,
        targetId,
      ),
    ).toThrow('at most two')
  })

  it('conserves all 89 physical cards', () => {
    const { game, disorder, targetId } = exposedScenario()
    const result = playDisorder(
      game,
      game.currentPlayerId,
      disorder.instanceId,
      targetId,
    )
    const cards = allCards(result)

    expect(cards).toHaveLength(89)
    expect(new Set(cards.map((card) => card.instanceId)).size).toBe(89)
  })
})
