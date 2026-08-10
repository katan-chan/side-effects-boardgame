import { useEffect, useMemo, useState } from 'react'
import type { CardInstance } from '../game/cards/types'
import type { GameState, PlayerState } from '../game/engine/types'
import type {
  PlayerGameView,
  PlayerView,
  PublicCardView,
  PublicPsycheSlotView,
} from '../../server/game/playerView'
import { cardName, localizeError, phaseName, t } from '../i18n'
import { GameCard } from './cards/GameCard'

type BoardCard =
  | Pick<
      CardInstance,
      'instanceId' | 'definitionId' | 'cardType' | 'displayName'
    >
  | PublicCardView
type BoardPlayer = PlayerState | PlayerView

export function selectPsycheSlot(
  event: { stopPropagation: () => void },
  slotId: string,
  onSelect?: (slotId: string) => void,
): void {
  event.stopPropagation()
  onSelect?.(slotId)
}

function slotsOf(
  player: BoardPlayer,
): (PlayerState['psyche']['slots'][number] | PublicPsycheSlotView)[] {
  return Array.isArray(player.psyche) ? player.psyche : player.psyche.slots
}

function handOf(player: BoardPlayer): BoardCard[] {
  return player.hand ?? []
}

interface GameBoardProps {
  game: GameState | PlayerGameView
  viewerPlayerId?: string
  error?: string
  gameLog: string[]
  onDraw: () => void
  onEndTurn: () => void
  onDiscard: (cardId: string) => void
  onPlayDrug: (drugId: string, disorderId: string) => void
  onPlayDisorder: (disorderId: string, targetPlayerId: string) => void
  onPlayEpisode: (
    episodeId: string,
    targetPlayerId: string,
    disorderId: string,
    options?: { chosenCardId?: string; tremorsDiscardCardIds?: string[] },
  ) => void
  onPlayTherapy: (therapyId: string, disorderId: string) => void
}

function Psyche({
  player,
  selectedId,
  onSelect,
}: {
  player: BoardPlayer
  selectedId?: string
  onSelect?: (slotId: string) => void
}) {
  return (
    <div className="psyche">
      {slotsOf(player).map((slot) => (
        <button
          type="button"
          className={`slot ${selectedId === slot.disorder.instanceId ? 'target-selected' : ''} ${onSelect ? 'targetable' : ''}`}
          key={slot.disorder.instanceId}
          onClick={(event) =>
            // Player panels are also selectable Episode targets; a slot click must not reset it.
            selectPsycheSlot(event, slot.disorder.instanceId, onSelect)
          }
        >
          <strong>{cardName(slot.disorder.definitionId, slot.disorder.displayName)}</strong>
          <span className={slot.drug ? 'treated' : 'untreated'}>
            {slot.drug ? t('treated') : t('untreated')}
          </span>
          {slot.drug && <small>{cardName(slot.drug.definitionId, slot.drug.displayName)}</small>}
        </button>
      ))}
    </div>
  )
}

function CardButton({
  card,
  selected,
  onClick,
}: {
  card: BoardCard
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`card card-${card.cardType} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <GameCard card={card} />
    </button>
  )
}

export function GameBoard(props: GameBoardProps) {
  const { game } = props
  const current = game.players[game.currentPlayerIndex]
  const drawPileCount =
    'drawPile' in game ? game.drawPile.length : game.drawPileCount
  const discardPileCount =
    'discardPile' in game ? game.discardPile.length : game.discardPileCount
  const viewer =
    game.players.find(
      (player) => player.id === (props.viewerPlayerId ?? game.currentPlayerId),
    ) ?? current
  const viewerHand = handOf(viewer)
  const isViewerTurn = viewer.id === game.currentPlayerId
  const [selectedCardId, setSelectedCardId] = useState<string>()
  const [targetPlayerId, setTargetPlayerId] = useState<string>()
  const [targetDisorderId, setTargetDisorderId] = useState<string>()
  const [chosenCardId, setChosenCardId] = useState<string>()
  const [tremorsIds, setTremorsIds] = useState<string[]>([])
  const selectedCard = viewerHand.find(
    (card) => card.instanceId === selectedCardId,
  )
  const target = game.players.find((player) => player.id === targetPlayerId)
  const untreatedOwn = slotsOf(viewer).filter((slot) => !slot.drug)
  const untreatedTarget = target
    ? slotsOf(target).filter((slot) => !slot.drug)
    : []
  const targetHand = target ? handOf(target) : []
  const resetChoice = () => {
    setSelectedCardId(undefined)
    setTargetDisorderId(undefined)
    setChosenCardId(undefined)
    setTremorsIds([])
  }
  const selectPlayer = (playerId: string) => {
    setTargetPlayerId(playerId)
    setTargetDisorderId(undefined)
    setChosenCardId(undefined)
    setTremorsIds([])
  }

  useEffect(() => {
    if (
      selectedCardId &&
      !viewerHand.some((card) => card.instanceId === selectedCardId)
    ) {
      resetChoice()
    }
  }, [viewer.id, viewerHand, selectedCardId])

  const actionPanel = useMemo(() => {
    if (!selectedCard) return <p>{t('selectCard')}</p>
    if (!isViewerTurn) return <p>{t('waitingFor', { player: current.name })}</p>
    if (game.turn.phase === 'discard')
      return (
        <button
          type="button"
          className="primary"
          onClick={() => {
            props.onDiscard(selectedCard.instanceId)
          }}
        >
          {t('discardSelected')}
        </button>
      )
    if (game.turn.phase !== 'play') return <p>{t('drawBeforePlay')}</p>
    if (selectedCard.cardType === 'drug')
      return (
        <>
          <p>{t('ownUntreatedDisorder')}</p>
          <button
            type="button"
            className="primary"
            disabled={!targetDisorderId}
            onClick={() => {
              if (targetDisorderId)
                props.onPlayDrug(selectedCard.instanceId, targetDisorderId)
            }}
          >
            {t('playDrug')}
          </button>
        </>
      )
    if (selectedCard.cardType === 'therapy')
      return (
        <>
          <p>{t('ownUntreatedDisorder')}</p>
          <button
            type="button"
            className="primary"
            disabled={!targetDisorderId}
            onClick={() => {
              if (targetDisorderId)
                props.onPlayTherapy(selectedCard.instanceId, targetDisorderId)
            }}
          >
            {t('playTherapy')}
          </button>
        </>
      )
    if (selectedCard.cardType === 'disorder')
      return (
        <>
          <p>{t('selectOpponent')}</p>
          <button
            type="button"
            className="primary"
            disabled={!targetPlayerId}
            onClick={() => {
              if (targetPlayerId)
                props.onPlayDisorder(selectedCard.instanceId, targetPlayerId)
            }}
          >
            {t('playDisorder')}
          </button>
        </>
      )
    const targetDisorder = untreatedTarget.find(
      (slot) => slot.disorder.instanceId === targetDisorderId,
    )
    const isAnxiety = targetDisorder?.disorder.definitionId === 'anxiety'
    const isTremors = targetDisorder?.disorder.definitionId === 'tremors'
    const missingAnxietyChoice =
      isAnxiety && targetHand.length > 0 && !chosenCardId
    const invalidTremorsChoice =
      isTremors && targetHand.length >= 3 && tremorsIds.length !== 3
    return (
      <>
        <p>
          {targetDisorder
            ? t('selectedDisorder', {
                disorder: cardName(
                  targetDisorder.disorder.definitionId,
                  targetDisorder.disorder.displayName,
                ),
              })
            : target
              ? t('targetUntreatedDisorder')
              : t('selectOpponent')}
        </p>
        {isAnxiety && target && targetHand.length > 0 && (
          <label>
            {t('takeCard')}
            <select
              value={chosenCardId ?? ''}
              onChange={(event) =>
                setChosenCardId(event.target.value || undefined)
              }
            >
              <option value="">{t('chooseCard')}</option>
              {targetHand.map((card) => (
                <option key={card.instanceId} value={card.instanceId}>
                  {cardName(card.definitionId, card.displayName)}
                </option>
              ))}
            </select>
          </label>
        )}
        {isTremors && target && targetHand.length >= 3 && (
          <fieldset>
            <legend>{t('tremorsChoice')}</legend>
            {targetHand.map((card) => (
              <label className="check" key={card.instanceId}>
                <input
                  type="checkbox"
                  checked={tremorsIds.includes(card.instanceId)}
                  onChange={() =>
                    setTremorsIds((ids) =>
                      ids.includes(card.instanceId)
                        ? ids.filter((id) => id !== card.instanceId)
                        : [...ids, card.instanceId],
                    )
                  }
                />
                {cardName(card.definitionId, card.displayName)}
              </label>
            ))}
          </fieldset>
        )}
        <button
          type="button"
          className="primary"
          disabled={
            !targetPlayerId ||
            !targetDisorderId ||
            missingAnxietyChoice ||
            invalidTremorsChoice
          }
          onClick={() => {
            if (targetPlayerId && targetDisorderId) {
              props.onPlayEpisode(
                selectedCard.instanceId,
                targetPlayerId,
                targetDisorderId,
                { chosenCardId, tremorsDiscardCardIds: tremorsIds },
              )
            }
          }}
        >
          {t('playEpisode')}
        </button>
      </>
    )
  }, [
    selectedCard,
    game.turn.phase,
    targetPlayerId,
    targetDisorderId,
    target,
    untreatedOwn,
    untreatedTarget,
    chosenCardId,
    tremorsIds,
  ])

  return (
    <main className="game-board">
      <header className="status-bar">
        <strong>{t('currentPlayer')}: {current.name}</strong>
        <span>{t('turn')} {game.turnNumber}</span>
        <span>{t('phase')}: {phaseName(game.turn.phase)}</span>
        <span>{t('cardsPlayed')}: {game.turn.cardsPlayedThisTurn}/2</span>
        <span>{t('drawPile')}: {drawPileCount}</span>
        <span>{t('discardPile')}: {discardPileCount}</span>
      </header>
      <section className="deck-area" aria-label={`${t('drawPile')} và ${t('discardPile')}`}>
        <div className="deck-stack draw-stack"><span>{t('drawPile')}</span><strong>{drawPileCount}</strong></div>
        <div className="deck-stack discard-stack"><span>{t('discardPile')}</span><strong>{discardPileCount}</strong></div>
      </section>
      {props.error && <p className="error">{localizeError(props.error)}</p>}
      <section className="players">
        {game.players.map((player) => (
          <article
            className={`player panel ${player.id === current.id ? 'current-player' : ''} ${player.id === viewer.id ? 'viewer-player' : ''} ${selectedCard && player.id !== viewer.id && (selectedCard.cardType === 'disorder' || selectedCard.cardType === 'episode') ? 'targetable player-target' : ''} ${targetPlayerId === player.id ? 'target-selected' : ''}`}
            key={player.id}
            onClick={() => {
              if (
                selectedCard &&
                player.id !== viewer.id &&
                (selectedCard.cardType === 'disorder' || selectedCard.cardType === 'episode')
              )
                selectPlayer(player.id)
            }}
          >
            <h2 data-initial={player.name.slice(0, 1).toUpperCase()}>{player.name}</h2>
            <p>{t('hand')}: {handOf(player).length}</p>
            {(player.effects.skipTurns > 0 ||
              player.effects.skipDrawTurns > 0 ||
              player.effects.cannotPlayTurns > 0) && (
              <p className="effects">
                {t('effects')}:{' '}
                {player.effects.skipTurns > 0 &&
                  `${t('skipTurn')} ×${player.effects.skipTurns} `}
                {player.effects.skipDrawTurns > 0 &&
                  `${t('cannotDraw')} ×${player.effects.skipDrawTurns} `}
                {player.effects.cannotPlayTurns > 0 &&
                  `${t('cannotPlay')} ×${player.effects.cannotPlayTurns}`}
              </p>
            )}
            <Psyche
              player={player}
              selectedId={
                (selectedCard?.cardType === 'drug' || selectedCard?.cardType === 'therapy') && player.id === viewer.id
                  ? targetDisorderId
                  : selectedCard?.cardType === 'episode' && player.id === targetPlayerId
                    ? targetDisorderId
                    : undefined
              }
              onSelect={
                (selectedCard?.cardType === 'drug' || selectedCard?.cardType === 'therapy') && player.id === viewer.id
                  ? setTargetDisorderId
                  : selectedCard?.cardType === 'episode' && player.id === targetPlayerId
                    ? setTargetDisorderId
                    : undefined
              }
            />
          </article>
        ))}
      </section>
      <section className="hand panel own-hand">
        <h2>{t('hand')} — {viewer.name}</h2>
        <div className="cards">
          {viewerHand.map((card) => (
            <CardButton
              card={card}
              key={card.instanceId}
              selected={card.instanceId === selectedCardId}
              onClick={() => setSelectedCardId(card.instanceId)}
            />
          ))}
        </div>
        {selectedCard && (
          <section className="card-detail" aria-live="polite">
            <GameCard card={selectedCard} expanded />
          </section>
        )}
        <div className="action-panel">{actionPanel}</div>
        {selectedCard && (
          <button type="button" className="cancel-selection" onClick={resetChoice}>
            {t('cancelSelection')}
          </button>
        )}
      </section>
      <section className="game-log panel">
        <h2>{t('gameLog')}</h2>
        <ol>
          {props.gameLog.slice(-10).map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ol>
      </section>
      <footer className="button-row action-bar">
        <button
          type="button"
          disabled={!isViewerTurn || game.turn.phase !== 'draw'}
          onClick={props.onDraw}
        >
          {t('draw')}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!isViewerTurn || game.turn.phase !== 'play'}
          onClick={props.onEndTurn}
        >
          {t('endTurn')}
        </button>
      </footer>
    </main>
  )
}
