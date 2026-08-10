import { describe, it, expect, vi, beforeEach } from 'vitest'
import { audioManager } from '../audioManager'
import type { PlayerGameView } from '../../../server/game/playerView'

const reactMocks = vi.hoisted(() => ({
  useEffect: vi.fn(),
  useRef: vi.fn(),
}))

vi.mock('react', () => reactMocks)

import { useGameAudio } from '../useGameAudio'

type Ref<T> = { current: T }

function renderHook(
  game: PlayerGameView,
  viewerPlayerId: string,
  refs: Array<Ref<unknown>>,
) {
  let refIndex = 0
  let effect: (() => void) | undefined

  reactMocks.useRef.mockImplementation((initialValue: unknown) => {
    if (!refs[refIndex]) refs[refIndex] = { current: initialValue }
    return refs[refIndex++]
  })
  reactMocks.useEffect.mockImplementation((callback: () => void) => {
    effect = callback
  })

  useGameAudio(game, viewerPlayerId)
  effect?.()
}

describe('useGameAudio', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    reactMocks.useEffect.mockReset()
    reactMocks.useRef.mockReset()
    vi.spyOn(audioManager, 'play').mockImplementation(() => {})
  })

  it('skips audio on initial mount', () => {
    const game = { currentPlayerId: 'user-1' } as PlayerGameView

    renderHook(game, 'user-1', [])

    expect(audioManager.play).not.toHaveBeenCalled()
  })

  it('plays your-turn on turn transition', () => {
    let game = { currentPlayerId: 'opponent-1' } as PlayerGameView
    const refs: Array<Ref<unknown>> = [{ current: undefined }, { current: false }]

    // First render (mount)
    renderHook(game, 'user-1', refs)
    expect(audioManager.play).not.toHaveBeenCalled()

    // Second render (transition)
    game = { currentPlayerId: 'user-1' } as PlayerGameView
    renderHook(game, 'user-1', refs)

    expect(audioManager.play).toHaveBeenCalledWith('your-turn')
  })

  it('plays pending-alert on new pending decision', () => {
    let game = { pendingDecision: undefined } as PlayerGameView
    const refs: Array<Ref<unknown>> = [{ current: undefined }, { current: false }]

    // First render
    renderHook(game, 'user-1', refs)

    // Second render with decision
    game = { pendingDecision: { id: 'd-1' } } as PlayerGameView
    renderHook(game, 'user-1', refs)

    expect(audioManager.play).toHaveBeenCalledWith('pending-alert')
  })
})
