import { describe, expect, it } from 'vitest'
import {
  createSessionToken,
  hashSessionToken,
  matchesSessionToken,
} from '../security/sessionToken'

describe('session token security primitives', () => {
  it('creates distinct high-entropy bearer credentials', () => {
    const first = createSessionToken()
    const second = createSessionToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toBe(second)
  })

  it('stores and compares SHA-256 hashes without retaining the raw token', () => {
    const first = 'first-token'
    const second = 'second-token'
    const firstHash = hashSessionToken(first)

    expect(firstHash).toHaveLength(64)
    expect(firstHash).toBe(hashSessionToken(first))
    expect(firstHash).not.toBe(hashSessionToken(second))
    expect(matchesSessionToken(first, firstHash)).toBe(true)
    expect(matchesSessionToken(second, firstHash)).toBe(false)
  })
})
