import type { CardType, DisorderId } from '../game/cards/types'

export type Locale = 'vi' | 'en'
export type Translation = {
  strings: Record<string, string>
  disorders: Record<DisorderId, string>
  cardTypes: Record<CardType, string>
  episodeDescriptions: Record<DisorderId, string>
}
