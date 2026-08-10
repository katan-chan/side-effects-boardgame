import { describe, it, expect, vi, beforeEach } from 'vitest'
import { audioManager } from '../audioManager'

describe('audioManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    audioManager.setVolume(0.65)
    audioManager.setMuted(false)
  })

  it('persists volume to localStorage', () => {
    audioManager.setVolume(0.42)
    expect(audioManager.getVolume()).toBe(0.42)
    const stored = JSON.parse(localStorage.getItem('side-effect.audio') || '{}')
    expect(stored.volume).toBe(0.42)
  })

  it('persists muted to localStorage', () => {
    audioManager.setMuted(true)
    expect(audioManager.isMuted()).toBe(true)
    const stored = JSON.parse(localStorage.getItem('side-effect.audio') || '{}')
    expect(stored.muted).toBe(true)
  })

  it('clamps volume between 0 and 1', () => {
    audioManager.setVolume(1.5)
    expect(audioManager.getVolume()).toBe(1)
    audioManager.setVolume(-0.5)
    expect(audioManager.getVolume()).toBe(0)
  })
})
