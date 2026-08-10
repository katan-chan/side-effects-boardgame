import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerGhost, __test_listeners, type GhostItem } from '../../components/GhostLayer'

describe('triggerGhost', () => {
  beforeEach(() => {
    __test_listeners.clear()
    vi.restoreAllMocks()
    
    // Mock window and matchMedia
    global.window = {
      matchMedia: vi.fn().mockImplementation(() => ({
        matches: false,
      })),
    } as any

    // Mock document
    global.document = {
      createElement: () => ({ getBoundingClientRect: vi.fn(), remove: vi.fn() }),
      getElementById: vi.fn(),
    } as any
  })

  it('snapshots source and destination geometry before mutation', () => {
    const mockStartEl = document.createElement('div')
    const mockEndEl = document.createElement('div')

    vi.spyOn(mockStartEl, 'getBoundingClientRect').mockReturnValue({ top: 10, left: 10, width: 50, height: 50 } as DOMRect)
    vi.spyOn(mockEndEl, 'getBoundingClientRect').mockReturnValue({ top: 100, left: 100, width: 60, height: 60 } as DOMRect)

    vi.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'start') return mockStartEl
      if (id === 'end') return mockEndEl
      return null
    })

    let capturedGhost: GhostItem | undefined
    __test_listeners.add((ghost: GhostItem) => {
      capturedGhost = ghost
    })

    triggerGhost('start', 'end')

    expect(capturedGhost).toBeDefined()
    expect(capturedGhost?.startRect.top).toBe(10)
    expect(capturedGhost?.endRect.top).toBe(100)

    // Verify it survives DOM removal (because it's a snapshot)
    mockStartEl.remove()
    expect(capturedGhost?.startRect.width).toBe(50)
  })

  it('gracefully no-ops if DOM elements are missing', () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null)

    let called = false
    __test_listeners.add(() => {
      called = true
    })

    triggerGhost('start', 'end')
    expect(called).toBe(false)
  })

  it('gracefully no-ops if prefers-reduced-motion is true', () => {
    global.window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
    }))

    const mockEl = { getBoundingClientRect: vi.fn() } as any
    vi.spyOn(document, 'getElementById').mockReturnValue(mockEl)

    let called = false
    __test_listeners.add(() => {
      called = true
    })

    triggerGhost('start', 'end')
    expect(called).toBe(false)
  })
})
