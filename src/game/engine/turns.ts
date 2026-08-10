import type { CardInstance } from '../cards/types'
import { shuffle, systemRandom, type RandomSource } from './random'
import type { GameState, PlayerState, TurnState } from './types'

const CARDS_PER_TURN = 2
const MAX_CARDS_PLAYED_PER_TURN = 2
const HAND_LIMIT = 6

export interface TurnCommandOptions {
  rng?: RandomSource
}

function assertCurrentPlayer(game: GameState, playerId: string): void {
  if (playerId !== game.currentPlayerId) {
    throw new Error('Only the current player may take this action.')
  }
}

function assertPhase(game: GameState, phase: TurnState['phase']): void {
  if (game.turn.phase !== phase) {
    throw new Error(`This action is only allowed during the ${phase} phase.`)
  }
}

function replaceCurrentPlayer(
  game: GameState,
  player: PlayerState,
): PlayerState[] {
  return game.players.map((candidate, index) =>
    index === game.currentPlayerIndex ? player : candidate,
  )
}

function advanceTurn(game: GameState): GameState {
  const currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length
  const currentPlayerId = game.players[currentPlayerIndex].id
  const turnNumber = game.turnNumber + 1

  return {
    ...game,
    currentPlayerIndex,
    currentPlayerId,
    turnNumber,
    turn: {
      number: turnNumber,
      currentPlayerId,
      phase: 'draw',
      cardsPlayedThisTurn: 0,
      cardsDrawnThisTurn: 0,
    },
  }
}

function drawAvailableCards(
  drawPile: readonly CardInstance[],
  discardPile: readonly CardInstance[],
  requestedCount: number,
  rng: RandomSource,
): {
  drawn: CardInstance[]
  drawPile: CardInstance[]
  discardPile: CardInstance[]
} {
  let availableDrawPile = [...drawPile]
  let availableDiscardPile = [...discardPile]
  const drawn: CardInstance[] = []

  while (drawn.length < requestedCount) {
    if (availableDrawPile.length === 0 && availableDiscardPile.length > 0) {
      availableDrawPile = shuffle(availableDiscardPile, rng)
      availableDiscardPile = []
    }

    const card = availableDrawPile.shift()
    if (!card) break
    drawn.push(card)
  }

  return {
    drawn,
    drawPile: availableDrawPile,
    discardPile: availableDiscardPile,
  }
}

/** Confirms that the current game is ready for the current player's draw phase. */
export function startTurn(game: GameState): GameState {
  if (game.status !== 'playing') {
    throw new Error('A turn can only start while the game is playing.')
  }
  assertPhase(game, 'draw')
  return game
}

/** Draws up to the two cards required for this turn, recycling discards if needed. */
export function drawForTurn(
  game: GameState,
  playerId: string,
  options: TurnCommandOptions = {},
): GameState {
  assertCurrentPlayer(game, playerId)
  assertPhase(game, 'draw')

  if (game.turn.cardsDrawnThisTurn >= CARDS_PER_TURN) {
    throw new Error('The current player has already drawn for this turn.')
  }

  const currentPlayer = game.players[game.currentPlayerIndex]
  const { drawn, drawPile, discardPile } = drawAvailableCards(
    game.drawPile,
    game.discardPile,
    CARDS_PER_TURN - game.turn.cardsDrawnThisTurn,
    options.rng ?? systemRandom,
  )

  return {
    ...game,
    players: replaceCurrentPlayer(game, {
      ...currentPlayer,
      hand: [...currentPlayer.hand, ...drawn],
    }),
    drawPile,
    discardPile,
    turn: {
      ...game.turn,
      cardsDrawnThisTurn: game.turn.cardsDrawnThisTurn + drawn.length,
      phase: 'play',
    },
  }
}

/** Placeholder play command; future card effects can replace the discard destination. */
export function registerCardPlayed(
  game: GameState,
  playerId: string,
  cardInstanceId: string,
): GameState {
  assertCurrentPlayer(game, playerId)
  assertPhase(game, 'play')

  if (game.turn.cardsPlayedThisTurn >= MAX_CARDS_PLAYED_PER_TURN) {
    throw new Error('A player may play at most two cards per turn.')
  }

  const currentPlayer = game.players[game.currentPlayerIndex]
  const cardIndex = currentPlayer.hand.findIndex(
    (card) => card.instanceId === cardInstanceId,
  )
  if (cardIndex === -1) {
    throw new Error('The selected card is not in the current player hand.')
  }

  const card = currentPlayer.hand[cardIndex]
  if (card.cardType === 'drug') {
    throw new Error('Use playDrug to play a Drug card.')
  }
  return {
    ...game,
    players: replaceCurrentPlayer(game, {
      ...currentPlayer,
      hand: currentPlayer.hand.filter((_, index) => index !== cardIndex),
    }),
    discardPile: [...game.discardPile, card],
    turn: {
      ...game.turn,
      cardsPlayedThisTurn: game.turn.cardsPlayedThisTurn + 1,
    },
  }
}

/** Discards one card during the enforced hand-limit discard phase. */
export function discardCard(
  game: GameState,
  playerId: string,
  cardInstanceId: string,
): GameState {
  assertCurrentPlayer(game, playerId)
  assertPhase(game, 'discard')

  const currentPlayer = game.players[game.currentPlayerIndex]
  const cardIndex = currentPlayer.hand.findIndex(
    (card) => card.instanceId === cardInstanceId,
  )
  if (cardIndex === -1) {
    throw new Error('The selected card is not in the current player hand.')
  }

  const card = currentPlayer.hand[cardIndex]
  const players = replaceCurrentPlayer(game, {
    ...currentPlayer,
    hand: currentPlayer.hand.filter((_, index) => index !== cardIndex),
  })
  const nextGame = {
    ...game,
    players,
    discardPile: [...game.discardPile, card],
  }

  return players[game.currentPlayerIndex].hand.length <= HAND_LIMIT
    ? advanceTurn(nextGame)
    : nextGame
}

/** Ends a play phase, or enters discard phase when the hand exceeds six cards. */
export function endTurn(game: GameState, playerId: string): GameState {
  assertCurrentPlayer(game, playerId)
  assertPhase(game, 'play')

  const currentPlayer = game.players[game.currentPlayerIndex]
  if (currentPlayer.hand.length > HAND_LIMIT) {
    return { ...game, turn: { ...game.turn, phase: 'discard' } }
  }

  return advanceTurn(game)
}
