import type { PropsWithChildren } from 'react'
import type { CardType } from '../../game/cards/types'

export function CardFrame({
  type,
  children,
}: PropsWithChildren<{ type: CardType }>) {
  return <div className={`card-frame card-frame-${type}`}>{children}</div>
}
