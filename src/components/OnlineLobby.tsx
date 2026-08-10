import { useEffect, useRef, useState } from 'react'
import { GameBoard } from './GameBoard'
import {
  createMultiplayerClient,
  multiplayerServerUrl,
  type ConnectionState,
  type MultiplayerSession,
  type RoomView,
} from '../multiplayer/multiplayerClient'
import type { PlayerGameView } from '../../server/game/playerView'
import { disorderName, localizeError, t } from '../i18n'

interface OnlineLobbyProps {
  onBack: () => void
}

export function OnlineLobby({ onBack }: OnlineLobbyProps) {
  const [displayName, setDisplayName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [room, setRoom] = useState<RoomView>()
  const [session, setSession] = useState<MultiplayerSession>()
  const [game, setGame] = useState<PlayerGameView>()
  const [error, setError] = useState<string>()
  const [gameLog, setGameLog] = useState<string[]>([])
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting')
  const clientRef = useRef<ReturnType<typeof createMultiplayerClient> | null>(
    null,
  )

  useEffect(() => {
    const client = createMultiplayerClient(
      multiplayerServerUrl,
      {
        onRoomState: setRoom,
        onGameState: setGame,
        onError: setError,
        onGameLog: setGameLog,
        onConnectionState: setConnectionState,
        onSessionRestored: setSession,
      },
    )
    clientRef.current = client
    client.connect()
    return () => {
      client.disconnect()
    }
  }, [])

  const isHost = room?.hostPlayerId === session?.playerId
  const allConnected =
    room?.players.every((player) => player.connected) ?? false
  const canStart = Boolean(
    isHost &&
    room &&
    room.players.length >= 2 &&
    room.players.length <= 8 &&
    allConnected,
  )

  if (game) {
    const viewerId = session?.playerId ?? ''
    const currentRoomPlayer = room?.players.find(
      (player) => player.id === game.currentPlayerId,
    )
    return (
      <main className="online-game">
        <p className="connection-status">
          {currentRoomPlayer?.connected === false
            ? `${currentRoomPlayer.displayName} — ${t('waitingForReconnect')}`
            : game.currentPlayerId === viewerId
              ? t('yourTurn')
              : t('waitingFor', { player: currentRoomPlayer?.displayName ?? t('currentPlayer') })}
        </p>
        {connectionState !== 'connected' && (
          <p className="error">{t('reconnecting')}</p>
        )}
        {game.pendingDecision && (
          <PendingDecision
            decision={game.pendingDecision}
            viewerId={viewerId}
            onResolve={(choiceIds) =>
              clientRef.current?.resolveDecision(
                game.pendingDecision!.id,
                choiceIds,
              )
            }
          />
        )}
        <GameBoard
          game={game}
          viewerPlayerId={viewerId}
          error={error}
          gameLog={gameLog}
          onDraw={() => clientRef.current?.sendCommand({ type: 'draw' })}
          onEndTurn={() => clientRef.current?.sendCommand({ type: 'endTurn' })}
          onDiscard={(cardInstanceId) =>
            clientRef.current?.sendCommand({ type: 'discard', cardInstanceId })
          }
          onPlayDrug={(drugCardId, disorderCardId) =>
            clientRef.current?.sendCommand({
              type: 'playDrug',
              drugCardId,
              disorderCardId,
            })
          }
          onPlayDisorder={(disorderCardId, targetPlayerId) =>
            clientRef.current?.sendCommand({
              type: 'playDisorder',
              disorderCardId,
              targetPlayerId,
            })
          }
          onPlayEpisode={(
            episodeCardId,
            targetPlayerId,
            targetDisorderCardId,
          ) =>
            clientRef.current?.sendCommand({
              type: 'playEpisode',
              episodeCardId,
              targetPlayerId,
              targetDisorderCardId,
            })
          }
          onPlayTherapy={(therapyCardId, disorderCardId) =>
            clientRef.current?.sendCommand({
              type: 'playTherapy',
              therapyCardId,
              disorderCardId,
            })
          }
        />
      </main>
    )
  }

  return (
    <main className="setup-screen">
      <section className="panel online-lobby">
        <button type="button" onClick={onBack}>
          {t('back')}
        </button>
        <h1>{t('onlineGame')}</h1>
        {connectionState !== 'connected' && (
          <p className="error">
            {connectionState === 'unavailable'
              ? t('unavailable')
              : connectionState === 'connecting' ? t('connecting') : t('reconnecting')}
          </p>
        )}
        {!room && (
          <>
            <label className="name-field">
              {t('displayName')}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                className="primary"
                disabled={!displayName.trim()}
                onClick={() =>
                  clientRef.current?.createRoom(displayName.trim())
                }
              >
                {t('createRoom')}
              </button>
            </div>
            <label className="name-field">
              {t('roomCode')}
              <input
                value={roomCode}
                maxLength={6}
                placeholder="ABC123"
                onChange={(event) =>
                  setRoomCode(event.target.value.toUpperCase())
                }
              />
            </label>
            <button
              type="button"
              disabled={!displayName.trim() || !roomCode.trim()}
              onClick={() =>
                clientRef.current?.joinRoom(roomCode, displayName.trim())
              }
            >
              {t('joinRoom')}
            </button>
          </>
        )}
        {room && (
          <>
            <p className="room-code">
              {t('roomCode')}: <strong>{room.id}</strong>
            </p>
            <p>
              {room.players.length}/8 {t('player').toLowerCase()}{' '}
              {allConnected ? t('connected') : `— ${t('waitingForReconnect')}`}
            </p>
            <ul className="lobby-players">
              {room.players.map((player) => (
                <li key={player.id}>
                  <strong>{player.displayName}</strong>
                  {player.id === room.hostPlayerId && ` (${t('host')})`} —{' '}
                  {player.connected ? t('connected') : t('disconnected')}
                </li>
              ))}
            </ul>
            {isHost && (
              <button
                type="button"
                className="primary"
                disabled={!canStart}
                onClick={() => clientRef.current?.startRoom()}
              >
                {t('startGame')}
              </button>
            )}
            {!isHost && <p>{t('waitingForHost')}</p>}
          </>
        )}
        {error && <p className="error">{localizeError(error)}</p>}
      </section>
    </main>
  )
}

function PendingDecision({
  decision,
  viewerId,
  onResolve,
}: {
  decision: NonNullable<PlayerGameView['pendingDecision']>
  viewerId: string
  onResolve: (choices: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const isChooser = decision.chooserPlayerId === viewerId
  if (!isChooser)
    return (
      <section className="panel pending-decision">
        {t('waitingDecision', { effect: disorderName(decision.kind) })}
      </section>
    )
  if (decision.kind === 'anxiety')
    return (
      <section className="panel pending-decision">
        <h2>{t('anxietyChoice')}</h2>
        {decision.choices?.map((choice) => (
          <button
            type="button"
            key={choice.id}
            onClick={() => onResolve([choice.id])}
          >
            {choice.label}
          </button>
        ))}
      </section>
    )
  return (
    <section className="panel pending-decision">
      <h2>{t('tremorsChoice')}</h2>
      {decision.choices?.map((choice) => (
        <label className="check" key={choice.id}>
          <input
            type="checkbox"
            checked={selected.includes(choice.id)}
            onChange={() =>
              setSelected((ids) =>
                ids.includes(choice.id)
                  ? ids.filter((id) => id !== choice.id)
                  : [...ids, choice.id],
              )
            }
          />
          {choice.label}
        </label>
      ))}
      <button
        type="button"
        className="primary"
        disabled={selected.length !== 3}
        onClick={() => onResolve(selected)}
      >
        {t('discardThree')}
      </button>
    </section>
  )
}
