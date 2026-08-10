import type { CardInstance } from '../../src/game/cards/types'
import type {
  GameState,
  PlayerState,
  PsycheSlot,
} from '../../src/game/engine/types'

export interface PublicCardView {
  instanceId: string
  definitionId: string
  cardType: CardInstance['cardType']
  displayName: string
}

export interface PublicPsycheSlotView {
  disorder: PublicCardView
  drug?: PublicCardView
}

export interface PlayerView {
  id: string
  name: string
  psyche: PublicPsycheSlotView[]
  effects: PlayerState['effects']
  handCount: number
  hand?: PublicCardView[]
}

export interface PlayerGameView {
  players: PlayerView[]
  currentPlayerId: string
  turnNumber: number
  turn: GameState['turn']
  drawPileCount: number
  discardPileCount: number
  status: GameState['status']
  winnerPlayerId?: string
}

function toCardView(card: CardInstance): PublicCardView {
  return {
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    cardType: card.cardType,
    displayName: card.displayName,
  }
}

function toPsycheSlotView(slot: PsycheSlot): PublicPsycheSlotView {
  return {
    disorder: toCardView(slot.disorder),
    ...(slot.drug ? { drug: toCardView(slot.drug) } : {}),
  }
}

export function createPlayerView(
  game: GameState,
  viewerPlayerId: string,
): PlayerGameView {
  return {
    players: game.players.map((player) => ({
      id: player.id,
      name: player.name,
      psyche: player.psyche.slots.map(toPsycheSlotView),
      effects: player.effects,
      handCount: player.hand.length,
      ...(player.id === viewerPlayerId
        ? { hand: player.hand.map(toCardView) }
        : {}),
    })),
    currentPlayerId: game.currentPlayerId,
    turnNumber: game.turnNumber,
    turn: game.turn,
    drawPileCount: game.drawPile.length,
    discardPileCount: game.discardPile.length,
    status: game.status,
    ...(game.winnerPlayerId ? { winnerPlayerId: game.winnerPlayerId } : {}),
  }
}
