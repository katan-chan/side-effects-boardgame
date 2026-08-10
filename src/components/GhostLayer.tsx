import { useEffect, useState } from 'react'
import { GameCard } from './cards/GameCard'
import { CardBack } from './cards/CardBack'
import type { CardInstance } from '../game/cards/types'
import type { PublicCardView } from '../../server/game/playerView'

export type GhostCardType = Pick<CardInstance, 'instanceId' | 'definitionId' | 'cardType' | 'displayName'> | PublicCardView

export interface GhostItem {
  id: string
  startRect: DOMRect
  endRect: DOMRect
  card?: GhostCardType
  type: 'card' | 'cardback'
  onLand?: () => void
}

let nextId = 0

// Singleton event emitter for ghosts to avoid heavy context
export type GhostListener = (ghost: GhostItem) => void
const listeners = new Set<GhostListener>()
export const __test_listeners = listeners

export function triggerGhost(startId: string, endId: string, card?: GhostCardType, type: 'card' | 'cardback' = 'card', onLand?: () => void) {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.debug('Ghost animation skipped due to prefers-reduced-motion')
    onLand?.()
    return
  }

  const startEl = document.getElementById(startId)
  const endEl = document.getElementById(endId)

  if (!startEl || !endEl) {
    console.debug(`Ghost animation skipped due to missing DOM element: ${!startEl ? startId : ''} ${!endEl ? endId : ''}`)
    onLand?.()
    return
  }

  const startRect = startEl.getBoundingClientRect()
  const endRect = endEl.getBoundingClientRect()

  const id = `ghost-${nextId++}`
  const ghost = { id, startRect, endRect, card, type, onLand }
  listeners.forEach(fn => fn(ghost))
}

function GhostElement({ ghost, onComplete }: { ghost: GhostItem, onComplete: (id: string) => void }) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: ghost.startRect.top,
    left: ghost.startRect.left,
    width: ghost.startRect.width,
    height: ghost.startRect.height,
    zIndex: 1000,
    opacity: 1,
    transform: 'scale(1)',
    pointerEvents: 'none',
    transition: 'none',
  })

  useEffect(() => {
    let frame2: number

    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        setStyle({
          position: 'fixed',
          top: ghost.endRect.top,
          left: ghost.endRect.left,
          width: ghost.endRect.width,
          height: ghost.endRect.height,
          zIndex: 1000,
          opacity: 0,
          transform: 'scale(0.8)',
          transition: 'top 500ms cubic-bezier(0.2, 0.8, 0.2, 1), left 500ms cubic-bezier(0.2, 0.8, 0.2, 1), width 500ms cubic-bezier(0.2, 0.8, 0.2, 1), height 500ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 150ms ease-out 350ms',
          pointerEvents: 'none',
        })
      })
    })

    const timerLand = setTimeout(() => {
      ghost.onLand?.()
    }, 350)

    const timer = setTimeout(() => {
      onComplete(ghost.id)
    }, 550)

    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      clearTimeout(timerLand)
      clearTimeout(timer)
    }
  }, [ghost, onComplete])

  if (!style) return null

  return (
    <div className="ghost-card" style={style}>
      {ghost.type === 'cardback' ? (
        <CardBack count={1} label="Ghost" />
      ) : ghost.card ? (
        <GameCard card={ghost.card} />
      ) : null}
    </div>
  )
}

export function GhostLayer() {
  const [ghosts, setGhosts] = useState<GhostItem[]>([])

  useEffect(() => {
    const handler = (ghost: GhostItem) => {
      setGhosts(prev => [...prev, ghost])
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  const handleComplete = (id: string) => {
    setGhosts(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className="ghost-layer">
      {ghosts.map(g => (
        <GhostElement key={g.id} ghost={g} onComplete={handleComplete} />
      ))}
    </div>
  )
}
