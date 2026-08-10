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

  it('ignores a stale socket disconnect after the player has reconnected', () => {
    const { service, room } = startedRoom()
    service.resumeSession(room.id, 'ben-id', 'replacement-socket')

    const afterStaleDisconnect = service.markDisconnected(
      room.id,
      'ben-id',
      'old-socket',
    )

    expect(
      afterStaleDisconnect.players.find((player) => player.id === 'ben-id'),
    ).toMatchObject({ connected: true, socketId: 'replacement-socket' })
    expect(
      service.isActiveSocket(room.id, 'ben-id', 'replacement-socket'),
    ).toBe(true)
    expect(service.isActiveSocket(room.id, 'ben-id', 'old-socket')).toBe(false)
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

  it('rejects duplicate or stale commands without changing the authoritative game', () => {
    const { service, room } = startedRoom()
    const currentPlayerId = room.gameState!.currentPlayerId
    service.executeCommand(room.id, currentPlayerId, { type: 'draw' })
    const afterDraw = structuredClone(room.gameState)

    expect(() =>
      service.executeCommand(room.id, currentPlayerId, { type: 'draw' }),
    ).toThrow('draw phase')
    expect(room.gameState).toEqual(afterDraw)
    expect(room.gameLog).toHaveLength(2)
  })

  it('waits for a disconnected current player without allowing another player to act', () => {
    const { service, room } = startedRoom()
    const currentPlayerId = room.gameState!.currentPlayerId
    const otherPlayerId = room.gameState!.players.find(
      (player) => player.id !== currentPlayerId,
    )!.id
    service.markDisconnected(room.id, currentPlayerId)
    const beforeAttempt = structuredClone(room.gameState)

    expect(() =>
      service.executeCommand(room.id, otherPlayerId, { type: 'draw' }),
    ).toThrow('current player')
    expect(room.gameState).toEqual(beforeAttempt)

    service.resumeSession(room.id, currentPlayerId, 'returning-socket')
    expect(
      service.executeCommand(room.id, currentPlayerId, { type: 'draw' }).turn
        .phase,
    ).toBe('play')
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

  it('does not leak Anxiety pending hand choices to non-choosers', () => {
    const { room } = startedRoom()
    const game = room.gameState!
    const attacker = game.players[game.currentPlayerIndex]
    const target = game.players.find((player) => player.id !== attacker.id)!
    const pending = {
      id: 'decision-1',
      kind: 'anxiety' as const,
      chooserPlayerId: attacker.id,
      command: {
        type: 'playEpisode' as const,
        episodeCardId: 'episode-01',
        targetPlayerId: target.id,
        targetDisorderCardId: target.psyche.slots[0].disorder.instanceId,
      },
      choiceMap: Object.fromEntries(
        target.hand.map((card, index) => [
          `choice-${index + 1}`,
          card.instanceId,
        ]),
      ),
    }

    const attackerView = createPlayerView(game, attacker.id, pending)
    const targetView = createPlayerView(game, target.id, pending)
    expect(
      attackerView.pendingDecision?.choices?.map((choice) => choice.label),
    ).toEqual(target.hand.map((_, index) => `Lá bài ${index + 1}`))
    expect(targetView.pendingDecision?.choices).toBeUndefined()
    expect(JSON.stringify(attackerView.pendingDecision)).not.toContain(
      target.hand[0].instanceId,
    )
  })

  it('does not let a disconnected pending chooser resolve an Episode', () => {
    const { service, room } = startedRoom()
    const game = room.gameState!
    const attacker = game.players[game.currentPlayerIndex]
    const target = game.players.find((player) => player.id !== attacker.id)!
    room.pendingDecision = {
      id: 'decision-disconnected',
      kind: 'anxiety',
      chooserPlayerId: attacker.id,
      command: {
        type: 'playEpisode',
        episodeCardId: 'episode-01',
        targetPlayerId: target.id,
        targetDisorderCardId: target.psyche.slots[0].disorder.instanceId,
      },
      choiceMap: { 'choice-1': target.hand[0].instanceId },
    }
    service.markDisconnected(room.id, attacker.id)

    expect(() =>
      service.resolveDecision(
        room.id,
        attacker.id,
        'decision-disconnected',
        ['choice-1'],
      ),
    ).toThrow('Disconnected')
    expect(room.pendingDecision?.id).toBe('decision-disconnected')
  })
})
