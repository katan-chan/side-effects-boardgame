import type { CardInstance, DisorderDefinition } from '../cards/types'

export interface PsycheState {
  disorders: CardInstance<DisorderDefinition>[]
}

export interface PlayerState {
  id: string
  name: string
  hand: CardInstance[]
  psyche: PsycheState
}

export interface TurnState {
  number: number
  currentPlayerId: string
}

export interface GameState {
  players: PlayerState[]
  drawPile: CardInstance[]
  discardPile: CardInstance[]
  currentPlayerIndex: number
  currentPlayerId: string
  turnNumber: number
  turn: TurnState
  status: 'setup' | 'playing' | 'finished'
}
