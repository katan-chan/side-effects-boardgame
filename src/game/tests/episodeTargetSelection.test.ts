import { describe, expect, it } from 'vitest'
import { selectPsycheSlot } from '../../components/GameBoard'

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
})
