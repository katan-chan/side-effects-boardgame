import type { GameState } from '../../src/game/engine/types'
import type { GameCommand } from '../game/commands'

export interface RoomPlayer {
  id: string
  displayName: string
  connected: boolean
  socketId?: string
}

export interface Room {
  id: string
  hostPlayerId: string
  players: RoomPlayer[]
  gameState?: GameState
  status: 'lobby' | 'playing' | 'finished'
  pendingDecision?: PendingDecision
  gameLog: string[]
  /** SHA-256 hashes only. Raw bearer tokens never enter the room state. */
  sessionTokenHashes: Record<string, string>
}

export interface PendingDecision {
  id: string
  kind: 'anxiety' | 'tremors'
  chooserPlayerId: string
  command: Extract<GameCommand, { type: 'playEpisode' }>
  choiceMap: Record<string, string>
}
