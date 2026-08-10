import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GameCard } from '../../components/cards/GameCard'
import { CardBack } from '../../components/cards/CardBack'
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

  it('shows every named Side Effect on compact Drug cards without counts', () => {
    const lorazepam = render('anxiety-treatment', 'drug', 'Lorazepam', false)
    const pramipexole = render('tremors-treatment', 'drug', 'Pramipexole', false)
    const fluoxetine = render('depression-treatment', 'drug', 'Fluoxetine', false)

    for (const effect of ['Ý nghĩ tự sát', 'Trầm cảm', 'Loạn trí']) {
      expect(lorazepam).toContain(effect)
    }
    for (const effect of ['Nghiện cờ bạc', 'Trầm cảm', 'Loạn trí']) {
      expect(pramipexole).toContain(effect)
    }
    for (const effect of [
      'Rối loạn cương dương',
      'Ý nghĩ tự sát',
      'Chán ăn tâm thần',
    ]) {
      expect(fluoxetine).toContain(effect)
    }
    expect(fluoxetine).not.toMatch(/\+[12]|Có thể gây:\s*\d/)
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

  it('uses distinct visual frame variants and renders a generic card back', () => {
    expect(render('madness', 'disorder', 'Madness')).toContain(
      'card-frame-disorder',
    )
    expect(render('anxiety-treatment', 'drug', 'Lorazepam')).toContain(
      'card-frame-drug',
    )
    expect(render('episode', 'episode', "You're Having an Episode")).toContain(
      'card-frame-episode',
    )
    expect(render('therapy', 'therapy', 'Therapy')).toContain(
      'card-frame-therapy',
    )
    const cardBack = renderToStaticMarkup(
      createElement(CardBack, { label: 'Chồng bài rút', count: 12 }),
    )
    expect(cardBack).toContain('card-back')
    expect(cardBack).toContain('Side Effect')
    expect(render('madness-treatment', 'drug', 'Chlorpromazine')).toContain(
      'Tác dụng phụ',
    )
  })
})
