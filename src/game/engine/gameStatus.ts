import type { GameState, PlayerState } from './types'

export function isPlayerFullyTreated(player: PlayerState): boolean {
  return player.psyche.slots.every((slot) => slot.drug !== undefined)
}

export function getWinner(game: GameState): PlayerState | undefined {
  return game.players.find(isPlayerFullyTreated)
}

export function finalizeGameIfWon(game: GameState): GameState {
  const winner = getWinner(game)
  return winner
    ? { ...game, status: 'finished', winnerPlayerId: winner.id }
    : game
}

export function assertGameIsPlaying(game: GameState): void {
  if (game.status === 'finished') {
    throw new Error(
      'No gameplay actions are allowed after the game has finished.',
    )
  }
}
