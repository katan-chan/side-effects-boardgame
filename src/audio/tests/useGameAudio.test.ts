/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameAudio } from '../useGameAudio'
import { audioManager } from '../audioManager'
import * as React from 'react'
import type { PlayerGameView } from '../../../server/game/playerView'

describe('useGameAudio', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(audioManager, 'play').mockImplementation(() => {})
  })

  it('skips audio on initial mount', () => {
    const game = { currentPlayerId: 'user-1' } as PlayerGameView

    // Mock useRef and useEffect to execute immediately
    let effectCb: any
    const refs: any[] = []
    let refIndex = 0
    vi.spyOn(React, 'useRef').mockImplementation((init) => {
      if (refs[refIndex] === undefined) refs[refIndex] = { current: init }
      return refs[refIndex++]
    })
    vi.spyOn(React, 'useEffect').mockImplementation((cb) => {
      effectCb = cb
    })

    useGameAudio(game, 'user-1')
    ;(effectCb as () => void)()

    expect(audioManager.play).not.toHaveBeenCalled()
  })

  it('plays your-turn on turn transition', () => {
    let game = { currentPlayerId: 'opponent-1' } as PlayerGameView
    const refs: any[] = [{ current: undefined }, { current: false }]
    let refIndex = 0
    vi.spyOn(React, 'useRef').mockImplementation(() => refs[refIndex++])
    let effectCb: any
    vi.spyOn(React, 'useEffect').mockImplementation((cb) => { effectCb = cb })

    // First render (mount)
    refIndex = 0
    useGameAudio(game, 'user-1')
    ;(effectCb as () => void)()
    expect(audioManager.play).not.toHaveBeenCalled()

    // Second render (transition)
    game = { currentPlayerId: 'user-1' } as PlayerGameView
    refIndex = 0
    useGameAudio(game, 'user-1')
    ;(effectCb as () => void)()

    expect(audioManager.play).toHaveBeenCalledWith('your-turn')
  })

  it('plays pending-alert on new pending decision', () => {
    let game = { pendingDecision: undefined } as PlayerGameView
    const refs: any[] = [{ current: undefined }, { current: false }]
    let refIndex = 0
    vi.spyOn(React, 'useRef').mockImplementation(() => refs[refIndex++])
    let effectCb: any
    vi.spyOn(React, 'useEffect').mockImplementation((cb) => { effectCb = cb })

    // First render
    refIndex = 0
    useGameAudio(game, 'user-1')
    ;(effectCb as () => void)()

    // Second render with decision
    game = { pendingDecision: { id: 'd-1' } } as any
    refIndex = 0
    useGameAudio(game, 'user-1')
    ;(effectCb as () => void)()

    expect(audioManager.play).toHaveBeenCalledWith('pending-alert')
  })
})
