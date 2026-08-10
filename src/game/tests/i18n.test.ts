import { describe, expect, it } from 'vitest'
import { defaultLocale, disorderName, localizeError, t } from '../../i18n'

describe('Vietnamese localization', () => {
  it('uses Vietnamese as the default locale with localized Disorder names', () => {
    expect(defaultLocale).toBe('vi')
    expect(disorderName('gambling-addiction')).toBe('Nghiện cờ bạc')
    expect(disorderName('suicidal-thoughts')).toBe('Ý nghĩ tự sát')
  })

  it('formats Vietnamese multiplayer status, winner text, and errors', () => {
    expect(t('unavailable')).toBe('Không thể kết nối tới máy chủ.')
    expect(t('wins', { player: 'An' })).toBe('An đã chiến thắng!')
    expect(localizeError('Only the host can start the game.')).toBe(
      'Chỉ Chủ phòng mới có thể bắt đầu ván.',
    )
  })
})
