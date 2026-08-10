import { useEffect, useRef, useState } from 'react'
import { GameBoard } from './GameBoard'
import {
  createMultiplayerClient,
  type MultiplayerSession,
  type RoomView,
} from '../multiplayer/multiplayerClient'
import type { PlayerGameView } from '../../server/game/playerView'

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
  const clientRef = useRef<ReturnType<typeof createMultiplayerClient> | null>(
    null,
  )

  useEffect(() => {
    const client = createMultiplayerClient(
      import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001',
      {
        onRoomState: setRoom,
        onGameState: setGame,
        onError: setError,
        onGameLog: setGameLog,
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
            ? `${currentRoomPlayer.displayName} disconnected — waiting for reconnect`
            : game.currentPlayerId === viewerId
              ? 'Your turn'
              : `Waiting for ${currentRoomPlayer?.displayName ?? 'current player'}`}
        </p>
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
          ← Back
        </button>
        <h1>Online Game</h1>
        {!room && (
          <>
            <label className="name-field">
              Display name
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
                Create Room
              </button>
            </div>
            <label className="name-field">
              Room code
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
              Join Room
            </button>
          </>
        )}
        {room && (
          <>
            <p className="room-code">
              Room code: <strong>{room.id}</strong>
            </p>
            <p>
              {room.players.length}/8 players{' '}
              {allConnected ? 'connected' : '— waiting for reconnect'}
            </p>
            <ul className="lobby-players">
              {room.players.map((player) => (
                <li key={player.id}>
                  <strong>{player.displayName}</strong>
                  {player.id === room.hostPlayerId && ' (Host)'} —{' '}
                  {player.connected ? 'connected' : 'disconnected'}
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
                Start Game
              </button>
            )}
            {!isHost && <p>Waiting for host to start.</p>}
          </>
        )}
        {error && <p className="error">{error}</p>}
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
        Waiting for a player to resolve {decision.kind}.
      </section>
    )
  if (decision.kind === 'anxiety')
    return (
      <section className="panel pending-decision">
        <h2>Anxiety: choose a hidden card</h2>
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
      <h2>Tremors: discard 3 cards</h2>
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
        Discard 3 cards
      </button>
    </section>
  )
}
