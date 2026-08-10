import type { Translation } from './types'
import { vi } from './vi'

export const en: Translation = { ...vi, strings: { ...vi.strings, title: 'Side Effects', localGame: 'Local Game', onlineGame: 'Online Game', draw: 'Draw', endTurn: 'End Turn', newGame: 'New Game', winner: 'Winner', episodeEffect: 'Episode effect', episodeInstructions: 'Choose an untreated Disorder of another player and trigger its Episode effect.', therapyInstructions: 'Remove an untreated Disorder from your Psyche.', therapyRestriction: 'Cannot be used on Tremors. Anorexia can only be treated with Therapy.', treatLabel: 'Treats', mayCause: 'May cause', sideEffects: 'Side Effects' } }
