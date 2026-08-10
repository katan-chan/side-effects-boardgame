import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GameCard } from '../../components/cards/GameCard'
import { en } from '../../i18n/en'

function render(
  definitionId: string,
  cardType: 'disorder' | 'drug' | 'episode' | 'therapy',
  displayName: string,
  expanded = true,
) {
  return renderToStaticMarkup(
    createElement(GameCard, { card: { definitionId, cardType, displayName }, expanded }),
  )
}

describe('card information presentation', () => {
  it('renders a Drug treatment and localized Side Effects from domain metadata', () => {
    const html = render('tremors-treatment', 'drug', 'Pramipexole')
    expect(html).toContain('Điều trị: Run rẩy')
    expect(html).toContain('Nghiện cờ bạc, Trầm cảm, Loạn trí')
  })

  it('renders a Disorder Episode description and action-card instructions', () => {
    expect(render('madness', 'disorder', 'Madness')).toContain(
      'Bỏ tất cả Thuốc đang nằm trong Tâm trí của bạn.',
    )
    expect(render('episode', 'episode', "You're Having an Episode")).toContain(
      'Chọn một Rối loạn chưa được điều trị',
    )
  })

  it('renders Therapy restrictions and keeps English fallback equivalents', () => {
    expect(render('therapy', 'therapy', 'Therapy')).toContain(
      'Không thể dùng lên Run rẩy.',
    )
    expect(en.strings.therapyRestriction).toContain('Tremors')
  })
})
