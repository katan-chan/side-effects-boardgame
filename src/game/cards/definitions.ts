import type { DeckEntry, DisorderDefinition, DrugDefinition } from './types'

const disorder = (
  definitionId: DisorderDefinition['definitionId'],
  displayName: string,
  therapyAllowed: boolean,
): DisorderDefinition => ({
  definitionId,
  displayName,
  cardType: 'disorder',
  episodeEffect: { kind: 'disorder-specific' },
  therapyAllowed,
})

const drug = (
  definitionId: DrugDefinition['definitionId'],
  displayName: string,
  treatsDisorderId: DrugDefinition['treatsDisorderId'],
): DrugDefinition => ({
  definitionId,
  displayName,
  cardType: 'drug',
  treatsDisorderId,
  sideEffects: [],
})

export const baseDeckEntries: readonly DeckEntry[] = [
  { definition: disorder('depression', 'Depression', true), copies: 5 },
  { definition: disorder('anxiety', 'Anxiety', true), copies: 5 },
  { definition: disorder('impotence', 'Impotence', true), copies: 5 },
  {
    definition: disorder('gambling-addiction', 'Gambling Addiction', true),
    copies: 5,
  },
  {
    definition: disorder('suicidal-thoughts', 'Suicidal Thoughts', true),
    copies: 5,
  },
  { definition: disorder('tremors', 'Tremors', false), copies: 5 },
  { definition: disorder('anorexia', 'Anorexia', true), copies: 4 },
  { definition: disorder('madness', 'Madness', true), copies: 4 },

  {
    definition: drug(
      'depression-treatment',
      'Depression Treatment',
      'depression',
    ),
    copies: 5,
  },
  {
    definition: drug('anxiety-treatment', 'Anxiety Treatment', 'anxiety'),
    copies: 5,
  },
  {
    definition: drug('impotence-treatment', 'Impotence Treatment', 'impotence'),
    copies: 5,
  },
  {
    definition: drug(
      'gambling-addiction-treatment',
      'Gambling Addiction Treatment',
      'gambling-addiction',
    ),
    copies: 5,
  },
  {
    definition: drug(
      'suicidal-thoughts-treatment',
      'Suicidal Thoughts Treatment',
      'suicidal-thoughts',
    ),
    copies: 5,
  },
  {
    definition: drug('tremors-treatment', 'Tremors Treatment', 'tremors'),
    copies: 6,
  },
  {
    definition: drug('madness-treatment', 'Madness Treatment', 'madness'),
    copies: 5,
  },

  {
    definition: {
      definitionId: 'episode',
      displayName: "You're Having an Episode",
      cardType: 'episode',
    },
    copies: 10,
  },
  {
    definition: {
      definitionId: 'therapy',
      displayName: 'Therapy',
      cardType: 'therapy',
    },
    copies: 5,
  },
]
