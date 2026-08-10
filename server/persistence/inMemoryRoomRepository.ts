import { deserializeRoom, serializeRoom } from './serializer'
import type { RoomRepository, PersistedRoomSnapshot } from './types'

/** Development/test persistence with the same serialization boundary as Postgres. */
export class InMemoryRoomRepository implements RoomRepository {
  private readonly snapshots = new Map<string, PersistedRoomSnapshot>()
  saveCount = 0

  async save(snapshot: PersistedRoomSnapshot): Promise<void> {
    this.saveCount += 1
    this.snapshots.set(snapshot.room.id, structuredClone(snapshot))
  }

  async loadActive(): Promise<PersistedRoomSnapshot[]> {
    return [...this.snapshots.values()]
      .filter((snapshot) => snapshot.room.status !== 'finished')
      .map((snapshot) => structuredClone(snapshot))
  }

  seedRoom(room: Parameters<typeof serializeRoom>[0]): void {
    this.snapshots.set(room.id, serializeRoom(room))
  }

  readRoom(id: string) {
    const snapshot = this.snapshots.get(id)
    return snapshot ? deserializeRoom(structuredClone(snapshot)) : undefined
  }
}
