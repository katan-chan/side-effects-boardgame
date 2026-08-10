import type { PlayerState } from './types'

export function cannotPlayCards(player: PlayerState): boolean {
  return player.effects.cannotPlayTurns > 0
}
