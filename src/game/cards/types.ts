export type CardType = 'disorder' | 'drug' | 'episode' | 'therapy'

export type DisorderId =
  | 'depression'
  | 'anxiety'
  | 'impotence'
  | 'gambling-addiction'
  | 'suicidal-thoughts'
  | 'tremors'
  | 'anorexia'
  | 'madness'

export type TreatableByDrugDisorderId = Exclude<DisorderId, 'anorexia'>
export type DrugId = `${TreatableByDrugDisorderId}-treatment`

export interface CardDefinitionBase {
  /** Stable identifier shared by all copies of this card definition. */
  definitionId: string
  cardType: CardType
  displayName: string
}

export interface DisorderDefinition extends CardDefinitionBase {
  cardType: 'disorder'
  definitionId: DisorderId
  /** Placeholder metadata for the future Episode resolver. */
  episodeEffect: { kind: 'disorder-specific' }
  therapyAllowed: boolean
}

export interface DrugDefinition extends CardDefinitionBase {
  cardType: 'drug'
  definitionId: DrugId
  treats: TreatableByDrugDisorderId
  /** TODO: Populate only when the official Side Effects data is available. */
  sideEffects: readonly DisorderId[]
}

export interface EpisodeDefinition extends CardDefinitionBase {
  cardType: 'episode'
  definitionId: 'episode'
}

export interface TherapyDefinition extends CardDefinitionBase {
  cardType: 'therapy'
  definitionId: 'therapy'
}

export type CardDefinition =
  DisorderDefinition | DrugDefinition | EpisodeDefinition | TherapyDefinition

export type CardInstance<T extends CardDefinition = CardDefinition> = T & {
  /** Unique physical-card identifier, unlike definitionId. */
  instanceId: string
}

export interface DeckEntry<T extends CardDefinition = CardDefinition> {
  definition: T
  copies: number
}
