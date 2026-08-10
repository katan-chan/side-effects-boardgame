import { useEffect, useState } from 'react'
import { GameCard } from './cards/GameCard'
import { CardBack } from './cards/CardBack'
import type { CardInstance } from '../game/cards/types'
import type { PublicCardView } from '../../server/game/playerView'

export type GhostCardType = Pick<CardInstance, 'instanceId' | 'definitionId' | 'cardType' | 'displayName'> | PublicCardView

export interface GhostItem {
  id: string
  startId: string
  endId: string
  card?: GhostCardType
  type: 'card' | 'cardback'
}

let nextId = 0

// Singleton event emitter for ghosts to avoid heavy context
type GhostListener = (ghost: GhostItem) => void
const listeners = new Set<GhostListener>()

export function triggerGhost(startId: string, endId: string, card?: GhostCardType, type: 'card' | 'cardback' = 'card') {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  const id = `ghost-${nextId++}`
  const ghost = { id, startId, endId, card, type }
  listeners.forEach(fn => fn(ghost))
}

function GhostElement({ ghost, onComplete }: { ghost: GhostItem, onComplete: (id: string) => void }) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null)

  useEffect(() => {
    const startEl = document.getElementById(ghost.startId)
    const endEl = document.getElementById(ghost.endId)
    if (!startEl || !endEl) {
      onComplete(ghost.id)
      return
    }

    const startRect = startEl.getBoundingClientRect()
    const endRect = endEl.getBoundingClientRect()

    // Initial position
    setStyle({
      position: 'fixed',
      top: startRect.top,
      left: startRect.left,
      width: startRect.width,
      height: startRect.height,
      zIndex: 1000,
      opacity: 1,
      transform: 'scale(1)',
      pointerEvents: 'none',
    })

    // Force reflow
    void document.body.offsetHeight

    // Animate to target
    setStyle({
      position: 'fixed',
      top: endRect.top,
      left: endRect.left,
      width: endRect.width, // might be slightly warped if sizes differ heavily, but usually close enough
      height: endRect.height,
      zIndex: 1000,
      opacity: 0,
      transform: 'scale(0.8)',
      transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
      pointerEvents: 'none',
    })

    const timer = setTimeout(() => {
      onComplete(ghost.id)
    }, 350)

    return () => clearTimeout(timer)
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
