import { episodeHandlers, type EpisodeEffectOptions } from './episodeHandlers'
import { cannotPlayCards } from './temporaryEffects'
import type { GameState } from './types'

const MAX_CARDS_PLAYED_PER_TURN = 2

/** Plays the shared Episode card and dispatches the target Disorder's supported effect. */
export function playEpisode(
  game: GameState,
  playerId: string,
  episodeCardId: string,
  targetPlayerId: string,
  targetDisorderCardId: string,
  options: EpisodeEffectOptions = {},
): GameState {
  if (playerId !== game.currentPlayerId) {
    throw new Error('Only the current player may take this action.')
  }
  if (game.turn.phase !== 'play') {
    throw new Error('Episode may only be played during the play phase.')
  }
  if (game.turn.cardsPlayedThisTurn >= MAX_CARDS_PLAYED_PER_TURN) {
    throw new Error('A player may play at most two cards per turn.')
  }
  if (targetPlayerId === playerId) {
    throw new Error('A player cannot target themself with an Episode.')
  }

  const attacker = game.players[game.currentPlayerIndex]
  if (cannotPlayCards(attacker)) {
    throw new Error('The current player cannot play cards this turn.')
  }
  const episodeIndex = attacker.hand.findIndex(
    (card) => card.instanceId === episodeCardId,
  )
  if (episodeIndex === -1) {
    throw new Error('The selected Episode is not in the current player hand.')
  }
  const episode = attacker.hand[episodeIndex]
  if (episode.cardType !== 'episode') {
    throw new Error('The selected card is not an Episode.')
  }

  const target = game.players.find((player) => player.id === targetPlayerId)
  if (!target) {
    throw new Error('The target player does not exist.')
  }
  const targetSlot = target.psyche.slots.find(
    (slot) => slot.disorder.instanceId === targetDisorderCardId,
  )
  if (!targetSlot) {
    throw new Error('The target Disorder is not in the target player Psyche.')
  }
  if (targetSlot.drug) {
    throw new Error('Episode cannot target a treated Disorder.')
  }

  const handler = episodeHandlers[targetSlot.disorder.definitionId]
  if (!handler) {
    throw new Error(
      'This Disorder does not have an implemented Episode effect.',
    )
  }

  const baseGame: GameState = {
    ...game,
    players: game.players.map((player, index) =>
      index === game.currentPlayerIndex
        ? {
            ...player,
            hand: player.hand.filter(
              (_, handIndex) => handIndex !== episodeIndex,
            ),
          }
        : player,
    ),
    discardPile: [...game.discardPile, episode],
    turn: {
      ...game.turn,
      cardsPlayedThisTurn: game.turn.cardsPlayedThisTurn + 1,
    },
  }
  const updatedAttacker = baseGame.players[game.currentPlayerIndex]
  const updatedTarget = baseGame.players.find(
    (player) => player.id === targetPlayerId,
  )!

  return handler({
    game: baseGame,
    attacker: updatedAttacker,
    target: updatedTarget,
    options,
  })
}
