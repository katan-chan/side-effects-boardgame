import type { Server, Socket } from 'socket.io'
import { createPlayerView } from '../game/playerView'
import type { GameCommand } from '../game/commands'
import { RoomService } from '../rooms/roomService'
import type { Room } from '../rooms/types'

interface Session {
  roomId: string
  playerId: string
}

export function registerSocketHandlers(io: Server, rooms: RoomService): void {
  const sessions = new Map<string, Session>()

  const roomState = (room: Room) => ({
    id: room.id,
    hostPlayerId: room.hostPlayerId,
    status: room.status,
    players: room.players.map(({ id, displayName, connected }) => ({
      id,
      displayName,
      connected,
    })),
  })
  const broadcastRoom = (room: Room) =>
    io.to(room.id).emit('room:state', roomState(room))
  const broadcastGame = (room: Room) => {
    if (!room.gameState) return
    for (const player of room.players) {
      if (player.socketId)
        io.to(player.socketId).emit(
          'game:state',
          createPlayerView(room.gameState, player.id, room.pendingDecision),
        )
    }
    io.to(room.id).emit('game:log', room.gameLog)
  }
  const fail = (socket: Socket, error: unknown) =>
    socket.emit(
      'game:error',
      error instanceof Error ? error.message : 'Unable to process request.',
    )
  const activeSession = (socket: Socket): Session => {
    const session = sessions.get(socket.id)
    if (!session) throw new Error('Join a room first.')
    if (!rooms.isActiveSocket(session.roomId, session.playerId, socket.id))
      throw new Error('This socket session is no longer active.')
    return session
  }

  io.on('connection', (socket) => {
    socket.on(
      'room:create',
      ({
        displayName,
        playerId,
      }: {
        displayName: string
        playerId: string
      }) => {
        try {
          const { room, player } = rooms.createRoom(
            displayName,
            playerId,
            socket.id,
          )
          sessions.set(socket.id, { roomId: room.id, playerId: player.id })
          socket.join(room.id)
          socket.emit('room:state', roomState(room))
          socket.emit('session:restored', {
            roomId: room.id,
            playerId: player.id,
          })
        } catch (error) {
          fail(socket, error)
        }
      },
    )

    socket.on(
      'room:join',
      ({
        roomId,
        playerId,
        displayName,
      }: {
        roomId: string
        playerId: string
        displayName: string
      }) => {
        try {
          const room = rooms.joinRoom(roomId, playerId, displayName, socket.id)
          sessions.set(socket.id, { roomId, playerId })
          socket.join(roomId)
          socket.emit('session:restored', { roomId, playerId })
          broadcastRoom(room)
        } catch (error) {
          fail(socket, error)
        }
      },
    )

    socket.on('session:resume', ({ roomId, playerId }: Session) => {
      try {
        const room = rooms.resumeSession(roomId, playerId, socket.id)
        sessions.set(socket.id, { roomId, playerId })
        socket.join(roomId)
        socket.emit('session:restored', { roomId, playerId })
        broadcastRoom(room)
        broadcastGame(room)
      } catch (error) {
        fail(socket, error)
      }
    })

    socket.on('room:start', () => {
      try {
        const session = activeSession(socket)
        const room = rooms.startRoom(session.roomId, session.playerId)
        broadcastRoom(room)
        broadcastGame(room)
      } catch (error) {
        fail(socket, error)
      }
    })

    socket.on('game:command', (command: GameCommand) => {
      try {
        const session = activeSession(socket)
        rooms.executeCommand(session.roomId, session.playerId, command)
        const room = rooms.getRoom(session.roomId)!
        broadcastRoom(room)
        broadcastGame(room)
      } catch (error) {
        fail(socket, error)
      }
    })

    socket.on(
      'game:decision',
      ({
        decisionId,
        choiceIds,
      }: {
        decisionId: string
        choiceIds: string[]
        }) => {
        try {
          const session = activeSession(socket)
          rooms.resolveDecision(
            session.roomId,
            session.playerId,
            decisionId,
            choiceIds,
          )
          const room = rooms.getRoom(session.roomId)!
          broadcastRoom(room)
          broadcastGame(room)
        } catch (error) {
          fail(socket, error)
        }
      },
    )

    socket.on('disconnect', () => {
      const session = sessions.get(socket.id)
      sessions.delete(socket.id)
      if (!session) return
      try {
        const room = rooms.markDisconnected(
          session.roomId,
          session.playerId,
          socket.id,
        )
        broadcastRoom(room)
      } catch {
        // The in-memory room may already have been removed from a lobby leave.
      }
    })
  })
}
