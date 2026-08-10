import { describe, expect, it } from 'vitest'
import { selectEpisodeTarget, selectPsycheSlot } from '../../components/GameBoard'

describe('Episode target selection', () => {
  it('keeps the selected opponent while choosing their untreated Disorder', () => {
    const targetPlayerId: string | undefined = 'opponent-1'
    let targetDisorderId: string | undefined
    let propagationStopped = false

    selectPsycheSlot(
      { stopPropagation: () => { propagationStopped = true } },
      'madness-01',
      (slotId) => { targetDisorderId = slotId },
    )

    expect(propagationStopped).toBe(true)
    expect(targetPlayerId).toBe('opponent-1')
    expect(targetDisorderId).toBe('madness-01')
    expect(Boolean(targetPlayerId && targetDisorderId)).toBe(true)
  })

  it('selects an opponent Disorder directly without a prior player-panel click', () => {
    let targetPlayerId: string | undefined
    let targetDisorderId: string | undefined
    selectEpisodeTarget('opponent-2', 'anxiety-01', (playerId, disorderId) => {
      targetPlayerId = playerId
      targetDisorderId = disorderId
    })
    expect(targetPlayerId).toBe('opponent-2')
    expect(targetDisorderId).toBe('anxiety-01')
    expect(Boolean(targetPlayerId && targetDisorderId)).toBe(true)
  })
})
