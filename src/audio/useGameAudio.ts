import { useEffect, useRef } from 'react'
import type { PlayerGameView } from '../../server/game/playerView'
import { audioManager } from './audioManager'

export function useGameAudio(game: PlayerGameView, viewerPlayerId: string) {
  const prevGameRef = useRef<PlayerGameView | undefined>(undefined)
  const mountedRef = useRef(false)

  useEffect(() => {
    // Skip audio on initial mount
    if (!mountedRef.current) {
      mountedRef.current = true
      prevGameRef.current = game
      return
    }

    const prev = prevGameRef.current
    if (!prev) return

    // 1. Turn Transition
    if (prev.currentPlayerId !== game.currentPlayerId && game.currentPlayerId === viewerPlayerId) {
      audioManager.play('your-turn')
    }

    // 2. Pending Decision
    const prevPendingId = prev.pendingDecision?.id
    const currPendingId = game.pendingDecision?.id
    if (currPendingId && currPendingId !== prevPendingId) {
      audioManager.play('pending-alert')
    }

    // 3. Game Finished
    if (prev.status === 'playing' && game.status === 'finished') {
      if (game.winnerPlayerId === viewerPlayerId) {
        audioManager.play('win')
      } else {
        audioManager.play('lose')
      }
    }

    prevGameRef.current = game
  }, [game, viewerPlayerId])
}
