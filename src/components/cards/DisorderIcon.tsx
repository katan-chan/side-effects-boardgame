import type { DisorderId } from '../../game/cards/types'

const marks: Record<DisorderId, string> = {
  madness: '◎',
  'suicidal-thoughts': '×',
  depression: '◒',
  tremors: '〰',
  'gambling-addiction': '◇',
  anxiety: '∿',
  impotence: '≫',
  anorexia: '⌛',
}

export function DisorderIcon({ id }: { id: DisorderId }) {
  return <span className={`disorder-icon disorder-icon-${id}`} aria-hidden="true">{marks[id]}</span>
}
