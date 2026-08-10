import { useEffect, useRef, useState } from 'react'
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
    return (
      <main className="setup-screen">
        <section className="panel">
          <h1>Online game started</h1>
          <p>
            Server-authoritative state connected. Current player:{' '}
            {game.currentPlayerId}
          </p>
          <p>
            Gameplay board integration remains intentionally separate from this
            lobby sprint.
          </p>
        </section>
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
