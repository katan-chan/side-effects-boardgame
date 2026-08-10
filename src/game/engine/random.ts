/** Source of pseudo-random values in the half-open interval [0, 1). */
export interface RandomSource {
  next(): number
}

export const systemRandom: RandomSource = {
  next: () => Math.random(),
}

export function shuffle<T>(items: readonly T[], rng: RandomSource): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng.next() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  return shuffled
}
