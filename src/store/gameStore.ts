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
  discardManual as discardManualCommand,
  drawForTurn,
  endTurn as endTurnCommand,
  forfeitGame as forfeitGameCommand,
} from '../game/engine/turns'
import type { GameState } from '../game/engine/types'
import { describeCommand } from '../game/log/describeCommand'
import { t } from '../i18n'
import type { GameCommand } from '../../server/game/commands'

type StoreAction = (game: GameState) => GameState

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
  manualDiscard: (cardInstanceId: string) => void
  endTurn: () => void
  forfeit: () => void
  resetGame: () => void
  clearError: () => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to complete that action.'
}

export const useGameStore = create<GameStore>((set, get) => {
  const run = (action: StoreAction, command: GameCommand) => {
    const game = get().gameState
    if (!game) return
    try {
      const nextGame = action(game)
      const entry = describeCommand(game, command, nextGame)
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
          ...(winner ? [t('wins', { player: winner.name })] : []),
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
          gameLog: [t('logLocalStarted')],
        })
      } catch (error) {
        set({ error: errorMessage(error) })
      }
    },
    draw: () =>
      run((game) => drawForTurn(game, game.currentPlayerId), { type: 'draw' }),
    playDrug: (drugCardId, disorderCardId) =>
      run(
        (game) =>
          playDrugCommand(
            game,
            game.currentPlayerId,
            drugCardId,
            disorderCardId,
          ),
        { type: 'playDrug', drugCardId, disorderCardId },
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
        { type: 'playDisorder', disorderCardId, targetPlayerId },
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
        { type: 'playEpisode', episodeCardId, targetPlayerId, targetDisorderCardId },
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
        { type: 'playTherapy', therapyCardId, disorderCardId },
      ),
    discard: (cardInstanceId) =>
      run(
        (game) =>
          discardCardCommand(game, game.currentPlayerId, cardInstanceId),
        { type: 'discard', cardInstanceId },
      ),
    manualDiscard: (cardInstanceId) =>
      run(
        (game) => discardManualCommand(game, game.currentPlayerId, cardInstanceId),
        { type: 'discardManual', cardInstanceId },
      ),
    endTurn: () =>
      run((game) => endTurnCommand(game, game.currentPlayerId), {
        type: 'endTurn',
      }),
    forfeit: () =>
      run((game) => forfeitGameCommand(game, game.currentPlayerId), {
        type: 'forfeit',
      }),
    resetGame: () =>
      set({ gameState: undefined, error: undefined, gameLog: [] }),
    clearError: () => set({ error: undefined }),
  }
})
