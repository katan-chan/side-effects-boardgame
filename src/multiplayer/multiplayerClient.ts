import { io, type Socket } from 'socket.io-client'
import type { GameCommand } from '../../server/game/commands'
import type { PlayerGameView } from '../../server/game/playerView'

const PLAYER_ID_KEY = 'side-effects.player-id'
const SESSION_KEY = 'side-effects.room-session'

export interface RoomView {
  id: string
  hostPlayerId: string
  status: 'lobby' | 'playing' | 'finished'
  players: { id: string; displayName: string; connected: boolean }[]
}

export interface MultiplayerSession {
  roomId: string
  playerId: string
}

export interface MultiplayerClientHandlers {
  onRoomState?: (room: RoomView) => void
  onGameState?: (game: PlayerGameView) => void
  onError?: (message: string) => void
  onSessionRestored?: (session: MultiplayerSession) => void
}

function storage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.sessionStorage
}

export function getStablePlayerId(): string {
  const sessionStorage = storage()
  const existing = sessionStorage?.getItem(PLAYER_ID_KEY)
  if (existing) return existing
  const playerId =
    globalThis.crypto?.randomUUID?.() ?? `player-${Date.now()}-${Math.random()}`
  sessionStorage?.setItem(PLAYER_ID_KEY, playerId)
  return playerId
}

export function getSavedSession(): MultiplayerSession | undefined {
  const raw = storage()?.getItem(SESSION_KEY)
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as MultiplayerSession
  } catch {
    return undefined
  }
}

function saveSession(session: MultiplayerSession): void {
  storage()?.setItem(SESSION_KEY, JSON.stringify(session))
}

/** Thin transport adapter. The server remains the source of truth for all game state. */
export function createMultiplayerClient(
  url: string,
  handlers: MultiplayerClientHandlers = {},
) {
  const socket: Socket = io(url, { autoConnect: false })
  const playerId = getStablePlayerId()
  if (handlers.onRoomState) socket.on('room:state', handlers.onRoomState)
  if (handlers.onGameState) socket.on('game:state', handlers.onGameState)
  if (handlers.onError) socket.on('game:error', handlers.onError)
  socket.on('session:restored', (session: MultiplayerSession) => {
    saveSession(session)
    handlers.onSessionRestored?.(session)
  })
  socket.on('connect', () => {
    const session = getSavedSession()
    if (session?.playerId === playerId) socket.emit('session:resume', session)
  })

  return {
    playerId,
    connect: () => socket.connect(),
    disconnect: () => socket.disconnect(),
    createRoom: (displayName: string) =>
      socket.emit('room:create', { displayName, playerId }),
    joinRoom: (roomId: string, displayName: string) =>
      socket.emit('room:join', {
        roomId: roomId.trim().toUpperCase(),
        playerId,
        displayName,
      }),
    startRoom: () => socket.emit('room:start'),
    sendCommand: (command: GameCommand) => socket.emit('game:command', command),
  }
}
