import { describe, expect, it } from 'vitest'
import { createPlayerView } from '../game/playerView'
import { RoomService } from '../rooms/roomService'

function startedRoom() {
  const service = new RoomService()
  const { room, player: host } = service.createRoom('Ada')
  service.joinRoom(room.id, 'ben-id', 'Ben')
  return { service, room: service.startRoom(room.id, host.id), host }
}

describe('authoritative rooms', () => {
  it('creates a room and joins distinct players', () => {
    const service = new RoomService()
    const { room, player } = service.createRoom('Ada')
    const joined = service.joinRoom(room.id, 'ben-id', 'Ben')

    expect(joined.hostPlayerId).toBe(player.id)
    expect(joined.players.map((candidate) => candidate.displayName)).toEqual([
      'Ada',
      'Ben',
    ])
    expect(room.id).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('assigns unique short room codes', () => {
    const service = new RoomService()
    const first = service.createRoom('Ada').room
    const second = service.createRoom('Ben').room

    expect(first.id).not.toBe(second.id)
  })

  it('rejects invalid and duplicate joins', () => {
    const service = new RoomService()
    const { room } = service.createRoom('Ada')

    expect(() => service.joinRoom(room.id, 'ben-id', '')).toThrow(
      'Display name',
    )
    service.joinRoom(room.id, 'ben-id', 'Ben')
    expect(() => service.joinRoom(room.id, 'ben-id', 'Bea')).toThrow('already')
    expect(() => service.joinRoom(room.id, 'bea-id', 'Ben')).toThrow('unique')
    expect(() => service.joinRoom('MISSING', 'cam-id', 'Cam')).toThrow(
      'Room not found',
    )
  })

  it('keeps disconnected players in their slot and restores the same player on resume', () => {
    const { service, room, host } = startedRoom()
    const afterDisconnect = service.markDisconnected(room.id, 'ben-id')

    expect(afterDisconnect.players).toHaveLength(2)
    expect(
      afterDisconnect.players.find((player) => player.id === 'ben-id')
        ?.connected,
    ).toBe(false)
    expect(() =>
      service.executeCommand(room.id, 'ben-id', { type: 'draw' }),
    ).toThrow('Disconnected')

    const restored = service.resumeSession(room.id, 'ben-id', 'new-socket')
    expect(restored.players).toHaveLength(2)
    expect(
      restored.players.find((player) => player.id === 'ben-id'),
    ).toMatchObject({ connected: true, socketId: 'new-socket' })
    expect(restored.gameState).toBe(room.gameState)
    expect(restored.hostPlayerId).toBe(host.id)
  })

  it('allows only the host to start a valid player-count room', () => {
    const service = new RoomService()
    const { room, player: host } = service.createRoom('Ada')
    expect(() => service.startRoom(room.id, host.id)).toThrow('At least two')
    service.joinRoom(room.id, 'ben-id', 'Ben')
    expect(() => service.startRoom(room.id, 'ben-id')).toThrow('Only the host')

    const started = service.startRoom(room.id, host.id)
    expect(started.status).toBe('playing')
    expect(started.gameState?.players.map((player) => player.id)).toEqual([
      host.id,
      'ben-id',
    ])
  })

  it('does not allow the host to start while a lobby player is disconnected', () => {
    const service = new RoomService()
    const { room, player: host } = service.createRoom('Ada')
    service.joinRoom(room.id, 'ben-id', 'Ben')
    service.markDisconnected(room.id, 'ben-id')

    expect(() => service.startRoom(room.id, host.id)).toThrow(
      'All players must be connected',
    )
  })

  it('validates commands through the authoritative engine without mutating on error', () => {
    const { service, room } = startedRoom()
    const game = room.gameState!
    const beforeInvalid = structuredClone(game)
    const nonCurrent = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!

    expect(() =>
      service.executeCommand(room.id, nonCurrent.id, { type: 'draw' }),
    ).toThrow('current player')
    expect(room.gameState).toEqual(beforeInvalid)

    const result = service.executeCommand(room.id, game.currentPlayerId, {
      type: 'draw',
    })
    expect(result.turn.phase).toBe('play')
    expect(
      result.players.find((player) => player.id === game.currentPlayerId)?.hand,
    ).toHaveLength(6)
  })

  it('projects private hands differently for each viewer while sharing public state', () => {
    const { service, room } = startedRoom()
    const game = room.gameState!
    const firstPlayer = game.players[0]
    const secondPlayer = game.players[1]
    const firstView = createPlayerView(game, firstPlayer.id)
    const secondView = createPlayerView(game, secondPlayer.id)
    const firstSelf = firstView.players.find(
      (player) => player.id === firstPlayer.id,
    )!
    const firstOpponent = firstView.players.find(
      (player) => player.id === secondPlayer.id,
    )!
    const secondSelf = secondView.players.find(
      (player) => player.id === secondPlayer.id,
    )!

    expect(firstSelf.hand).toHaveLength(firstPlayer.hand.length)
    expect(firstOpponent.hand).toBeUndefined()
    expect(firstOpponent.handCount).toBe(secondPlayer.hand.length)
    expect(secondSelf.hand).toHaveLength(secondPlayer.hand.length)
    expect(firstView.currentPlayerId).toBe(secondView.currentPlayerId)
    expect(firstView.players.map((player) => player.psyche)).toEqual(
      secondView.players.map((player) => player.psyche),
    )

    const reconnectedRoom = service.resumeSession(
      room.id,
      secondPlayer.id,
      'second-new-socket',
    )
    const afterReconnectView = createPlayerView(
      reconnectedRoom.gameState!,
      firstPlayer.id,
    )
    expect(
      afterReconnectView.players.find((player) => player.id === secondPlayer.id)
        ?.hand,
    ).toBeUndefined()
  })
})
