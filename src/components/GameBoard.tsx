import { useEffect, useMemo, useState } from 'react'
import type { CardInstance } from '../game/cards/types'
import type { GameState, PlayerState } from '../game/engine/types'

interface GameBoardProps {
  game: GameState
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

function Psyche({ player }: { player: PlayerState }) {
  return (
    <div className="psyche">
      {player.psyche.slots.map((slot) => (
        <div className="slot" key={slot.disorder.instanceId}>
          <strong>{slot.disorder.displayName}</strong>
          <span className={slot.drug ? 'treated' : 'untreated'}>
            {slot.drug ? 'TREATED' : 'UNTREATED'}
          </span>
          {slot.drug && <small>{slot.drug.displayName}</small>}
        </div>
      ))}
    </div>
  )
}

function CardButton({
  card,
  selected,
  onClick,
}: {
  card: CardInstance
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <small>{card.cardType}</small>
      {card.displayName}
    </button>
  )
}

export function GameBoard(props: GameBoardProps) {
  const { game } = props
  const current = game.players[game.currentPlayerIndex]
  const [selectedCardId, setSelectedCardId] = useState<string>()
  const [targetPlayerId, setTargetPlayerId] = useState<string>()
  const [targetDisorderId, setTargetDisorderId] = useState<string>()
  const [chosenCardId, setChosenCardId] = useState<string>()
  const [tremorsIds, setTremorsIds] = useState<string[]>([])
  const selectedCard = current.hand.find(
    (card) => card.instanceId === selectedCardId,
  )
  const target = game.players.find((player) => player.id === targetPlayerId)
  const untreatedOwn = current.psyche.slots.filter((slot) => !slot.drug)
  const untreatedTarget =
    target?.psyche.slots.filter((slot) => !slot.drug) ?? []
  const resetChoice = () => {
    setSelectedCardId(undefined)
    setTargetDisorderId(undefined)
    setChosenCardId(undefined)
    setTremorsIds([])
  }
  const targetPlayerControl = (
    <label>
      Target player
      <select
        value={targetPlayerId ?? ''}
        onChange={(event) => {
          setTargetPlayerId(event.target.value || undefined)
          setTargetDisorderId(undefined)
          setChosenCardId(undefined)
          setTremorsIds([])
        }}
      >
        <option value="">Choose opponent</option>
        {game.players
          .filter((player) => player.id !== current.id)
          .map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
      </select>
    </label>
  )

  useEffect(() => {
    if (
      selectedCardId &&
      !current.hand.some((card) => card.instanceId === selectedCardId)
    ) {
      resetChoice()
    }
  }, [current.id, current.hand, selectedCardId])

  const actionPanel = useMemo(() => {
    if (!selectedCard) return <p>Select a card from your hand.</p>
    if (game.turn.phase === 'discard')
      return (
        <button
          type="button"
          className="primary"
          onClick={() => {
            props.onDiscard(selectedCard.instanceId)
          }}
        >
          Discard selected card
        </button>
      )
    if (game.turn.phase !== 'play') return <p>Draw before playing cards.</p>
    const ownSelector = (
      <label>
        Own untreated Disorder
        <select
          value={targetDisorderId ?? ''}
          onChange={(event) =>
            setTargetDisorderId(event.target.value || undefined)
          }
        >
          <option value="">Choose Disorder</option>
          {untreatedOwn.map((slot) => (
            <option
              key={slot.disorder.instanceId}
              value={slot.disorder.instanceId}
            >
              {slot.disorder.displayName}
            </option>
          ))}
        </select>
      </label>
    )
    if (selectedCard.cardType === 'drug')
      return (
        <>
          {ownSelector}
          <button
            type="button"
            className="primary"
            disabled={!targetDisorderId}
            onClick={() => {
              if (targetDisorderId)
                props.onPlayDrug(selectedCard.instanceId, targetDisorderId)
            }}
          >
            Play Drug
          </button>
        </>
      )
    if (selectedCard.cardType === 'therapy')
      return (
        <>
          {ownSelector}
          <button
            type="button"
            className="primary"
            disabled={!targetDisorderId}
            onClick={() => {
              if (targetDisorderId)
                props.onPlayTherapy(selectedCard.instanceId, targetDisorderId)
            }}
          >
            Play Therapy
          </button>
        </>
      )
    if (selectedCard.cardType === 'disorder')
      return (
        <>
          {targetPlayerControl}
          <button
            type="button"
            className="primary"
            disabled={!targetPlayerId}
            onClick={() => {
              if (targetPlayerId)
                props.onPlayDisorder(selectedCard.instanceId, targetPlayerId)
            }}
          >
            Play Disorder
          </button>
        </>
      )
    const targetDisorder = untreatedTarget.find(
      (slot) => slot.disorder.instanceId === targetDisorderId,
    )
    const isAnxiety = targetDisorder?.disorder.definitionId === 'anxiety'
    const isTremors = targetDisorder?.disorder.definitionId === 'tremors'
    const missingAnxietyChoice =
      isAnxiety && target && target.hand.length > 0 && !chosenCardId
    const invalidTremorsChoice =
      isTremors && target && target.hand.length >= 3 && tremorsIds.length !== 3
    return (
      <>
        {targetPlayerControl}
        {target && (
          <label>
            Untreated target Disorder
            <select
              value={targetDisorderId ?? ''}
              onChange={(event) => {
                setTargetDisorderId(event.target.value || undefined)
                setChosenCardId(undefined)
                setTremorsIds([])
              }}
            >
              <option value="">Choose Disorder</option>
              {untreatedTarget.map((slot) => (
                <option
                  key={slot.disorder.instanceId}
                  value={slot.disorder.instanceId}
                >
                  {slot.disorder.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        {isAnxiety && target && target.hand.length > 0 && (
          <label>
            Take card
            <select
              value={chosenCardId ?? ''}
              onChange={(event) =>
                setChosenCardId(event.target.value || undefined)
              }
            >
              <option value="">Choose card</option>
              {target.hand.map((card) => (
                <option key={card.instanceId} value={card.instanceId}>
                  {card.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        {isTremors && target && target.hand.length >= 3 && (
          <fieldset>
            <legend>Tremors: discard exactly 3 target cards</legend>
            {target.hand.map((card) => (
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
                {card.displayName}
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
          Play Episode
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
        <strong>Current: {current.name}</strong>
        <span>Turn {game.turnNumber}</span>
        <span>Phase: {game.turn.phase}</span>
        <span>Played: {game.turn.cardsPlayedThisTurn}/2</span>
        <span>Draw: {game.drawPile.length}</span>
        <span>Discard: {game.discardPile.length}</span>
      </header>
      {props.error && <p className="error">{props.error}</p>}
      <section className="players">
        {game.players.map((player) => (
          <article
            className={`player panel ${player.id === current.id ? 'current-player' : ''}`}
            key={player.id}
          >
            <h2>{player.name}</h2>
            <p>Hand: {player.hand.length}</p>
            {(player.effects.skipTurns > 0 ||
              player.effects.skipDrawTurns > 0 ||
              player.effects.cannotPlayTurns > 0) && (
              <p className="effects">
                Effects:{' '}
                {player.effects.skipTurns > 0 &&
                  `skip turn ×${player.effects.skipTurns} `}
                {player.effects.skipDrawTurns > 0 &&
                  `skip draw ×${player.effects.skipDrawTurns} `}
                {player.effects.cannotPlayTurns > 0 &&
                  `cannot play ×${player.effects.cannotPlayTurns}`}
              </p>
            )}
            <Psyche player={player} />
          </article>
        ))}
      </section>
      <section className="hand panel">
        <h2>{current.name}'s hand</h2>
        <div className="cards">
          {current.hand.map((card) => (
            <CardButton
              card={card}
              key={card.instanceId}
              selected={card.instanceId === selectedCardId}
              onClick={() => setSelectedCardId(card.instanceId)}
            />
          ))}
        </div>
        <div className="action-panel">{actionPanel}</div>
      </section>
      <section className="game-log panel">
        <h2>Game log</h2>
        <ol>
          {props.gameLog.slice(-10).map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ol>
      </section>
      <footer className="button-row">
        <button
          type="button"
          disabled={game.turn.phase !== 'draw'}
          onClick={props.onDraw}
        >
          Draw
        </button>
        <button
          type="button"
          className="primary"
          disabled={game.turn.phase !== 'play'}
          onClick={props.onEndTurn}
        >
          End Turn
        </button>
      </footer>
    </main>
  )
}
