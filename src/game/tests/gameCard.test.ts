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
    expect(html).toContain('Điều trị')
    expect(html).toContain('Run rẩy')
    expect(html).toContain('Nghiện cờ bạc')
    expect(html).toContain('Trầm cảm')
    expect(html).toContain('Loạn trí')
  })

  it('shows named compact Side Effects instead of a numeric count', () => {
    const html = render('depression-treatment', 'drug', 'Fluoxetine', false)
    expect(html).toContain('Rối loạn cương dương')
    expect(html).toContain('Ý nghĩ tự sát')
    expect(html).toContain('+1')
    expect(html).not.toContain('Có thể gây: 3')
    expect(render('depression-treatment', 'drug', 'Fluoxetine')).toContain(
      'Chán ăn tâm thần',
    )
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
