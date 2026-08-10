import type { GameState } from '../../src/game/engine/types'

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
}
