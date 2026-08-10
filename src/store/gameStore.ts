import { create } from 'zustand'
import { playDisorder as playDisorderCommand } from '../game/engine/disorderPlay'
import { playDrug as playDrugCommand } from '../game/engine/drugTreatment'
import {
  playEpisode as playEpisodeCommand,
  type EpisodeEffectOptions,
} from '../game/engine/episode'
import { createGame } from '../game/engine/setup'
import { playTherapy as playTherapyCommand } from '../game/engine/therapy'
import {
  discardCard as discardCardCommand,
  drawForTurn,
  endTurn as endTurnCommand,
} from '../game/engine/turns'
import type { GameState } from '../game/engine/types'

type StoreAction = (game: GameState) => GameState
type LogDescription = (before: GameState, after: GameState) => string

interface GameStore {
  gameState?: GameState
  error?: string
  gameLog: string[]
  createLocalGame: (playerNames: string[]) => void
  draw: () => void
  playDrug: (drugCardId: string, disorderCardId: string) => void
  playDisorder: (disorderCardId: string, targetPlayerId: string) => void
  playEpisode: (
    episodeCardId: string,
    targetPlayerId: string,
    targetDisorderCardId: string,
    options?: EpisodeEffectOptions,
  ) => void
  playTherapy: (therapyCardId: string, disorderCardId: string) => void
  discard: (cardInstanceId: string) => void
  endTurn: () => void
  resetGame: () => void
  clearError: () => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to complete that action.'
}

export const useGameStore = create<GameStore>((set, get) => {
  const run = (action: StoreAction, describe?: LogDescription) => {
    const game = get().gameState
    if (!game) return
    try {
      const nextGame = action(game)
      const entry = describe?.(game, nextGame)
      const winner =
        nextGame.status === 'finished'
          ? nextGame.players.find(
              (player) => player.id === nextGame.winnerPlayerId,
            )
          : undefined
      set({
        gameState: nextGame,
        error: undefined,
        gameLog: [
          ...get().gameLog,
          ...(entry ? [entry] : []),
          ...(winner ? [`${winner.name} won the game.`] : []),
        ].slice(-30),
      })
    } catch (error) {
      set({ error: errorMessage(error) })
    }
  }

  return {
    gameState: undefined,
    error: undefined,
    gameLog: [],
    createLocalGame: (playerNames) => {
      try {
        set({
          gameState: createGame(playerNames),
          error: undefined,
          gameLog: ['Local game started.'],
        })
      } catch (error) {
        set({ error: errorMessage(error) })
      }
    },
    draw: () =>
      run(
        (game) => drawForTurn(game, game.currentPlayerId),
        (before, after) =>
          `${before.players[before.currentPlayerIndex].name} drew ${after.turn.cardsDrawnThisTurn - before.turn.cardsDrawnThisTurn} cards.`,
      ),
    playDrug: (drugCardId, disorderCardId) =>
      run(
        (game) =>
          playDrugCommand(
            game,
            game.currentPlayerId,
            drugCardId,
            disorderCardId,
          ),
        (before) =>
          `${before.players[before.currentPlayerIndex].name} played a Drug treatment.`,
      ),
    playDisorder: (disorderCardId, targetPlayerId) =>
      run(
        (game) =>
          playDisorderCommand(
            game,
            game.currentPlayerId,
            disorderCardId,
            targetPlayerId,
          ),
        (before) =>
          `${before.players[before.currentPlayerIndex].name} gave a Disorder to an opponent.`,
      ),
    playEpisode: (
      episodeCardId,
      targetPlayerId,
      targetDisorderCardId,
      options,
    ) =>
      run(
        (game) =>
          playEpisodeCommand(
            game,
            game.currentPlayerId,
            episodeCardId,
            targetPlayerId,
            targetDisorderCardId,
            options,
          ),
        (before) =>
          `${before.players[before.currentPlayerIndex].name} triggered an Episode.`,
      ),
    playTherapy: (therapyCardId, disorderCardId) =>
      run(
        (game) =>
          playTherapyCommand(
            game,
            game.currentPlayerId,
            therapyCardId,
            disorderCardId,
          ),
        (before) =>
          `${before.players[before.currentPlayerIndex].name} used Therapy.`,
      ),
    discard: (cardInstanceId) =>
      run(
        (game) =>
          discardCardCommand(game, game.currentPlayerId, cardInstanceId),
        (before) =>
          `${before.players[before.currentPlayerIndex].name} discarded a card.`,
      ),
    endTurn: () =>
      run(
        (game) => endTurnCommand(game, game.currentPlayerId),
        (before) =>
          `${before.players[before.currentPlayerIndex].name} ended their turn.`,
      ),
    resetGame: () =>
      set({ gameState: undefined, error: undefined, gameLog: [] }),
    clearError: () => set({ error: undefined }),
  }
})
