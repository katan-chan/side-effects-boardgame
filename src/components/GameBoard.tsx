import { useEffect, useMemo, useState } from 'react'
import type { CardInstance } from '../game/cards/types'
import type { GameState, PlayerState } from '../game/engine/types'
import type {
  PlayerGameView,
  PlayerView,
  PublicCardView,
  PublicPsycheSlotView,
} from '../../server/game/playerView'
import { disorderName, localizeError, phaseName, t } from '../i18n'
import { getCardDefinition } from '../game/cards/catalog'
import { GameCard } from './cards/GameCard'
import { CardBack } from './cards/CardBack'
import { OpponentAvatarBar } from './OpponentAvatarBar'
import { OpponentHand } from './OpponentHand'
import { GameLogDrawer } from './GameLogDrawer'
import { PlayerSidebar } from './sidebar/PlayerSidebar'
import { GhostLayer, triggerGhost } from './GhostLayer'
import { useGameAudio } from '../audio/useGameAudio'
import { audioManager } from '../audio/audioManager'
import { AudioSettings } from './AudioSettings'

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
  onForfeit: () => void
  onLeave?: () => void
  onClearError?: () => void
  onDiscard: (cardId: string) => void
  onManualDiscard: (cardId: string) => void
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
          if (selectedCard.cardType === 'drug') {
            const definition = getCardDefinition(selectedCard.definitionId)
            canSelect = isOwn && isUntreated && definition?.cardType === 'drug' &&
              slot.disorder.definitionId === definition.treats
          } else if (selectedCard.cardType === 'therapy') {
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
          event.currentTarget.blur()
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
  const [sortMode, setSortMode] = useState<'original' | 'type' | 'name'>('original')

  useGameAudio(game as PlayerGameView, viewer.id)

  const selectedCard = viewerHand.find((card) => card.instanceId === selectedCardId)
  const selectedTreatment = selectedCard?.cardType === 'drug'
    ? getCardDefinition(selectedCard.definitionId)
    : undefined
  const sortedHand = useMemo(() => {
    if (sortMode === 'original') return viewerHand
    return [...viewerHand].sort((a, b) =>
      sortMode === 'type'
        ? a.cardType.localeCompare(b.cardType) || a.displayName.localeCompare(b.displayName)
        : a.displayName.localeCompare(b.displayName),
    )
  }, [sortMode, viewerHand])
  const isTargetingMode = selectedCard !== undefined

  const opponents = game.players.filter((player) => player.id !== viewer.id)
  const focusedOpponent =
    opponents.find((player) => player.id === focusedOpponentId) ??
    opponents.find((player) => player.id === game.currentPlayerId) ??
    opponents[0]
  // The resolved id, not the raw state: before the first click focusedOpponentId
  // is undefined while an opponent is already being shown, so highlighting off
  // the raw state would leave the watched player unmarked at game start.
  const watchedOpponentId = focusedOpponent?.id
  const watchedHandCount = focusedOpponent
    ? 'handCount' in focusedOpponent
      ? focusedOpponent.handCount
      : (focusedOpponent.hand?.length ?? 0)
    : 0

  useEffect(() => {
    // Unlock interaction when game state changes (server responded)
    setIsLocked(false)
    if (selectedCardId && !viewerHand.some((card) => card.instanceId === selectedCardId)) {
      setSelectedCardId(undefined)
    }
  }, [game.turnNumber, game.turn.cardsPlayedThisTurn, game.turn.phase, viewerHand])

  useEffect(() => {
    if (props.error) {
      setIsLocked(false)
    }
  }, [props.error])

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

  const isDiscardPhase = isViewerTurn && game.turn.phase === 'discard'

  const handleTargetSlot = (ownerId: string, slotId: string) => {
    if (!selectedCard || isLocked || !isViewerTurn) return

    if (selectedCard.cardType === 'drug' && ownerId === viewer.id) {
      audioManager.play('click') // fallback click, semantic sound on land
      triggerGhost(`hand-card-${selectedCard.instanceId}`, `slot-${slotId}`, selectedCard, 'card', () => {
        audioManager.play('drug-play')
      })
      executeCommand(() => props.onPlayDrug(selectedCard.instanceId, slotId))
    } else if (selectedCard.cardType === 'therapy' && ownerId === viewer.id) {
      audioManager.play('click')
      triggerGhost(`hand-card-${selectedCard.instanceId}`, `slot-${slotId}`, selectedCard, 'card', () => {
        audioManager.play('therapy-play')
      })
      executeCommand(() => props.onPlayTherapy(selectedCard.instanceId, slotId))
    } else if (selectedCard.cardType === 'episode' && ownerId !== viewer.id) {
      audioManager.play('click')
      triggerGhost(`hand-card-${selectedCard.instanceId}`, `slot-${slotId}`, selectedCard, 'card', () => {
        audioManager.play('episode')
      })
      executeCommand(() => props.onPlayEpisode(selectedCard.instanceId, ownerId, slotId))
    }
  }

  const handleTargetOpponent = (opponentId: string) => {
    if (!selectedCard || isLocked || !isViewerTurn) {
      audioManager.play('click')
      setFocusedOpponentId(opponentId) // Just focus if not targeting
      return
    }

    audioManager.play('click')
    setFocusedOpponentId(opponentId)
  }

  const handleBackgroundClick = () => {
    if (selectedCardId) setSelectedCardId(undefined)
  }

  return (
    <main
      className={`game-board ${isTargetingMode ? 'targeting-mode' : ''} ${isLocked ? 'interaction-locked' : ''}`}
      onClick={handleBackgroundClick}
    >
      <PlayerSidebar
        player={viewer}
        isViewerTurn={isViewerTurn}
        currentPlayerName={current.name}
        phase={game.turn.phase}
        cardsPlayedThisTurn={game.turn.cardsPlayedThisTurn}
        turnNumber={game.turnNumber}
        gameLog={props.gameLog}
      />
      <div className="top-actions" onClick={(event) => event.stopPropagation()}>
        {props.onLeave && (
          <button type="button" className="btn-danger top-action-btn" onClick={props.onLeave}>
            Về phòng
          </button>
        )}
        <button
          type="button"
          className="btn-danger top-action-btn"
          disabled={!isViewerTurn || game.status !== 'playing' || isLocked}
          onClick={() => {
            if (window.confirm('Bạn chắc chắn muốn xin thua ván này?')) executeCommand(props.onForfeit)
          }}
        >
          Xin thua
        </button>
        <button className="log-icon-btn top-action-icon" type="button" onClick={() => { audioManager.play('click'); setShowLog(!showLog) }} aria-label={t('gameLog')}>
          📜
        </button>
        <AudioSettings />
      </div>
      <section className="opponent-zone">
        {opponents.length > 1 && (
          <OpponentAvatarBar
            opponents={opponents}
            focusedOpponentId={watchedOpponentId}
            setFocusedOpponentId={handleTargetOpponent}
            targetPlayerId={
              isTargetingMode && selectedCard?.cardType === 'disorder' ? watchedOpponentId : undefined
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
            <header className="opponent-header">
              <strong>{focusedOpponent.name}</strong>
            </header>
            <OpponentHand
              count={watchedHandCount}
              playerName={focusedOpponent.name}
              playerId={focusedOpponent.id}
            />
            {selectedCard?.cardType === 'disorder' && isViewerTurn && (
              <button
                type="button"
                className="primary apply-card-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  triggerGhost(`hand-card-${selectedCard.instanceId}`, `avatar-${focusedOpponent.id}`, selectedCard, 'card', () => audioManager.play('disorder-play'))
                  executeCommand(() => props.onPlayDisorder(selectedCard.instanceId, focusedOpponent.id))
                }}
              >
                Áp dụng vào Tâm trí của {focusedOpponent.name}
              </button>
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
              audioManager.play('draw')
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
        {props.error && (
          <div className="game-error-modal" role="alertdialog" aria-modal="true">
            <div className="game-error-panel">
              <h2>Không thể thực hiện</h2>
              <p>{localizeError(props.error)}</p>
              <button type="button" className="primary" onClick={props.onClearError}>Đã hiểu</button>
            </div>
          </div>
        )}

        {isDiscardPhase && (
          <p className="turn-hint">Bạn đang có {viewerHand.length} lá. Hãy chọn và bỏ {viewerHand.length - 6} lá để tiếp tục.</p>
        )}
        
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
          {isTargetingMode && (
            <button 
              type="button" 
              className="cancel-target-btn mobile-only" 
              onClick={() => {
                audioManager.play('click')
                setSelectedCardId(undefined)
              }}
              style={{
                position: 'absolute',
                top: '-3rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                borderRadius: '99px',
                padding: '0.4rem 1.2rem',
                backgroundColor: '#a42c2c',
                borderColor: '#e84848',
                boxShadow: '0 4px 12px #000a'
              }}
            >
              ✖ {t('cancel')}
            </button>
          )}
          <section className="hand own-hand" id="own-hand">
            {selectedTreatment?.cardType === 'drug' && (
              <div className="selection-hint">
                Thuốc này chữa được: <strong>{disorderName(selectedTreatment.treats)}</strong>
              </div>
            )}
            <div className="cards">
              {sortedHand.map((card) => (
                <div id={`hand-card-${card.instanceId}`} key={card.instanceId}>
                  <CardButton
                    card={card}
                    selected={card.instanceId === selectedCardId}
                    onClick={() => {
                      audioManager.play('click')
                      if (selectedCardId === card.instanceId) setSelectedCardId(undefined)
                      else setSelectedCardId(card.instanceId)
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
          
          <div className="controls-bar">
            <button
              type="button"
              className="utility-btn"
              onClick={() => setSortMode(sortMode === 'original' ? 'type' : sortMode === 'type' ? 'name' : 'original')}
              title="Sắp xếp bài trên tay"
            >
              {sortMode === 'original' ? 'Sắp xếp' : sortMode === 'type' ? 'Theo loại' : 'Theo tên'}
            </button>
            {isTargetingMode && isViewerTurn && game.turn.phase === 'play' && (
              <button
                type="button"
                className="btn-danger action-btn"
                disabled={isLocked}
                onClick={() => {
                  const currentId = selectedCardId
                  if (currentId) executeCommand(() => props.onManualDiscard(currentId))
                }}
              >
                Bỏ bài
              </button>
            )}
            {isTargetingMode && isDiscardPhase && (
              <button type="button" className="primary action-btn" onClick={() => {
                const currentId = selectedCardId
                if (currentId) {
                  audioManager.play('discard')
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
              onClick={() => {
                audioManager.play('click')
                executeCommand(props.onEndTurn)
              }}
            >
              {t('endTurn')}
            </button>
          </div>
        </div>
      </section>

      <GameLogDrawer gameLog={props.gameLog} showLog={showLog} setShowLog={setShowLog} />
      <GhostLayer />
    </main>
  )
}
