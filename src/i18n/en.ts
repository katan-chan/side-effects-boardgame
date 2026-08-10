import type { Translation } from './types'
import { vi } from './vi'

export const en: Translation = { ...vi, strings: { ...vi.strings, title: 'Side Effects', localGame: 'Local Game', onlineGame: 'Online Game', draw: 'Draw', endTurn: 'End Turn', newGame: 'New Game', winner: 'Winner' } }
