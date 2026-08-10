import type { CardType, DisorderId } from '../game/cards/types'
import { vi } from './vi'

export const defaultLocale = 'vi' as const
export const locale = vi

export function t(key: string, values: Record<string, string | number> = {}): string {
  return (locale.strings[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''))
}
export const disorderName = (id: DisorderId | string) => locale.disorders[id as DisorderId] ?? id
export const cardTypeName = (type: CardType) => locale.cardTypes[type]
export const phaseName = (phase: 'draw' | 'play' | 'discard') =>
  t(`phase${phase[0].toUpperCase()}${phase.slice(1)}`)
export function cardName(definitionId: string, fallback: string): string {
  if (definitionId === 'episode') return 'Lên cơn!'
  if (definitionId === 'therapy') return t('playTherapy').replace('Chơi ', '')
  return disorderName(definitionId) === definitionId ? fallback : disorderName(definitionId)
}
export function localizeError(message: string): string {
  const pairs: Array<[string, string]> = [
    ['current player', 'Không phải lượt của bạn.'], ['draw phase', 'Hãy rút bài trước.'], ['play phase', 'Chưa đến giai đoạn chơi bài.'], ['two cards', 'Bạn đã chơi đủ 2 lá trong lượt này.'], ['does not treat', 'Thuốc này không điều trị Rối loạn đã chọn.'], ['side effect', 'Người chơi này không chịu Tác dụng phụ tương ứng.'], ['already has', 'Người chơi đã có Rối loạn này.'], ['Tremors', 'Không thể dùng Trị liệu lên Run rẩy.'], ['already treated', 'Rối loạn này đã được điều trị.'], ['Room not found', 'Phòng không tồn tại.'], ['Only the host', 'Chỉ Chủ phòng mới có thể bắt đầu ván.'], ['Unable to connect', 'Không thể kết nối tới máy chủ.'],
  ]
  return (
    pairs.find(([needle]) => message.includes(needle))?.[1] ??
    'Không thể thực hiện thao tác này.'
  )
}
