import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const TOKEN_BYTES = 32

export function createSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function matchesSessionToken(
  token: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashSessionToken(token), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
