import { describe, expect, it, vi } from 'vitest'
import { hasCardConservation } from '../../src/game/engine/invariants'
import { InMemoryRoomRepository } from '../persistence/inMemoryRoomRepository'
import { deserializeRoom, serializeRoom } from '../persistence/serializer'
import type { PersistedRoomSnapshot, RoomRepository } from '../persistence/types'
import { RoomService } from '../rooms/roomService'

function startedService(repository = new InMemoryRoomRepository()) {
  const service = new RoomService(repository, () => undefined)
  const { room, player: host } = service.createRoom('Ada', 'ada-id')
  service.joinRoom(room.id, 'ben-id', 'Ben')
  service.startRoom(room.id, host.id)
  return { service, repository, room, host }
}

describe('room persistence', () => {
  it('persists create, join, start, and only valid commands', async () => {
    const repository = new InMemoryRoomRepository()
    const service = new RoomService(repository, () => undefined)
    const { room, player: host } = service.createRoom('Ada', 'ada-id')
    await service.flushPersistence(room.id)
    expect(repository.saveCount).toBe(1)

    service.joinRoom(room.id, 'ben-id', 'Ben')
    await service.flushPersistence(room.id)
    expect(repository.saveCount).toBe(2)
    service.startRoom(room.id, host.id)
    await service.flushPersistence(room.id)
    expect(repository.saveCount).toBe(3)

    const game = service.getRoom(room.id)!.gameState!
    const nonCurrentPlayerId = game.players.find(
      (player) => player.id !== game.currentPlayerId,
    )!.id
    expect(() =>
      service.executeCommand(room.id, nonCurrentPlayerId, { type: 'draw' }),
    ).toThrow()
    await service.flushPersistence(room.id)
    expect(repository.saveCount).toBe(3)

    service.executeCommand(room.id, game.currentPlayerId, { type: 'draw' })
    await service.flushPersistence(room.id)
    expect(repository.saveCount).toBe(4)
  })

  it('round-trips and restores active rooms with disconnected players', async () => {
    const repository = new InMemoryRoomRepository()
    const { service, room } = startedService(repository)
    await service.flushPersistence(room.id)
    const beforeRestart = service.getRoom(room.id)!
    const snapshot = serializeRoom(beforeRestart)

    expect(deserializeRoom(snapshot).gameState).toEqual(beforeRestart.gameState)
    const restoredService = new RoomService(repository, () => undefined)
    await restoredService.restoreFromRepository()
    const restored = restoredService.getRoom(room.id)!

    expect(restored.players.every((player) => !player.connected)).toBe(true)
    expect(restored.players.every((player) => !player.socketId)).toBe(true)
    expect(hasCardConservation(restored.gameState!)).toBe(true)

    restoredService.resumeSession(room.id, 'ada-id', 'new-ada-socket')
    restoredService.resumeSession(room.id, 'ben-id', 'new-ben-socket')
    expect(restoredService.getRoom(room.id)!.players[0]).toMatchObject({
      id: 'ada-id',
      connected: true,
      socketId: 'new-ada-socket',
    })
    const restoredGame = restoredService.getRoom(room.id)!.gameState!
    expect(
      restoredService.executeCommand(room.id, restoredGame.currentPlayerId, {
        type: 'draw',
      }).turn.phase,
    ).toBe('play')
  })

  it('preserves pending Anxiety and Tremors decisions across restart', async () => {
    for (const kind of ['anxiety', 'tremors'] as const) {
      const repository = new InMemoryRoomRepository()
      const { service, room } = startedService(repository)
      const current = room.gameState!.players[room.gameState!.currentPlayerIndex]
      const target = room.gameState!.players.find(
        (player) => player.id !== current.id,
      )!
      room.pendingDecision = {
        id: `decision-${kind}`,
        kind,
        chooserPlayerId: kind === 'anxiety' ? current.id : target.id,
        command: {
          type: 'playEpisode',
          episodeCardId: 'episode-01',
          targetPlayerId: target.id,
          targetDisorderCardId: target.psyche.slots[0].disorder.instanceId,
        },
        choiceMap:
          kind === 'anxiety'
            ? { 'choice-1': target.hand[0].instanceId }
            : Object.fromEntries(
                target.hand.slice(0, 3).map((card) => [
                  card.instanceId,
                  card.instanceId,
                ]),
              ),
      }
      // Resume triggers a persistence mutation without exposing socket IDs.
      service.resumeSession(room.id, current.id, 'temporary-socket')
      await service.flushPersistence(room.id)

      const restoredService = new RoomService(repository, () => undefined)
      await restoredService.restoreFromRepository()
      expect(restoredService.getRoom(room.id)?.pendingDecision).toMatchObject({
        id: `decision-${kind}`,
        kind,
      })
    }
  })

  it('serializes saves per room so an older async save cannot overwrite a newer one', async () => {
    class DelayedRepository implements RoomRepository {
      saved: PersistedRoomSnapshot[] = []
      async save(snapshot: PersistedRoomSnapshot): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 5))
        this.saved.push(structuredClone(snapshot))
      }
      async loadActive(): Promise<PersistedRoomSnapshot[]> {
        return []
      }
    }
    const repository = new DelayedRepository()
    const service = new RoomService(repository, () => undefined)
    const { room } = service.createRoom('Ada', 'ada-id')
    service.joinRoom(room.id, 'ben-id', 'Ben')
    await service.flushPersistence(room.id)

    expect(repository.saved).toHaveLength(2)
    expect(repository.saved.at(-1)?.room.players).toHaveLength(2)
  })

  it('keeps the in-memory room live after a failed save and retries later mutations', async () => {
    class FlakyRepository implements RoomRepository {
      attempts = 0
      saved: PersistedRoomSnapshot[] = []

      async save(snapshot: PersistedRoomSnapshot): Promise<void> {
        this.attempts += 1
        if (this.attempts === 1) throw new Error('temporary persistence outage')
        this.saved.push(structuredClone(snapshot))
      }

      async loadActive(): Promise<PersistedRoomSnapshot[]> {
        return []
      }
    }

    const repository = new FlakyRepository()
    const logError = vi.fn()
    const service = new RoomService(repository, logError)
    const { room } = service.createRoom('Ada', 'ada-id')
    await service.flushPersistence(room.id)

    expect(service.getRoom(room.id)?.players).toHaveLength(1)
    expect(logError).toHaveBeenCalledWith(
      'Room persistence failed; the in-memory game remains active.',
    )

    service.joinRoom(room.id, 'ben-id', 'Ben')
    await service.flushPersistence(room.id)

    expect(repository.saved).toHaveLength(1)
    expect(repository.saved[0].room.players).toHaveLength(2)
  })
})
