import { useEffect, useState } from 'react'
import type { CardInstance } from '../game/cards/types'
import type { GameState, PlayerState } from '../game/engine/types'
import type {
  PlayerGameView,
  PlayerView,
  PublicCardView,
  PublicPsycheSlotView,
} from '../../server/game/playerView'
import { localizeError, phaseName, t } from '../i18n'
import { GameCard } from './cards/GameCard'
import { CardBack } from './cards/CardBack'
import { OpponentAvatarBar } from './OpponentAvatarBar'
import { GameLogDrawer } from './GameLogDrawer'
import { GhostLayer, triggerGhost } from './GhostLayer'

type BoardCard =
  | Pick<
      CardInstance,
      'instanceId' | 'definitionId' | 'cardType' | 'displayName'
    >
  | PublicCardView
type BoardPlayer = PlayerState | PlayerView

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

export function Psyche({
  player,
  playerId,
  selectedCard,
  viewerId,
  isTargetingMode,
  onTargetSlot,
}: {
  player: BoardPlayer
  playerId: string
  selectedCard?: BoardCard
  viewerId: string
  isTargetingMode: boolean
  onTargetSlot: (ownerId: string, slotId: string) => void
}) {
  return (
    <div className="psyche">
      {slotsOf(player).map((slot) => {
        const isOwn = playerId === viewerId
        const isUntreated = !slot.drug
        
        let canSelect = false
        if (selectedCard) {
          if (selectedCard.cardType === 'drug' || selectedCard.cardType === 'therapy') {
            canSelect = isOwn && isUntreated
          } else if (selectedCard.cardType === 'episode') {
            canSelect = !isOwn && isUntreated
          }
        }

        const slotClass = [
          'slot',
          isTargetingMode ? (canSelect ? 'target-highlight targetable' : 'dimmed') : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            type="button"
            id={`slot-${slot.disorder.instanceId}`}
            className={slotClass}
            key={slot.disorder.instanceId}
            onClick={(event) => {
              event.stopPropagation()
              if (canSelect) {
                onTargetSlot(playerId, slot.disorder.instanceId)
              }
            }}
          >
            <span className={`slot-badge ${slot.drug ? 'treated' : 'untreated'}`}>
              {slot.drug ? t('treated') : t('untreated')}
            </span>
            <GameCard card={slot.disorder} />
            {slot.drug && (
              <div className="drug-attachment">
                <GameCard card={slot.drug} />
              </div>
            )}
          </button>
        )
      })}
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
      className={`card-button ${selected ? 'selected' : ''}`}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <GameCard card={card} />
    </button>
  )
}

export function GameBoard(props: GameBoardProps) {
  const { game } = props
  const current = game.players[game.currentPlayerIndex]
  const drawPileCount = 'drawPile' in game ? game.drawPile.length : game.drawPileCount
  const discardPileCount = 'discardPile' in game ? game.discardPile.length : game.discardPileCount
  const viewer =
    game.players.find((player) => player.id === (props.viewerPlayerId ?? game.currentPlayerId)) ??
    current
  const viewerHand = handOf(viewer)
  const isViewerTurn = viewer.id === game.currentPlayerId

  const [selectedCardId, setSelectedCardId] = useState<string>()
  const [focusedOpponentId, setFocusedOpponentId] = useState<string>()
  const [showLog, setShowLog] = useState(false)
  const [isLocked, setIsLocked] = useState(false) // Lock interactions while waiting for server

  const selectedCard = viewerHand.find((card) => card.instanceId === selectedCardId)
  const isTargetingMode = selectedCard !== undefined

  const opponents = game.players.filter((player) => player.id !== viewer.id)
  const focusedOpponent =
    opponents.find((player) => player.id === focusedOpponentId) ??
    opponents.find((player) => player.id === game.currentPlayerId) ??
    opponents[0]

  useEffect(() => {
    // Unlock interaction when game state changes (server responded)
    setIsLocked(false)
    if (selectedCardId && !viewerHand.some((card) => card.instanceId === selectedCardId)) {
      setSelectedCardId(undefined)
    }
  }, [game.turnNumber, game.turn.cardsPlayedThisTurn, game.turn.phase, viewerHand])

  useEffect(() => {
    if (focusedOpponent && focusedOpponent.id !== focusedOpponentId) {
      setFocusedOpponentId(focusedOpponent.id)
    }
  }, [focusedOpponent, focusedOpponentId])

  // Cancel targeting on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCardId(undefined)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const executeCommand = (action: () => void) => {
    setIsLocked(true)
    setSelectedCardId(undefined)
    action()
  }

  const handleTargetSlot = (ownerId: string, slotId: string) => {
    if (!selectedCard || isLocked || !isViewerTurn) return

    if (selectedCard.cardType === 'drug' && ownerId === viewer.id) {
      triggerGhost(`hand-card-${selectedCard.instanceId}`, `slot-${slotId}`, selectedCard)
      executeCommand(() => props.onPlayDrug(selectedCard.instanceId, slotId))
    } else if (selectedCard.cardType === 'therapy' && ownerId === viewer.id) {
      triggerGhost(`hand-card-${selectedCard.instanceId}`, `slot-${slotId}`, selectedCard)
      executeCommand(() => props.onPlayTherapy(selectedCard.instanceId, slotId))
    } else if (selectedCard.cardType === 'episode' && ownerId !== viewer.id) {
      triggerGhost(`hand-card-${selectedCard.instanceId}`, `slot-${slotId}`, selectedCard)
      executeCommand(() => props.onPlayEpisode(selectedCard.instanceId, ownerId, slotId))
    }
  }

  const handleTargetOpponent = (opponentId: string) => {
    if (!selectedCard || isLocked || !isViewerTurn) {
      setFocusedOpponentId(opponentId) // Just focus if not targeting
      return
    }

    if (selectedCard.cardType === 'disorder') {
      triggerGhost(`hand-card-${selectedCard.instanceId}`, `avatar-${opponentId}`, selectedCard)
      executeCommand(() => props.onPlayDisorder(selectedCard.instanceId, opponentId))
    } else {
      setFocusedOpponentId(opponentId)
    }
  }

  const handleBackgroundClick = () => {
    if (selectedCardId) setSelectedCardId(undefined)
  }

  return (
    <main
      className={`game-board ${isTargetingMode ? 'targeting-mode' : ''} ${isLocked ? 'interaction-locked' : ''}`}
      onClick={handleBackgroundClick}
    >
      <section className="opponent-zone">
        {opponents.length > 1 && (
          <OpponentAvatarBar
            opponents={opponents}
            focusedOpponentId={focusedOpponentId}
            setFocusedOpponentId={handleTargetOpponent}
            targetPlayerId={
              isTargetingMode && selectedCard?.cardType === 'disorder' ? focusedOpponentId : undefined
            }
            currentPlayerId={game.currentPlayerId}
          />
        )}
        {focusedOpponent && (
          <article 
            className={`player opponent-player ${isTargetingMode && selectedCard?.cardType === 'disorder' ? 'target-highlight targetable' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              handleTargetOpponent(focusedOpponent.id)
            }}
          >
            {opponents.length === 1 && (
              <header className="opponent-header" style={{ marginBottom: '1rem', color: '#9bf6e5', fontWeight: 'bold' }}>
                {focusedOpponent.name} — {t('hand')}: {'handCount' in focusedOpponent ? focusedOpponent.handCount : focusedOpponent.hand?.length}
              </header>
            )}
            <Psyche
              player={focusedOpponent}
              playerId={focusedOpponent.id}
              selectedCard={selectedCard}
              viewerId={viewer.id}
              isTargetingMode={isTargetingMode}
              onTargetSlot={handleTargetSlot}
            />
          </article>
        )}
      </section>

      <section className="center-zone" id="center-table">
        <div className="deck-area">
          <button id="deck-draw" type="button" className="draw-pile" style={{ padding: 0, background: 'none', border: 'none' }} onClick={() => {
            if (!isLocked) {
              triggerGhost('deck-draw', 'own-hand', undefined, 'cardback')
              props.onDraw()
            }
          }} disabled={!isViewerTurn || game.turn.phase !== 'draw'}>
            <CardBack label={t('drawPile')} count={drawPileCount} />
          </button>
          <div id="deck-discard" className="discard-pile">
            <CardBack label={t('discardPile')} count={discardPileCount} />
          </div>
        </div>
      </section>


      <section className="self-zone">
        {props.error && <p className="error" style={{ marginBottom: '1rem' }}>{localizeError(props.error)}</p>}
        
        <div className="hud-glass">
          {isViewerTurn ? <strong>Lượt của bạn</strong> : <span>Lượt của {current.name}</span>}
          <span className="divider">|</span>
          <span>{phaseName(game.turn.phase)}</span>
          <span className="divider">|</span>
          <span>{game.turn.cardsPlayedThisTurn}/2 thẻ</span>
        </div>

        <article className="player viewer-player">
          <header className="own-nameplate">
            <strong>Bạn — {viewer.name}</strong>
          </header>
          <Psyche
            player={viewer}
            playerId={viewer.id}
            selectedCard={selectedCard}
            viewerId={viewer.id}
            isTargetingMode={isTargetingMode}
            onTargetSlot={handleTargetSlot}
          />
        </article>
        
        <div className="hand-and-controls">
          <section className="hand own-hand" id="own-hand">
            <div className="cards">
              {viewerHand.map((card) => (
                <div id={`hand-card-${card.instanceId}`} key={card.instanceId}>
                  <CardButton
                    card={card}
                    selected={card.instanceId === selectedCardId}
                    onClick={() => {
                      if (selectedCardId === card.instanceId) setSelectedCardId(undefined)
                      else setSelectedCardId(card.instanceId)
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
          
          <div className="controls-bar">
            {isTargetingMode && game.turn.phase === 'discard' && (
              <button type="button" className="primary action-btn" onClick={() => {
                const currentId = selectedCardId
                if (currentId) {
                  triggerGhost(`hand-card-${currentId}`, 'deck-discard', selectedCard)
                  executeCommand(() => props.onDiscard(currentId))
                }
              }}>
                {t('discardSelected')}
              </button>
            )}
            <button
              type="button"
              className="primary action-btn end-turn-btn"
              disabled={!isViewerTurn || game.turn.phase !== 'play' || isLocked}
              onClick={() => executeCommand(props.onEndTurn)}
            >
              {t('endTurn')}
            </button>
            <button className="log-icon-btn" type="button" onClick={(e) => { e.stopPropagation(); setShowLog(!showLog); }} aria-label={t('gameLog')}>
              📜
            </button>
          </div>
        </div>
      </section>

      <GameLogDrawer gameLog={props.gameLog} showLog={showLog} setShowLog={setShowLog} />
      <GhostLayer />
    </main>
  )
}
